import { prisma } from '@/lib/prisma';
import { creditWallet } from '@/lib/creditWallet';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, data } = body;

    if (event === 'billing.paid' || event === 'pix.paid') {
      const billing = data?.pixQrCode || data?.billing || data;
      const meta = billing?.metadata || {};

      // ── Plano de assinatura ──
      if (meta.type === 'plan_subscription') {
        const { planId, userId, clientName, clientPhone, clientEmail } = meta;
        if (planId && userId && clientName && clientPhone) {
          // Find or create client
          let client = await prisma.client.findFirst({ where: { userId, phone: clientPhone } });
          if (!client) {
            client = await prisma.client.create({
              data: {
                userId,
                name: clientName,
                phone: clientPhone,
                email: clientEmail || null,
                totalSpent: 0,
                frequency: 0,
                tag: 'Novo',
                lastVisit: new Date().toISOString().split('T')[0],
              },
            });
          }
          // Avoid duplicate subscription
          const existing = await prisma.clientSubscription.findFirst({ where: { userId, clientId: client.id, planId } });
          if (!existing) {
            await prisma.clientSubscription.create({
              data: { userId, clientId: client.id, planId, data: { billingId: billing?.id, subscribedAt: new Date().toISOString() } },
            });
            await prisma.subscriptionPlan.update({ where: { id: planId }, data: { activeUsers: { increment: 1 } } });
          }
        }
        return NextResponse.json({ received: true });
      }

      // ── Agendamento avulso ──
      const appointmentId = billing?.metadata?.externalId || billing?.externalId || null;

      if (appointmentId) {
        const appointment = await prisma.appointment.update({
          where: { id: appointmentId },
          data: { status: 'Confirmado' },
        });

        // Creditar carteira da barbearia
        if (appointment.price > 0) {
          await creditWallet(
            appointment.userId,
            appointment.price,
            appointmentId,
            `Pagamento PIX — ${appointment.serviceName} (${appointment.clientName})`,
          );
        }

        // Auto-criar/atualizar cliente com os dados do pagamento
        const customer = billing?.customer || data?.customer || null;
        const clientPhone = customer?.cellphone || customer?.phone || null;
        const clientEmail = customer?.email || null;
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
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    // Retorna 200 mesmo em erro para evitar reenvios desnecessários do AbacatePay
    return NextResponse.json({ received: true, error: err.message });
  }
}
