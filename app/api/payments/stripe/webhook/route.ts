import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const sig = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: any;
  try {
    const rawBody = await request.text();
    event = stripe.webhooks.constructEvent(rawBody, sig!, webhookSecret);
  } catch (err: any) {
    console.error('[stripe-webhook] signature error:', err.message);
    return NextResponse.json({ error: 'Webhook signature invalid' }, { status: 400 });
  }

  try {
    // Idempotency: skip already-processed events
    const alreadyProcessed = await prisma.clientSubscription.findFirst({
      where: { data: { path: ['stripeEventId'], equals: event.id } },
    });
    if (alreadyProcessed) return NextResponse.json({ received: true });

    // ── Checkout completed → create subscription ───────────────────────
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      const meta = session.metadata || {};

      const { planId, userId, clientName, clientPhone, clientEmail } = meta;
      if (!planId || !userId) return NextResponse.json({ received: true });

      const stripeSubscriptionId = session.subscription as string;
      const stripeCustomerId = session.customer as string;

      // Find or create client
      let client = clientPhone
        ? await prisma.client.findFirst({ where: { userId, phone: clientPhone } })
        : null;

      if (!client) {
        client = await prisma.client.create({
          data: {
            userId,
            name: clientName || 'Cliente',
            phone: clientPhone || '',
            email: clientEmail || null,
            tag: 'Novo',
            lastVisit: new Date().toISOString().slice(0, 10),
            totalSpent: 0,
            frequency: 0,
          },
        });
      }

      // Create ClientSubscription — store stripe IDs in data JSON (works without Prisma regen)
      await prisma.clientSubscription.create({
        data: {
          userId,
          clientId: client.id,
          planId,
          data: {
            subscribedAt: new Date().toISOString(),
            stripeSubscriptionId,
            stripeCustomerId,
            status: 'active',
            stripeEventId: event.id,
          },
        },
      });

      // Increment activeUsers
      await prisma.subscriptionPlan.update({
        where: { id: planId },
        data: { activeUsers: { increment: 1 } },
      });
    }

    // ── Subscription cancelled in Stripe ──────────────────────────────
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as any;
      const stripeSubscriptionId = subscription.id;

      // Find by stripeSubscriptionId stored in data JSON field
      const existing = await prisma.clientSubscription.findFirst({
        where: { data: { path: ['stripeSubscriptionId'], equals: stripeSubscriptionId } },
      });

      if (existing) {
        await prisma.clientSubscription.delete({ where: { id: existing.id } });
        await prisma.subscriptionPlan.update({
          where: { id: existing.planId },
          data: { activeUsers: { decrement: 1 } },
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('[stripe-webhook] handler error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
