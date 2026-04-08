import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
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
      id: p.id,
      name: p.name,
      price: p.price,
      benefits: p.benefits,
      activeUsers: p.activeUsers,
      userId: p.userId,
      user_id: p.userId,
      active_users: p.activeUsers,
      stripePriceId: p.stripePriceId,
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

    const data = {
      userId: session.user.id,
      name: planName,
      price: planPrice,
      benefits: planBenefits,
      activeUsers: activeUsers ?? active_users ?? 0,
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
    await prisma.subscriptionPlan.deleteMany({
      where: { id, userId: session.user.id },
    });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
