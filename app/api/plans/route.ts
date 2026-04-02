import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const plans = await prisma.subscriptionPlan.findMany({
      where: { userId: session.user.id },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(plans.map((p) => ({
      ...p,
      user_id: p.userId,
      active_users: p.activeUsers,
    })));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { id, active_users, activeUsers, name, price, benefits } = body;

    const planName = name ?? '';
    const planPrice = price ?? 0;
    const planBenefits = benefits ?? [];

    let stripePriceId: string | undefined;

    if (id) {
      // Updating existing plan
      const existing = await prisma.subscriptionPlan.findUnique({ where: { id } }) as any;

      if (existing?.stripePriceId && existing.price !== planPrice) {
        // Price changed → create new Stripe Price
        const newPrice = await stripe.prices.create({
          product: (await stripe.prices.retrieve(existing.stripePriceId)).product as string,
          unit_amount: Math.round(planPrice * 100),
          currency: 'brl',
          recurring: { interval: 'month' },
        });
        // Archive old price
        await stripe.prices.update(existing.stripePriceId, { active: false });
        stripePriceId = newPrice.id;
      } else {
        stripePriceId = existing?.stripePriceId ?? undefined;
      }

      // Update product name if changed
      if (existing?.stripePriceId && existing.name !== planName) {
        const oldPrice = await stripe.prices.retrieve(existing.stripePriceId);
        await stripe.products.update(oldPrice.product as string, { name: planName });
      }
    } else {
      // New plan → create Stripe Product + Price
      const product = await stripe.products.create({ name: planName });
      const stripePrice = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(planPrice * 100),
        currency: 'brl',
        recurring: { interval: 'month' },
      });
      stripePriceId = stripePrice.id;
    }

    const data = {
      userId: session.user.id,
      name: planName,
      price: planPrice,
      benefits: planBenefits,
      activeUsers: activeUsers ?? active_users ?? 0,
      stripePriceId: stripePriceId ?? null,
    };

    let plan: any;
    if (id) {
      plan = await prisma.subscriptionPlan.update({ where: { id }, data: data as any });
    } else {
      plan = await prisma.subscriptionPlan.create({ data: data as any });
    }

    return NextResponse.json({
      ...plan,
      user_id: plan.userId,
      active_users: plan.activeUsers,
    });
  } catch (err: any) {
    console.error('[plans/POST]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await request.json();
    const plan = await prisma.subscriptionPlan.findFirst({
      where: { id, userId: session.user.id },
    }) as any;

    // Archive Stripe product if exists
    if (plan?.stripePriceId) {
      try {
        const price = await stripe.prices.retrieve(plan.stripePriceId);
        await stripe.products.update(price.product as string, { active: false });
        await stripe.prices.update(plan.stripePriceId, { active: false });
      } catch {}
    }

    await prisma.subscriptionPlan.deleteMany({
      where: { id, userId: session.user.id },
    });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
