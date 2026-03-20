import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const session = await auth();
  const { searchParams } = new URL(request.url);
  const publicUserId = searchParams.get('user_id');

  const userId = session?.user?.id || publicUserId;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const barbers = await prisma.barber.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });

    const result = barbers.map((b) => ({
      ...b,
      user_id: b.userId,
      commissionType: b.commissionType,
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
    const { id, user_id, commissionType, name, role, commission, avatar, services, schedule } = body;

    const data = {
      userId: session.user.id,
      name: name ?? '',
      role: role ?? null,
      commission: commission ?? null,
      commissionType: commissionType ?? 'percentage',
      avatar: avatar ?? null,
      services: services ?? [],
      schedule: schedule ?? null,
    };

    let barber;
    if (id) {
      barber = await prisma.barber.update({ where: { id }, data });
    } else {
      barber = await prisma.barber.create({ data });
    }

    return NextResponse.json({
      ...barber,
      user_id: barber.userId,
      commissionType: barber.commissionType,
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
    await prisma.barber.deleteMany({
      where: { id, userId: session.user.id },
    });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
