import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { creditWallet } from '@/lib/creditWallet';

// LorexPay envia: { event: "order.paid", orderId, status: "COMPLETED", total, customer: { name, email }, paidAt }
// O ref vem no query param da webhookUrl: ?ref=APPT|appointmentId  ou  ?ref=SUB|planId|userId|phone|cpf

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event } = body;

    if (event !== 'order.paid') {
      return NextResponse.json({ received: true });
    }

    const ref = request.nextUrl.searchParams.get('ref') || '';
    if (!ref) return NextResponse.json({ received: true });

    // ── Pagamento de assinatura ───────────────────────────────────────────
    if (ref.startsWith('SUB|')) {
      const [, planId, userId, clientPhone, clientCpf] = ref.split('|');
      if (!planId || !userId) return NextResponse.json({ received: true });

      const orderId: string = body.orderId;

      // Idempotência: verifica se já existe assinatura confirmada para este orderId
      const alreadyExists = await prisma.clientSubscription.findFirst({
        where: { data: { path: ['lorexpayOrderId'], equals: orderId } },
      });
      if (alreadyExists) return NextResponse.json({ received: true });

      const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
      if (!plan) return NextResponse.json({ received: true });

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
            name: body.customer?.name || 'Cliente',
            phone: clientPhone || '',
            email: body.customer?.email || null,
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

      // Confirma ClientSubscription pendente ou cria novo
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
              lorexpayOrderId: orderId,
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
              lorexpayOrderId: orderId,
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
      const amount = body.total || plan.price;
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
            relatedId: orderId,
          },
        });
      }

      return NextResponse.json({ received: true });
    }

    // ── Pagamento de agendamento ──────────────────────────────────────────
    if (ref.startsWith('APPT|')) {
      const appointmentId = ref.split('|')[1];
      if (!appointmentId) return NextResponse.json({ received: true });

      const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
      if (!appointment) return NextResponse.json({ received: true });

      if (appointment.status !== 'Confirmado') {
        await prisma.appointment.update({
          where: { id: appointmentId },
          data: { status: 'Confirmado' },
        });
      }

      if (appointment.price && appointment.price > 0) {
        const clientEmail = body.customer?.email || null;
        const clientPhone = clientEmail ? null : null; // LorexPay não retorna telefone no webhook
        let isSubscriberClient = false;

        // Verifica pelo email se o cliente é assinante ativo
        if (clientEmail) {
          const clientRecord = await prisma.client.findFirst({
            where: { userId: appointment.userId, email: clientEmail },
            select: { id: true },
          });
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

      // Enriquece dados do cliente
      const customerName = body.customer?.name || appointment.clientName;
      const customerEmail = body.customer?.email || null;
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
          await prisma.client.update({
            where: { id: existing.id },
            data: { totalSpent, frequency, tag, lastVisit },
          });
        }
      }

      return NextResponse.json({ received: true });
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('[lorexpay-webhook]', err.message);
    return NextResponse.json({ received: true, error: err.message });
  }
}
