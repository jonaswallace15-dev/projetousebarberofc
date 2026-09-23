import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { creditWallet } from '@/lib/creditWallet';
import { verifyPagarmeWebhookSignature } from '@/lib/pagarme';

// Pagar.me envia: { id, type: "order.paid" | "subscription.updated" | "charge.paid" | ..., data: {...} }
// Referência de agendamento/assinatura vai em data.metadata.referenceId:
//   APPT|appointmentId                         → pagamento PIX de agendamento
//   SUB|planId|userId|clientPhone|clientCpf    → pagamento PIX de assinatura (cobrança única)
// Assinaturas recorrentes por cartão são localizadas por data.id (pagarmeSubscriptionId)
// salvo em ClientSubscription.data ao criar (ver app/api/payments/checkout/route.ts).
//
// TODO(pagarme-sandbox): confirmar contra uma conta de teste real o nome exato do header
// de assinatura do webhook e se `metadata` realmente é propagado de order → charge nos
// eventos de assinatura por cartão (charge.paid).

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-hub-signature') || request.headers.get('x-pagarme-signature');
  if (!verifyPagarmeWebhookSignature(rawBody, signature)) {
    console.error('[pagarme-webhook] assinatura inválida');
    return NextResponse.json({ received: false }, { status: 401 });
  }

  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ received: true });
  }

  try {
    const type: string = body.type || '';
    const resource = body.data || body;

    if (type === 'order.paid') {
      await handleOrderPaid(resource);
    } else if (type === 'subscription.updated' || type === 'subscription.created') {
      await handleSubscriptionStatus(resource);
    } else if (type === 'subscription.canceled') {
      await handleSubscriptionCanceled(resource);
    } else if (type === 'charge.paid') {
      await handleChargePaid(resource);
    } else if (type === 'recipient.updated') {
      await handleRecipientUpdated(resource);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('[pagarme-webhook]', err.message);
    return NextResponse.json({ received: true, error: err.message });
  }
}

async function handleOrderPaid(order: any) {
  const ref: string = order?.metadata?.referenceId || '';
  if (!ref) return;

  // ── Pagamento de assinatura via PIX (cobrança única) ──────────────────────
  if (ref.startsWith('SUB|')) {
    const [, planId, userId, clientPhone, clientCpf] = ref.split('|');
    if (!planId || !userId) return;

    const orderId: string = order.id;
    const alreadyExists = await prisma.clientSubscription.findFirst({
      where: { data: { path: ['pagarmeOrderId'], equals: orderId } },
    });
    if (alreadyExists) return;

    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan) return;

    let client = clientPhone
      ? await prisma.client.findFirst({ where: { userId, phone: clientPhone } })
      : null;
    if (!client && clientCpf) {
      client = await prisma.client.findFirst({ where: { userId, cpfCnpj: { contains: clientCpf } } });
    }
    if (!client) {
      client = await prisma.client.create({
        data: {
          userId,
          name: order.customer?.name || 'Cliente',
          phone: clientPhone || '',
          email: order.customer?.email || null,
          cpfCnpj: clientCpf || null,
          tag: 'Novo',
          lastVisit: new Date().toISOString().slice(0, 10),
          totalSpent: 0,
          frequency: 0,
        },
      });
    } else if (clientCpf && !client.cpfCnpj) {
      await prisma.client.update({ where: { id: client.id }, data: { cpfCnpj: clientCpf } });
    }

    const pendingSub = await prisma.clientSubscription.findFirst({
      where: { userId, clientId: client.id, planId, status: 'pending_payment' },
    });
    if (pendingSub) {
      await prisma.clientSubscription.update({
        where: { id: pendingSub.id },
        data: {
          status: 'active',
          data: { ...(pendingSub.data as object), pagarmeOrderId: orderId, cpfCnpj: clientCpf || null, confirmedAt: new Date().toISOString() },
        },
      });
    } else {
      await prisma.clientSubscription.create({
        data: {
          userId,
          clientId: client.id,
          planId,
          status: 'active',
          data: { subscribedAt: new Date().toISOString(), pagarmeOrderId: orderId, cpfCnpj: clientCpf || null },
        },
      });
    }

    await prisma.subscriptionPlan.update({ where: { id: planId }, data: { activeUsers: { increment: 1 } } });

    const amount = (order.amount ? order.amount / 100 : plan.price);
    if (amount > 0) {
      const wallet = await prisma.wallet.findFirst({ where: { userId, type: 'subscription' } })
        ?? await prisma.wallet.create({ data: { userId, type: 'subscription', balance: 0 } });
      await prisma.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: amount } } });
      await prisma.walletTransaction.create({
        data: { userId, walletId: wallet.id, amount, type: 'credit', method: 'pix', description: `Assinatura — ${plan.name} (${client.name})`, category: 'assinatura', relatedId: orderId },
      });
    }
    return;
  }

  // ── Pagamento de agendamento ───────────────────────────────────────────────
  if (ref.startsWith('APPT|')) {
    const appointmentId = ref.split('|')[1];
    if (!appointmentId) return;

    const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
    if (!appointment) return;

    if (appointment.status !== 'Confirmado') {
      await prisma.appointment.update({ where: { id: appointmentId }, data: { status: 'Confirmado' } });
    }

    if (appointment.price && appointment.price > 0) {
      const clientEmail = order.customer?.email || null;
      let isSubscriberClient = false;
      if (clientEmail) {
        const clientRecord = await prisma.client.findFirst({ where: { userId: appointment.userId, email: clientEmail }, select: { id: true } });
        if (clientRecord) {
          const activeSub = await prisma.clientSubscription.findFirst({ where: { userId: appointment.userId, clientId: clientRecord.id, status: 'active' } });
          isSubscriberClient = !!activeSub;
        }
      }
      if (!isSubscriberClient) {
        await creditWallet(appointment.userId, appointment.price, appointmentId, `Pagamento PIX — ${appointment.serviceName} (${appointment.clientName})`);
      }
    }

    const customerName = order.customer?.name || appointment.clientName;
    const customerEmail = order.customer?.email || null;
    const userId = appointment.userId;
    if (customerEmail && userId && customerName) {
      const existing = await prisma.client.findFirst({ where: { userId, email: customerEmail } });
      if (existing) {
        const confirmedAppts = await prisma.appointment.findMany({
          where: { userId, clientName: customerName, status: 'Confirmado' },
          select: { price: true, date: true },
          orderBy: { date: 'desc' },
        });
        const totalSpent = confirmedAppts.reduce((s, a) => s + (a.price || 0), 0);
        const frequency = confirmedAppts.length;
        const lastVisit = confirmedAppts[0]?.date || appointment.date;
        const tag = frequency >= 5 ? 'VIP' : frequency >= 2 ? 'Recorrente' : 'Novo';
        await prisma.client.update({ where: { id: existing.id }, data: { totalSpent, frequency, tag, lastVisit } });
      }
    }
  }
}

async function findSubscriptionByPagarmeId(pagarmeSubscriptionId: string) {
  if (!pagarmeSubscriptionId) return null;
  return prisma.clientSubscription.findFirst({
    where: { data: { path: ['pagarmeSubscriptionId'], equals: pagarmeSubscriptionId } },
  });
}

async function handleSubscriptionStatus(subscription: any) {
  const sub = await findSubscriptionByPagarmeId(subscription?.id);
  if (!sub) return;

  const isActive = subscription.status === 'active';
  if (isActive && sub.status !== 'active') {
    await prisma.$transaction([
      prisma.clientSubscription.update({
        where: { id: sub.id },
        data: { status: 'active', data: { ...(sub.data as object), activatedAt: new Date().toISOString() } },
      }),
      prisma.subscriptionPlan.update({ where: { id: sub.planId }, data: { activeUsers: { increment: 1 } } }),
    ]);
  }
}

async function handleSubscriptionCanceled(subscription: any) {
  const sub = await findSubscriptionByPagarmeId(subscription?.id);
  if (!sub || sub.status !== 'active') return;

  await prisma.$transaction([
    prisma.clientSubscription.update({ where: { id: sub.id }, data: { status: 'cancelled' } }),
    prisma.subscriptionPlan.update({ where: { id: sub.planId }, data: { activeUsers: { decrement: 1 } } }),
  ]);
}

// Cobrança de um ciclo de renovação de assinatura por cartão (2º mês em diante —
// o 1º ciclo já é ativado sincronamente em app/api/payments/checkout/route.ts).
async function handleChargePaid(charge: any) {
  const pagarmeSubscriptionId: string | undefined = charge?.subscription_id || charge?.metadata?.subscriptionId;
  if (!pagarmeSubscriptionId) return;

  const sub = await findSubscriptionByPagarmeId(pagarmeSubscriptionId);
  if (!sub) return;

  const alreadyCredited = await prisma.walletTransaction.findFirst({ where: { relatedId: charge.id, category: 'assinatura' } });
  if (alreadyCredited) return;

  const [plan, client] = await Promise.all([
    prisma.subscriptionPlan.findUnique({ where: { id: sub.planId } }),
    prisma.client.findUnique({ where: { id: sub.clientId } }),
  ]);
  if (!plan) return;

  const amount = charge.amount ? charge.amount / 100 : plan.price;
  if (amount <= 0) return;

  const wallet = await prisma.wallet.findFirst({ where: { userId: sub.userId, type: 'subscription' } })
    ?? await prisma.wallet.create({ data: { userId: sub.userId, type: 'subscription', balance: 0 } });

  await prisma.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: amount } } });
  await prisma.walletTransaction.create({
    data: {
      userId: sub.userId,
      walletId: wallet.id,
      amount,
      type: 'credit',
      method: 'Cartão',
      description: `Assinatura (renovação) — ${plan.name} (${client?.name || 'Cliente'})`,
      category: 'assinatura',
      relatedId: charge.id,
    },
  });
}

// Sincroniza o status do recipient (KYC) assim que a Stone aprova/recusa o
// cadastro bancário de uma barbearia (Fase 3 — ver Configurações > Recebimentos).
async function handleRecipientUpdated(recipient: any) {
  if (!recipient?.id) return;
  const local = await prisma.pagarmeRecipient.findUnique({ where: { pagarmeRecipientId: recipient.id } });
  if (!local || !recipient.status || recipient.status === local.status) return;

  await prisma.pagarmeRecipient.update({
    where: { id: local.id },
    data: { status: recipient.status, lastError: recipient.status === 'refused' ? 'Cadastro recusado pela Stone — confira os dados e tente novamente.' : null },
  });
}
