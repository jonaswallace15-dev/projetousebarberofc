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

    const result = plans.map((p) => ({
      ...p,
      user_id: p.userId,
      active_users: p.activeUsers,
    }));

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { id, user_id, active_users, activeUsers, name, price, benefits } = body;

    const data = {
      userId: session.user.id,
      name: name ?? '',
      price: price ?? 0,
      benefits: benefits ?? [],
      activeUsers: activeUsers ?? active_users ?? 0,
    };

    let plan;
    if (id) {
      plan = await prisma.subscriptionPlan.update({ where: { id }, data });
    } else {
      plan = await prisma.subscriptionPlan.create({ data });
    }

    return NextResponse.json({
      ...plan,
      user_id: plan.userId,
      active_users: plan.activeUsers,
    });
  } catch (err: any) {
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
