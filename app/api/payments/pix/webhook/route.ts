import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { creditWallet } from '@/lib/creditWallet';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Asaas envia: { event: "PAYMENT_RECEIVED", payment: { ... } }
    const { event, payment } = body;

    const isPaid = ['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'].includes(event);
    if (!isPaid || !payment?.id) {
      return NextResponse.json({ received: true });
    }

    const externalReference = payment.externalReference as string | undefined;
    if (!externalReference) return NextResponse.json({ received: true });

    // ── Pagamento de assinatura Asaas ─────────────────────────────────────
    if (externalReference.startsWith('SUB|')) {
      const [, planId, userId, clientPhone, clientCpf] = externalReference.split('|');
      if (!planId || !userId) return NextResponse.json({ received: true });

      // Idempotência: verifica se já existe assinatura confirmada para este pagamento
      const alreadyExists = await prisma.clientSubscription.findFirst({
        where: { data: { path: ['asaasPaymentId'], equals: payment.id } },
      });
      if (alreadyExists) return NextResponse.json({ received: true });

      const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
      if (!plan) return NextResponse.json({ received: true });

      // Cria ou busca cliente
      let client = clientPhone
        ? await prisma.client.findFirst({ where: { userId, phone: clientPhone } })
        : null;

      if (!client) {
        client = await prisma.client.create({
          data: {
            userId,
            name: payment.customer?.name || 'Cliente',
            phone: clientPhone || '',
            email: payment.customer?.email || null,
            cpfCnpj: clientCpf || null,
            tag: 'Novo',
            lastVisit: new Date().toISOString().slice(0, 10),
            totalSpent: 0,
            frequency: 0,
          },
        });
      } else if (clientCpf && !client.cpfCnpj) {
        await prisma.client.update({
          where: { id: client.id },
          data: { cpfCnpj: clientCpf },
        });
      }

      // Confirma ClientSubscription existente (pending_payment → active) ou cria novo
      const pendingSub = await prisma.clientSubscription.findFirst({
        where: { userId, clientId: client.id, planId, status: 'pending_payment' },
      });

      if (pendingSub) {
        await prisma.clientSubscription.update({
          where: { id: pendingSub.id },
          data: {
            status: 'active',
            data: {
              ...(pendingSub.data as object),
              asaasPaymentId: payment.id,
              asaasSubscriptionId: payment.subscription || null,
              cpfCnpj: clientCpf || null,
              confirmedAt: new Date().toISOString(),
            },
          },
        });
      } else {
        await prisma.clientSubscription.create({
          data: {
            userId,
            clientId: client.id,
            planId,
            status: 'active',
            data: {
              subscribedAt: new Date().toISOString(),
              asaasSubscriptionId: payment.subscription || null,
              asaasPaymentId: payment.id,
              cpfCnpj: clientCpf || null,
            },
          },
        });
      }

      await prisma.subscriptionPlan.update({
        where: { id: planId },
        data: { activeUsers: { increment: 1 } },
      });

      // Credita carteira de assinaturas
      const amount = payment.value || plan.price;
      if (amount > 0) {
        const wallet = await prisma.wallet.findFirst({ where: { userId, type: 'subscription' } })
          ?? await prisma.wallet.create({ data: { userId, type: 'subscription', balance: 0 } });

        await prisma.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: amount } } });
        await prisma.walletTransaction.create({
          data: {
            userId,
            walletId: wallet.id,
            amount,
            type: 'credit',
            method: 'pix',
            description: `Assinatura — ${plan.name} (${client.name})`,
            category: 'assinatura',
            relatedId: payment.id,
          },
        });
      }

      return NextResponse.json({ received: true });
    }

    // ── Pagamento de agendamento ──────────────────────────────────────────
    const appointmentId = externalReference;
    const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
    if (!appointment) return NextResponse.json({ received: true });

    if (appointment.status !== 'Confirmado') {
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: 'Confirmado' },
      });
    }

    // Só credita se o cliente não for assinante ativo
    if (appointment.price && appointment.price > 0) {
      const clientPhone2 = payment.customer?.phone || null;
      let isSubscriberClient = false;
      if (clientPhone2) {
        const phoneDigits = clientPhone2.replace(/\D/g, '');
        const clientRecord = await prisma.client.findFirst({ where: { userId: appointment.userId, phone: phoneDigits }, select: { id: true } });
        if (clientRecord) {
          const activeSub = await prisma.clientSubscription.findFirst({
            where: { userId: appointment.userId, clientId: clientRecord.id, status: 'active' },
          });
          isSubscriberClient = !!activeSub;
        }
      }
      if (!isSubscriberClient) {
        await creditWallet(
          appointment.userId,
          appointment.price,
          appointmentId,
          `Pagamento PIX — ${appointment.serviceName} (${appointment.clientName})`,
        );
      }
    }

    const clientPhone = payment.customer?.phone || null;
    const clientEmail = payment.customer?.email || null;
    const clientName = appointment.clientName;
    const userId = appointment.userId;

    if (clientPhone && userId && clientName) {
      const confirmedAppts = await prisma.appointment.findMany({
        where: { userId, clientName, status: 'Confirmado' },
        select: { price: true, date: true },
        orderBy: { date: 'desc' },
      });
      const totalSpent = confirmedAppts.reduce((s, a) => s + (a.price || 0), 0);
      const frequency = confirmedAppts.length;
      const lastVisit = confirmedAppts[0]?.date || appointment.date || '';
      const tag = frequency >= 5 ? 'VIP' : frequency >= 2 ? 'Recorrente' : 'Novo';
      const existing = await prisma.client.findFirst({ where: { userId, phone: clientPhone } });
      if (existing) {
        await prisma.client.update({
          where: { id: existing.id },
          data: { name: clientName, totalSpent, frequency, tag, lastVisit, ...(clientEmail ? { email: clientEmail } : {}) },
        });
      } else {
        await prisma.client.create({
          data: { userId, name: clientName, phone: clientPhone, email: clientEmail || null, totalSpent, frequency, tag, lastVisit },
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('[asaas-webhook]', err.message);
    return NextResponse.json({ received: true, error: err.message });
  }
}
