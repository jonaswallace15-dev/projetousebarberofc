const LOREXPAY_URL = (process.env.LOREXPAY_URL || '').replace(/\/$/, '');
const LOREXPAY_API_KEY = process.env.LOREXPAY_API_KEY || '';
// Remove aspas extras que podem aparecer no .env
const LOREXPAY_API_SECRET = (process.env.LOREXPAY_API_SECRET || '').replace(/^["']|["']$/g, '');

export function lorexpayHeaders() {
  return {
    'Content-Type': 'application/json',
    'x-api-key': LOREXPAY_API_KEY,
    'x-api-secret': LOREXPAY_API_SECRET,
  };
}

export async function lorexpayJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`LorexPay resposta inválida (${res.status}): ${text.slice(0, 300)}`);
  }
}

export function isLorexpayConfigured() {
  return !!(LOREXPAY_URL && LOREXPAY_API_KEY && LOREXPAY_API_SECRET);
}

export function lorexpayDebugInfo() {
  return {
    url: LOREXPAY_URL || '(não definido)',
    keyPrefix: LOREXPAY_API_KEY ? `${LOREXPAY_API_KEY.slice(0, 8)}…` : '(não definido)',
    secretLength: LOREXPAY_API_SECRET.length,
    configured: isLorexpayConfigured(),
  };
}

export async function createPixPayment(params: {
  valueCents: number;
  customer: { name: string; email: string; phone?: string; cpf?: string };
  webhookUrl?: string;
  metadata?: Record<string, string>;
}) {
  if (!isLorexpayConfigured()) {
    console.error('[LorexPay] Configuração incompleta:', lorexpayDebugInfo());
    throw new Error('LorexPay não configurado — verifique LOREXPAY_URL, LOREXPAY_API_KEY e LOREXPAY_API_SECRET');
  }

  const endpoint = `${LOREXPAY_URL}/api/v1/external/pix`;
  const body: Record<string, unknown> = {
    valueCents: params.valueCents,
    customer: {
      name: params.customer.name,
      email: params.customer.email,
      ...(params.customer.phone ? { phone: params.customer.phone } : {}),
      ...(params.customer.cpf ? { cpf: params.customer.cpf } : {}),
    },
  };
  if (params.webhookUrl) body.webhookUrl = params.webhookUrl;
  if (params.metadata) body.metadata = params.metadata;

  console.log('[LorexPay] POST', endpoint, '| valueCents:', params.valueCents, '| config:', lorexpayDebugInfo());

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: lorexpayHeaders(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
  } catch (fetchErr: any) {
    // "fetch failed" com causa de rede — loga a causa real
    console.error('[LorexPay] Erro de rede ao chamar', endpoint);
    console.error('[LorexPay] Mensagem:', fetchErr.message);
    console.error('[LorexPay] Causa:', fetchErr.cause);
    throw new Error(`Erro de conexão com LorexPay (${fetchErr.message}). Causa: ${fetchErr.cause?.message || fetchErr.cause || 'desconhecida'}. URL usada: ${endpoint}`);
  }

  const data = await lorexpayJson(res);
  console.log('[LorexPay] Resposta status:', res.status, '| body:', JSON.stringify(data).slice(0, 300));

  if (!res.ok) {
    throw new Error(data?.error || data?.message || `LorexPay erro HTTP ${res.status}: ${JSON.stringify(data).slice(0, 200)}`);
  }
  return data as {
    orderId: string;
    status: string;
    valueCents: number;
    pix: { txid: string; brCode: string; qrCodeImage: string; expiresAt: string };
    customer: { id: string; name: string; email: string };
  };
}
