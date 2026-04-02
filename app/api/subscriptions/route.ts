import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const subscriptions = await prisma.clientSubscription.findMany({
      where: { userId: session.user.id },
      include: {
        client: { select: { name: true, phone: true, email: true } },
        plan: { select: { name: true, price: true } },
      },
      orderBy: { id: 'desc' },
    });

    return NextResponse.json(subscriptions.map((s: any) => ({
      id: s.id,
      planId: s.planId,
      clientId: s.clientId,
      clientName: s.client.name,
      clientPhone: s.client.phone,
      clientEmail: s.client.email,
      planName: s.plan.name,
      planPrice: s.plan.price,
      stripeSubscriptionId: (s as any).stripeSubscriptionId || (s.data as any)?.stripeSubscriptionId || null,
      subscribedAt: (s.data as any)?.subscribedAt || (s.data as any)?.simulatedAt || null,
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
    const { action, ...data } = body;

    if (action === 'create') {
      const { clientId, planId, ...rest } = data;
      const result = await prisma.clientSubscription.create({
        data: {
          userId: session.user.id,
          clientId: clientId ?? data.client_id,
          planId: planId ?? data.plan_id,
          data: rest ?? {},
        },
      });
      return NextResponse.json(result);
    }

    if (action === 'update') {
      const { id, updates } = data;
      await prisma.clientSubscription.updateMany({
        where: { id, userId: session.user.id },
        data: updates,
      });
      return NextResponse.json({ success: true });
    }

    if (action === 'delete') {
      const { id } = data;
      await prisma.clientSubscription.deleteMany({
        where: { id, userId: session.user.id },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
