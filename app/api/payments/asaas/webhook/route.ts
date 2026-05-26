import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, payment } = body;

    // O campo payment.subscription traz o ID da assinatura no Asaas
    const asaasSubscriptionId = payment?.subscription;
    if (!asaasSubscriptionId) return NextResponse.json({ received: true });

    if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
      const sub = await prisma.clientSubscription.findFirst({
        where: { data: { path: ['asaasSubscriptionId'], equals: asaasSubscriptionId } },
      });

      if (sub && sub.status !== 'active') {
        await prisma.$transaction([
          prisma.clientSubscription.update({
            where: { id: sub.id },
            data: {
              status: 'active',
              data: { ...(sub.data as object), activatedAt: new Date().toISOString() },
            },
          }),
          prisma.subscriptionPlan.update({
            where: { id: sub.planId },
            data: { activeUsers: { increment: 1 } },
          }),
        ]);
      }
    }

    if (event === 'SUBSCRIPTION_DELETED' || event === 'PAYMENT_REFUNDED') {
      const sub = await prisma.clientSubscription.findFirst({
        where: { data: { path: ['asaasSubscriptionId'], equals: asaasSubscriptionId } },
      });

      if (sub && sub.status === 'active') {
        await prisma.$transaction([
          prisma.clientSubscription.update({
            where: { id: sub.id },
            data: { status: 'cancelled' },
          }),
          prisma.subscriptionPlan.update({
            where: { id: sub.planId },
            data: { activeUsers: { decrement: 1 } },
          }),
        ]);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('[asaas-webhook]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
