import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const ASAAS_URL = process.env.ASAAS_URL || 'https://api.asaas.com/v3';
const ASAAS_KEY = process.env.ASAAS_API_KEY
  ? (process.env.ASAAS_API_KEY.startsWith('$') ? process.env.ASAAS_API_KEY : `$${process.env.ASAAS_API_KEY}`)
  : '';

function asaasHeaders() {
  return { 'Content-Type': 'application/json', 'access_token': ASAAS_KEY };
}

async function asaasJson(res: Response) {
  const text = await res.text();
  try { return JSON.parse(text); } catch { throw new Error(`Asaas error (${res.status}): ${text.slice(0, 200)}`); }
}

function nextDueDate(billingDay: number = 10) {
  const today = new Date();
  const day = Math.min(28, Math.max(1, billingDay));
  const candidate = new Date(today.getFullYear(), today.getMonth(), day);
  // Se o dia já passou esse mês, usa o próximo mês
  if (candidate <= today) candidate.setMonth(candidate.getMonth() + 1);
  return candidate.toISOString().split('T')[0];
}

async function findOrCreateAsaasCustomer(name: string, cpfCnpj: string, email: string, phone: string): Promise<string> {
  const digits = cpfCnpj.replace(/\D/g, '');
  const search = await fetch(`${ASAAS_URL}/customers?cpfCnpj=${digits}`, { headers: asaasHeaders() });
  const found = await asaasJson(search);
  if (found.data?.length > 0) {
    const existing = found.data[0];
    // Atualiza os dados do cliente com as informações mais recentes
    await fetch(`${ASAAS_URL}/customers/${existing.id}`, {
      method: 'PUT',
      headers: asaasHeaders(),
      body: JSON.stringify({ name, email: email || undefined, phone: phone || undefined }),
    });
    return existing.id;
  }
  const create = await fetch(`${ASAAS_URL}/customers`, {
    method: 'POST',
    headers: asaasHeaders(),
    body: JSON.stringify({ name, cpfCnpj: digits, email: email || undefined, phone: phone || undefined }),
  });
  const created = await asaasJson(create);
  if (!create.ok || created.errors?.length) throw new Error(created.errors?.[0]?.description || 'Erro ao criar cliente');
  return created.id;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // ── Asaas Subscription Checkout ────────────────────────────────────
    if (action === 'create-asaas-checkout') {
      const { planId, clientName, clientEmail, clientPhone, clientCpf, billingDay } = body;
      const cpfDigits = (clientCpf || '').replace(/\D/g, '');

      if (!clientCpf || clientCpf.replace(/\D/g, '').length !== 11) {
        return NextResponse.json({ error: 'CPF inválido' }, { status: 400 });
      }

      const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
      if (!plan) return NextResponse.json({ error: 'Plano não encontrado' }, { status: 404 });

      const customerId = await findOrCreateAsaasCustomer(
        clientName,
        clientCpf,
        clientEmail || `${clientPhone}@semmail.com`,
        clientPhone || '',
      );

      // Verifica se já existe assinatura ativa para este cliente neste plano
      const existingSubsRes = await fetch(`${ASAAS_URL}/subscriptions?customer=${customerId}&status=ACTIVE`, { headers: asaasHeaders() });
      const existingSubsData = await asaasJson(existingSubsRes);
      const existingSub = existingSubsData.data?.find((s: any) => s.externalReference?.startsWith(`SUB|${plan.id}|`));
      if (existingSub) {
        const existingPaymentsRes = await fetch(`${ASAAS_URL}/payments?subscription=${existingSub.id}`, { headers: asaasHeaders() });
        const existingPaymentsData = await asaasJson(existingPaymentsRes);
        const existingPayment = existingPaymentsData.data?.[0];
        const existingUrl = existingPayment?.invoiceUrl || existingSub.paymentLink;
        if (existingUrl) return NextResponse.json({ url: existingUrl });
      }

      const subRes = await fetch(`${ASAAS_URL}/subscriptions`, {
        method: 'POST',
        headers: asaasHeaders(),
        body: JSON.stringify({
          customer: customerId,
          billingType: 'CREDIT_CARD',
          value: plan.price,
          nextDueDate: nextDueDate(billingDay ?? plan.billingDay ?? 10),
          cycle: 'MONTHLY',
          description: plan.name,
          externalReference: `SUB|${plan.id}|${plan.userId}|${(clientPhone || '').replace(/\D/g, '')}|${cpfDigits}`,
        }),
      });
      const sub = await asaasJson(subRes);

      if (!subRes.ok || sub.errors?.length) {
        const msg = sub.errors?.[0]?.description || 'Erro ao criar assinatura';
        return NextResponse.json({ error: msg }, { status: 400 });
      }

      // Imediatamente upsert do cliente com CPF para que check-subscription funcione
      // sem depender do webhook do Asaas ser processado primeiro
      if (cpfDigits && clientPhone) {
        const phoneDigits = (clientPhone || '').replace(/\D/g, '');
        try {
          const existingByPhone = await prisma.client.findFirst({ where: { userId: plan.userId, phone: phoneDigits } });
          if (existingByPhone) {
            if (!existingByPhone.cpfCnpj) {
              await prisma.client.update({ where: { id: existingByPhone.id }, data: { cpfCnpj: cpfDigits } });
            }
          } else {
            const existingByCpf = await prisma.client.findFirst({ where: { userId: plan.userId, cpfCnpj: { contains: cpfDigits } } });
            if (!existingByCpf) {
              await prisma.client.create({
                data: {
                  userId: plan.userId,
                  name: clientName || '',
                  phone: phoneDigits,
                  email: clientEmail || null,
                  cpfCnpj: cpfDigits,
                  tag: 'Novo',
                  lastVisit: new Date().toISOString().slice(0, 10),
                  totalSpent: 0,
                  frequency: 0,
                },
              });
            }
          }
        } catch (e) { console.error('[checkout-client-upsert]', e); }
      }

      // Busca a primeira cobrança gerada automaticamente pela assinatura
      const paymentsRes = await fetch(`${ASAAS_URL}/payments?subscription=${sub.id}`, {
        headers: asaasHeaders(),
      });
      const paymentsData = await asaasJson(paymentsRes);
      const firstPayment = paymentsData.data?.[0];
      const paymentUrl = firstPayment?.invoiceUrl || sub.paymentLink;

      if (!paymentUrl) {
        return NextResponse.json({ error: 'Não foi possível gerar o link de pagamento. Tente novamente.' }, { status: 500 });
      }

      return NextResponse.json({ url: paymentUrl });
    }

    // ── Cancelar Assinatura ────────────────────────────────────────────
    if (action === 'cancel-subscription') {
      const { asaasSubscriptionId, clientSubscriptionId } = body;

      if (asaasSubscriptionId) {
        await fetch(`${ASAAS_URL}/subscriptions/${asaasSubscriptionId}`, {
          method: 'DELETE',
          headers: asaasHeaders(),
        });
      }

      if (clientSubscriptionId) {
        const sub = await prisma.clientSubscription.findUnique({
          where: { id: clientSubscriptionId },
          select: { planId: true },
        });
        await prisma.clientSubscription.delete({ where: { id: clientSubscriptionId } });
        if (sub?.planId) {
          await prisma.subscriptionPlan.update({
            where: { id: sub.planId },
            data: { activeUsers: { decrement: 1 } },
          });
        }
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    console.error('[checkout]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
