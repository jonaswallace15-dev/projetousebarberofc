import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createPixPayment } from '@/lib/lorexpay';

function appBaseUrl() {
  return (process.env.LOREXPAY_WEBHOOK_BASE_URL || process.env.NEXTAUTH_URL || '').replace(/\/$/, '');
}

// ── Código Asaas mantido para uso futuro ──────────────────────────────────────
// const ASAAS_URL = process.env.ASAAS_URL || 'https://api.asaas.com/v3';
// const ASAAS_KEY = process.env.ASAAS_API_KEY
//   ? (process.env.ASAAS_API_KEY.startsWith('$') ? process.env.ASAAS_API_KEY : `$${process.env.ASAAS_API_KEY}`)
//   : '';
//
// function asaasHeaders() {
//   return { 'Content-Type': 'application/json', 'access_token': ASAAS_KEY };
// }
//
// async function asaasJson(res: Response) {
//   const text = await res.text();
//   try { return JSON.parse(text); } catch { throw new Error(`Asaas error (${res.status}): ${text.slice(0, 200)}`); }
// }
//
// function nextDueDate(billingDay: number = 10) {
//   const today = new Date();
//   const day = Math.min(28, Math.max(1, billingDay));
//   const candidate = new Date(today.getFullYear(), today.getMonth(), day);
//   if (candidate <= today) candidate.setMonth(candidate.getMonth() + 1);
//   return candidate.toISOString().split('T')[0];
// }
//
// async function findOrCreateAsaasCustomer(name, cpfCnpj, email, phone) { ... }
// async function createAsaasSubscription(planId, customerId, billingDay) { ... }
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // ── Checkout Cartão de Crédito via Asaas (recorrência mensal) ────────
    if (action === 'create-asaas-checkout') {
      const { planId, clientName, clientEmail, clientPhone, clientCpf, billingDay } = body;
      const cpfDigits = (clientCpf || '').replace(/\D/g, '');
      const phoneDigits = (clientPhone || '').replace(/\D/g, '');

      const ASAAS_BASE = (process.env.ASAAS_URL || 'https://api.asaas.com/v3').replace(/\/$/, '');
      const rawKey = process.env.ASAAS_API_KEY || '';
      const ASAAS_KEY = rawKey.startsWith('$') ? rawKey : `$${rawKey}`;
      const asaasHdr = { 'Content-Type': 'application/json', 'access_token': ASAAS_KEY };

      const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
      if (!plan) return NextResponse.json({ error: 'Plano não encontrado' }, { status: 404 });

      // Busca ou cria cliente no Asaas
      let customerId: string;
      const searchRes = await fetch(`${ASAAS_BASE}/customers?cpfCnpj=${cpfDigits}&limit=1`, { headers: asaasHdr });
      const searchData = await searchRes.json();
      if (searchData.data?.length > 0) {
        customerId = searchData.data[0].id;
        // Atualiza os dados do cliente existente com as infos do formulário
        await fetch(`${ASAAS_BASE}/customers/${customerId}`, {
          method: 'PUT', headers: asaasHdr,
          body: JSON.stringify({
            name: clientName || searchData.data[0].name,
            email: clientEmail || searchData.data[0].email || undefined,
            phone: phoneDigits || searchData.data[0].phone || undefined,
          }),
        });
      } else {
        const cRes = await fetch(`${ASAAS_BASE}/customers`, {
          method: 'POST', headers: asaasHdr,
          body: JSON.stringify({ name: clientName || 'Cliente', cpfCnpj: cpfDigits || undefined, email: clientEmail || undefined, phone: phoneDigits || undefined, notificationDisabled: true }),
        });
        const cData = await cRes.json();
        if (cData.errors) throw new Error(cData.errors[0]?.description || 'Erro ao criar cliente');
        customerId = cData.id;
      }

      // Calcula próximo vencimento
      const day = Math.min(28, Math.max(1, Number(billingDay) || 10));
      const today = new Date();
      const due = new Date(today.getFullYear(), today.getMonth(), day);
      if (due <= today) due.setMonth(due.getMonth() + 1);
      const nextDueDate = due.toISOString().split('T')[0];

      // Cria assinatura com cartão
      const sRes = await fetch(`${ASAAS_BASE}/subscriptions`, {
        method: 'POST', headers: asaasHdr,
        body: JSON.stringify({ customer: customerId, billingType: 'CREDIT_CARD', cycle: 'MONTHLY', nextDueDate, value: plan.price, description: plan.name }),
      });
      const sData = await sRes.json();
      if (sData.errors) throw new Error(sData.errors[0]?.description || 'Erro ao criar assinatura');

      // Busca URL do checkout da primeira fatura
      let invoiceUrl: string | null = sData.invoiceUrl || null;
      if (!invoiceUrl) {
        const pRes = await fetch(`${ASAAS_BASE}/subscriptions/${sData.id}/payments`, { headers: asaasHdr });
        const pData = await pRes.json();
        invoiceUrl = pData.data?.[0]?.invoiceUrl || null;
      }

      // Salva no banco local
      try {
        let localClient = cpfDigits
          ? await prisma.client.findFirst({ where: { userId: plan.userId, cpfCnpj: { contains: cpfDigits } } })
          : null;
        if (!localClient && phoneDigits)
          localClient = await prisma.client.findFirst({ where: { userId: plan.userId, phone: phoneDigits } });
        if (!localClient)
          localClient = await prisma.client.create({ data: { userId: plan.userId, name: clientName || '', phone: phoneDigits || '', email: clientEmail || null, cpfCnpj: cpfDigits || null, tag: 'Novo', lastVisit: today.toISOString().slice(0, 10), totalSpent: 0, frequency: 0 } });

        const existingSub = await prisma.clientSubscription.findFirst({ where: { userId: plan.userId, clientId: localClient.id, planId: plan.id } });
        if (existingSub) {
          await prisma.clientSubscription.update({ where: { id: existingSub.id }, data: { status: 'pending_payment', data: { ...(existingSub.data as object), asaasSubscriptionId: sData.id } } });
        } else {
          await prisma.clientSubscription.create({ data: { userId: plan.userId, clientId: localClient.id, planId: plan.id, status: 'pending_payment', data: { asaasSubscriptionId: sData.id } } });
        }
      } catch (e) { console.error('[asaas-checkout-upsert]', e); }

      return NextResponse.json({ url: invoiceUrl });
    }

    // ── Checkout PIX via LorexPay ─────────────────────────────────────────
    if (action === 'create-lorexpay-checkout') {
      const { planId, clientName, clientEmail, clientPhone, clientCpf } = body;
      const cpfDigits = (clientCpf || '').replace(/\D/g, '');

      if (!clientCpf || cpfDigits.length !== 11) {
        return NextResponse.json({ error: 'CPF inválido' }, { status: 400 });
      }

      const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
      if (!plan) return NextResponse.json({ error: 'Plano não encontrado' }, { status: 404 });

      const phoneDigits = (clientPhone || '').replace(/\D/g, '');
      const email = clientEmail || `${phoneDigits || cpfDigits}@semmail.com`;

      const webhookUrl = `${appBaseUrl()}/api/payments/lorexpay/webhook?ref=SUB|${plan.id}|${plan.userId}|${phoneDigits}|${cpfDigits}`;

      const pix = await createPixPayment({
        valueCents: Math.round(plan.price * 100),
        customer: {
          name: clientName,
          email,
          phone: phoneDigits || undefined,
          cpf: cpfDigits || undefined,
        },
        webhookUrl,
        metadata: { referenceId: `SUB|${plan.id}|${plan.userId}` },
      });

      // Cria/atualiza cliente local e ClientSubscription pending_payment
      let localClientId: string | null = null;
      let clientSubscriptionId: string | null = null;
      try {
        let client = phoneDigits
          ? await prisma.client.findFirst({ where: { userId: plan.userId, phone: phoneDigits } })
          : await prisma.client.findFirst({ where: { userId: plan.userId, cpfCnpj: { contains: cpfDigits } } });

        if (client) {
          const updateData: any = {};
          if (!client.cpfCnpj && cpfDigits) updateData.cpfCnpj = cpfDigits;
          if (clientName && client.name !== clientName) updateData.name = clientName;
          if (clientEmail && !client.email) updateData.email = clientEmail;
          if (Object.keys(updateData).length > 0) {
            await prisma.client.update({ where: { id: client.id }, data: updateData });
          }
          localClientId = client.id;
        } else {
          const created = await prisma.client.create({
            data: {
              userId: plan.userId,
              name: clientName || '',
              phone: phoneDigits || '',
              email: clientEmail || null,
              cpfCnpj: cpfDigits || null,
              tag: 'Novo',
              lastVisit: new Date().toISOString().slice(0, 10),
              totalSpent: 0,
              frequency: 0,
            },
          });
          localClientId = created.id;
        }

        if (localClientId) {
          let sub = await prisma.clientSubscription.findFirst({
            where: { userId: plan.userId, clientId: localClientId, planId: plan.id },
          });
          if (sub) {
            sub = await prisma.clientSubscription.update({
              where: { id: sub.id },
              data: {
                status: 'pending_payment',
                data: { ...(sub.data as object), lorexpayOrderId: pix.orderId },
              },
            });
          } else {
            sub = await prisma.clientSubscription.create({
              data: {
                userId: plan.userId,
                clientId: localClientId,
                planId: plan.id,
                status: 'pending_payment',
                data: {
                  lorexpayOrderId: pix.orderId,
                  cpfCnpj: cpfDigits || null,
                  subscribedAt: new Date().toISOString(),
                },
              },
            });
          }
          clientSubscriptionId = sub.id;
        }
      } catch (e) { console.error('[lorexpay-checkout-upsert]', e); }

      return NextResponse.json({
        lorexpayOrderId: pix.orderId,
        brCode: pix.pix?.brCode || null,
        qrCodeImage: pix.pix?.qrCodeImage || null,
        expiresAt: pix.pix?.expiresAt || null,
        clientSubscriptionId,
      });
    }

    // ── Cancelar Assinatura ────────────────────────────────────────────────
    // Asaas cancel mantido pois ainda armazena asaasSubscriptionId nos dados existentes
    if (action === 'cancel-subscription') {
      const { asaasSubscriptionId, clientSubscriptionId } = body;

      if (asaasSubscriptionId) {
        const ASAAS_URL = process.env.ASAAS_URL || 'https://api.asaas.com/v3';
        const ASAAS_KEY = process.env.ASAAS_API_KEY
          ? (process.env.ASAAS_API_KEY.startsWith('$') ? process.env.ASAAS_API_KEY : `$${process.env.ASAAS_API_KEY}`)
          : '';
        await fetch(`${ASAAS_URL}/subscriptions/${asaasSubscriptionId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', access_token: ASAAS_KEY },
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
