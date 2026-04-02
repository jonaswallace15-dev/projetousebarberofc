import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // ── Create Stripe Checkout Session (subscription) ──────────────────
    if (action === 'create-checkout') {
      const { planId, clientName, clientEmail, clientPhone, origin } = body;

      const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
      if (!plan) return NextResponse.json({ error: 'Plano não encontrado' }, { status: 404 });

      // Ensure the plan has a Stripe Price
      let stripePriceId = plan.stripePriceId;
      if (!stripePriceId) {
        const product = await stripe.products.create({ name: plan.name });
        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: Math.round(plan.price * 100),
          currency: 'brl',
          recurring: { interval: 'month' },
        });
        stripePriceId = price.id;
        await prisma.subscriptionPlan.update({
          where: { id: planId },
          data: { stripePriceId },
        });
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [{ price: stripePriceId, quantity: 1 }],
        customer_email: clientEmail || undefined,
        metadata: {
          planId: plan.id,
          userId: plan.userId,
          clientName: clientName || '',
          clientPhone: clientPhone || '',
          clientEmail: clientEmail || '',
        },
        success_url: `${origin}/plano/${planId}?pago=1`,
        cancel_url: `${origin}/plano/${planId}`,
      });

      return NextResponse.json({ url: session.url });
    }

    // ── Cancel Stripe Subscription ─────────────────────────────────────
    if (action === 'cancel-subscription') {
      const { subscriptionId, clientSubscriptionId } = body;

      if (subscriptionId) {
        await stripe.subscriptions.cancel(subscriptionId);
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
    console.error('[stripe]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
