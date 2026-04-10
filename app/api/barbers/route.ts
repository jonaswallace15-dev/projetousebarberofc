import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

const defaultSchedule = {
  monday:    { active: true,  start: '08:00', end: '18:00', hasPause: false, pauseStart: '12:00', pauseEnd: '13:00' },
  tuesday:   { active: true,  start: '08:00', end: '18:00', hasPause: false, pauseStart: '12:00', pauseEnd: '13:00' },
  wednesday: { active: true,  start: '08:00', end: '18:00', hasPause: false, pauseStart: '12:00', pauseEnd: '13:00' },
  thursday:  { active: true,  start: '08:00', end: '18:00', hasPause: false, pauseStart: '12:00', pauseEnd: '13:00' },
  friday:    { active: true,  start: '08:00', end: '18:00', hasPause: false, pauseStart: '12:00', pauseEnd: '13:00' },
  saturday:  { active: true,  start: '08:00', end: '14:00', hasPause: false, pauseStart: '12:00', pauseEnd: '13:00' },
  sunday:    { active: false, start: '08:00', end: '18:00', hasPause: false, pauseStart: '12:00', pauseEnd: '13:00' },
};

export async function GET(request: NextRequest) {
  const session = await auth();
  const { searchParams } = new URL(request.url);
  const publicUserId = searchParams.get('user_id');

  const userId = session?.user?.id || publicUserId;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    let barbers = await prisma.barber.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });

    // Auto-cria o card Dono/Master para novos usuários autenticados
    if (barbers.length === 0 && session?.user?.id) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, email: true },
      });
      const ownerName = user?.name || user?.email?.split('@')[0] || 'Proprietário';

      const owner = await prisma.barber.create({
        data: {
          userId: session.user.id,
          name: ownerName,
          role: 'Dono / Master',
          commission: 100,
          commissionType: 'percentage',
          avatar: null,
          services: [],
          schedule: defaultSchedule,
        },
      });
      barbers = [owner];
    }

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
