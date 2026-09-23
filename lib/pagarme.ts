// Cliente Pagar.me (Stone) — API v5 (https://api.pagar.me/core/v5)
// Substitui o LorexPay (PIX) e o Asaas (assinatura por cartão) nas cobranças.
// Autenticação: HTTP Basic com a secret key como usuário e senha vazia.

import crypto from 'crypto';

const PAGARME_URL = 'https://api.pagar.me/core/v5';
const PAGARME_SECRET_KEY = (process.env.PAGARME_SECRET_KEY || '').replace(/^["']|["']$/g, '');
const PAGARME_PLATFORM_FEE_PERCENT = Number(process.env.PAGARME_PLATFORM_FEE_PERCENT || '0');
const PAGARME_PLATFORM_RECIPIENT_ID = process.env.PAGARME_PLATFORM_RECIPIENT_ID || '';

export function isPagarmeConfigured() {
  return !!PAGARME_SECRET_KEY;
}

export function pagarmeDebugInfo() {
  return {
    url: PAGARME_URL,
    keyPrefix: PAGARME_SECRET_KEY ? `${PAGARME_SECRET_KEY.slice(0, 8)}…` : '(não definido)',
    configured: isPagarmeConfigured(),
  };
}

function pagarmeHeaders() {
  const token = Buffer.from(`${PAGARME_SECRET_KEY}:`).toString('base64');
  return {
    'Content-Type': 'application/json',
    Authorization: `Basic ${token}`,
  };
}

async function pagarmeJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Pagar.me resposta inválida (${res.status}): ${text.slice(0, 300)}`);
  }
}

async function pagarmeRequest(path: string, method: 'GET' | 'POST' | 'DELETE', body?: unknown) {
  if (!isPagarmeConfigured()) {
    console.error('[Pagar.me] Configuração incompleta:', pagarmeDebugInfo());
    throw new Error('Pagar.me não configurado — verifique PAGARME_SECRET_KEY');
  }

  const endpoint = `${PAGARME_URL}${path}`;
  let res: Response;
  try {
    res = await fetch(endpoint, {
      method,
      headers: pagarmeHeaders(),
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15000),
    });
  } catch (fetchErr: any) {
    console.error('[Pagar.me] Erro de rede ao chamar', endpoint);
    console.error('[Pagar.me] Mensagem:', fetchErr.message);
    throw new Error(`Erro de conexão com Pagar.me (${fetchErr.message}). URL usada: ${endpoint}`);
  }

  const data = await pagarmeJson(res);
  console.log('[Pagar.me]', method, path, '| status:', res.status, '| body:', JSON.stringify(data).slice(0, 300));

  if (!res.ok) {
    let msg = data?.message || `Pagar.me erro HTTP ${res.status}: ${JSON.stringify(data).slice(0, 200)}`;
    // A Pagar.me devolve os erros de validação em dois formatos possíveis:
    // array (`errors: [{ message }]`, estilo antigo) ou objeto por campo
    // (`errors: { "campo.subcampo": ["mensagem"] }`, o que a v5 realmente usa).
    if (Array.isArray(data?.errors)) {
      msg = data.errors[0]?.message || data.errors[0]?.description || msg;
    } else if (data?.errors && typeof data.errors === 'object') {
      const details = Object.entries(data.errors)
        .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
        .join(' | ');
      if (details) msg = `${msg} — ${details}`;
    }
    throw new Error(msg);
  }
  return data;
}

export interface PagarmeCustomerInput {
  name: string;
  email: string;
  phone?: string;
  cpf?: string;
}

function buildCustomer(customer: PagarmeCustomerInput) {
  const phoneDigits = (customer.phone || '').replace(/\D/g, '');
  return {
    name: customer.name,
    email: customer.email,
    ...(customer.cpf ? { document: customer.cpf, document_type: 'CPF', type: 'individual' } : {}),
    ...(phoneDigits
      ? {
          phones: {
            mobile_phone: {
              country_code: '55',
              area_code: phoneDigits.slice(0, 2) || '11',
              number: phoneDigits.slice(2) || phoneDigits,
            },
          },
        }
      : {}),
  };
}

/**
 * Monta o array de split de um pedido/assinatura. Retorna `undefined` quando não há
 * recipient da barbearia (cai no saldo pooled da conta principal, igual ao comportamento
 * anterior ao cadastro do recipient — ver Fase 3 da migração).
 */
export function buildSplit(ownerRecipientId?: string | null) {
  if (!ownerRecipientId) return undefined;
  const feePercent = Number.isFinite(PAGARME_PLATFORM_FEE_PERCENT) ? PAGARME_PLATFORM_FEE_PERCENT : 0;
  const ownerPercent = 100 - feePercent;

  const split: Array<Record<string, unknown>> = [
    {
      recipient_id: ownerRecipientId,
      type: 'percentage',
      amount: ownerPercent,
      options: { charge_processing_fee: true, charge_remainder_fee: true, liable: true },
    },
  ];

  if (feePercent > 0 && PAGARME_PLATFORM_RECIPIENT_ID) {
    split.push({
      recipient_id: PAGARME_PLATFORM_RECIPIENT_ID,
      type: 'percentage',
      amount: feePercent,
      options: { charge_processing_fee: false, charge_remainder_fee: false, liable: false },
    });
  }

  return split;
}

export interface PixOrderResult {
  orderId: string;
  chargeId: string | null;
  status: string;
  pix: { qrCode: string | null; qrCodeUrl: string | null; expiresAt: string | null };
}

export async function createPixOrder(params: {
  valueCents: number;
  description: string;
  customer: PagarmeCustomerInput;
  metadata?: Record<string, string>;
  expiresInSeconds?: number;
  splitRecipientId?: string | null;
}): Promise<PixOrderResult> {
  const body: Record<string, unknown> = {
    items: [{ amount: params.valueCents, description: params.description, quantity: 1 }],
    customer: buildCustomer(params.customer),
    payments: [
      {
        payment_method: 'pix',
        pix: { expires_in: params.expiresInSeconds || 3600 },
      },
    ],
    ...(params.metadata ? { metadata: params.metadata } : {}),
  };

  const split = buildSplit(params.splitRecipientId);
  if (split) (body.payments as any[])[0].split = split;

  const order = await pagarmeRequest('/orders', 'POST', body);
  const charge = order.charges?.[0];
  const lastTx = charge?.last_transaction;

  return {
    orderId: order.id,
    chargeId: charge?.id || null,
    status: order.status,
    pix: {
      qrCode: lastTx?.qr_code || null,
      qrCodeUrl: lastTx?.qr_code_url || null,
      expiresAt: lastTx?.expires_at || null,
    },
  };
}

export interface CardSubscriptionResult {
  subscriptionId: string;
  status: string;
}

export interface RawCardInput {
  number: string;
  holderName: string;
  expMonth: string;
  expYear: string;
  cvv: string;
}

/**
 * Cria uma assinatura recorrente cobrada por cartão.
 *
 * IMPORTANTE — fallback temporário: o fluxo ideal é tokenizar o cartão no browser
 * (lib/pagarmeClient.ts) e mandar só o token pra cá. Numa conta de teste nova
 * confirmamos (testes manuais fora do app, 10/2026) que tokens criados via chave
 * pública (`/tokens?appId=`) não são reconhecidos por nenhum endpoint autenticado
 * com a secret key ("Token not found" em /orders, /subscriptions e
 * /customers/{id}/cards) — parece bug/config do lado da Stone nessa conta. Cartão
 * cru (`card`) direto no /orders funciona normalmente. Por isso aceitamos aqui
 * tanto `cardToken` quanto `card` (dados crus) — usar `card` só é aceitável porque
 * os dados vêm de um formulário nosso e são repassados na hora, sem ficar
 * armazenados. Assim que a Stone confirmar/corrigir o problema do token, voltar a
 * usar só `cardToken` (client-side) e remover a opção `card` daqui.
 *
 * Confirmado em sandbox (10-15/09/2026): POST /subscriptions funciona com
 * `billing_type: 'prepaid'` (cobra no dia da assinatura, renova na mesma data
 * todo mês) e com `billing_type: 'exact_day'` + `billing_day` (1–28) quando o
 * cliente escolhe um dia fixo de vencimento.
 */
export async function createCardSubscription(params: {
  planPriceCents: number;
  planName: string;
  cardToken?: string;
  card?: RawCardInput;
  customer: PagarmeCustomerInput;
  metadata?: Record<string, string>;
  intervalCount?: number;
  billingDay?: number;
  splitRecipientId?: string | null;
}): Promise<CardSubscriptionResult> {
  if (!params.cardToken && !params.card) {
    throw new Error('Informe cardToken ou card');
  }

  const cardField = params.cardToken
    ? { card_token: params.cardToken }
    : {
        card: {
          number: params.card!.number,
          holder_name: params.card!.holderName,
          exp_month: params.card!.expMonth,
          exp_year: params.card!.expYear,
          cvv: params.card!.cvv,
        },
      };

  const billingDay = params.billingDay ? Math.min(28, Math.max(1, Math.round(params.billingDay))) : null;

  const body: Record<string, unknown> = {
    payment_method: 'credit_card',
    ...cardField,
    customer: buildCustomer(params.customer),
    interval: 'month',
    interval_count: params.intervalCount || 1,
    ...(billingDay ? { billing_type: 'exact_day', billing_day: billingDay } : { billing_type: 'prepaid' }),
    items: [
      {
        description: params.planName,
        quantity: 1,
        pricing_scheme: { price: params.planPriceCents, scheme_type: 'unit' },
      },
    ],
    ...(params.metadata ? { metadata: params.metadata } : {}),
  };

  const split = buildSplit(params.splitRecipientId);
  if (split) body.split = split;

  const sub = await pagarmeRequest('/subscriptions', 'POST', body);
  return { subscriptionId: sub.id, status: sub.status };
}

export async function cancelSubscription(pagarmeSubscriptionId: string) {
  return pagarmeRequest(`/subscriptions/${pagarmeSubscriptionId}`, 'DELETE');
}

export interface RecipientInput {
  code: string;
  holderType: 'individual' | 'company';
  document: string; // CPF (individual) ou CNPJ (company)
  legalName: string;
  email: string;
  phoneDdd: string;
  phoneNumber: string;
  birthdate?: string; // obrigatório se individual — YYYY-MM-DD
  motherName?: string; // obrigatório se individual
  monthlyIncome?: number; // em centavos — obrigatório se individual
  professionalOccupation?: string;
  address: {
    street: string;
    streetNumber: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
    complementary?: string;
    referencePoint?: string;
  };
  bankAccount: {
    bank: string;
    branchNumber: string;
    accountNumber: string;
    accountCheckDigit: string;
    accountType: 'checking' | 'savings';
  };
}

/**
 * Cria um Recipient (recebedor) no Pagar.me — 1 por barbearia, usado pra rotear o
 * split das cobranças e depois sacar via Transfers API. Exige a conta ter aceitado
 * o contrato de Marketplace com a Stone (ver comentário no model PagarmeRecipient
 * do schema.prisma) — sem isso a API responde 412 "Company data not found".
 */
export async function createRecipient(input: RecipientInput) {
  const registerInformation: Record<string, unknown> = {
    type: input.holderType,
    email: input.email,
    document: input.document,
    name: input.legalName,
    phone_numbers: [{ ddd: input.phoneDdd, number: input.phoneNumber, type: 'mobile' }],
    address: {
      street: input.address.street,
      street_number: input.address.streetNumber,
      neighborhood: input.address.neighborhood,
      city: input.address.city,
      state: input.address.state,
      zip_code: input.address.zipCode.replace(/\D/g, ''),
      complementary: input.address.complementary || 'Não informado',
      reference_point: input.address.referencePoint || 'Não informado',
    },
  };

  if (input.holderType === 'individual') {
    Object.assign(registerInformation, {
      birthdate: input.birthdate,
      mother_name: input.motherName,
      monthly_income: input.monthlyIncome,
      professional_occupation: input.professionalOccupation || 'Não informado',
    });
  } else {
    Object.assign(registerInformation, {
      company_name: input.legalName,
      trading_name: input.legalName,
      annual_revenue: (input.monthlyIncome || 0) * 12,
    });
  }

  const payload = {
    code: input.code,
    register_information: registerInformation,
    default_bank_account: {
      holder_name: input.legalName,
      holder_type: input.holderType,
      holder_document: input.document,
      bank: input.bankAccount.bank,
      branch_number: input.bankAccount.branchNumber,
      account_number: input.bankAccount.accountNumber,
      account_check_digit: input.bankAccount.accountCheckDigit,
      type: input.bankAccount.accountType,
    },
    transfer_settings: { transfer_enabled: true, transfer_interval: 'daily', transfer_day: 0 },
  };

  return pagarmeRequest('/recipients', 'POST', payload);
}

export async function getRecipient(recipientId: string) {
  return pagarmeRequest(`/recipients/${recipientId}`, 'GET');
}

export async function getRecipientBalance(recipientId: string) {
  return pagarmeRequest(`/recipients/${recipientId}/balance`, 'GET');
}

export async function createTransfer(params: { recipientId: string; amountCents: number }) {
  return pagarmeRequest('/transfers', 'POST', { recipient_id: params.recipientId, amount: params.amountCents });
}

/**
 * Verificação best-effort da assinatura do webhook.
 * TODO(pagarme-sandbox): confirmar o nome exato do header de assinatura configurado
 * no dashboard do Pagar.me ao cadastrar o endpoint de webhook. Sem PAGARME_WEBHOOK_SECRET
 * configurado, não valida nada (mesmo comportamento do webhook LorexPay hoje).
 */
export function verifyPagarmeWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.PAGARME_WEBHOOK_SECRET;
  if (!secret) return true;
  if (!signatureHeader) return false;

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader.replace(/^sha256=/, '')));
  } catch {
    return false;
  }
}
