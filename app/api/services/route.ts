import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const services = await prisma.service.findMany({
      where: { userId: session.user.id },
      orderBy: { name: 'asc' },
    });

    const result = services.map((s) => ({
      ...s,
      user_id: s.userId,
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
    const { id, user_id, name, price, duration, active, image } = body;

    const data = {
      userId: session.user.id,
      name: name ?? '',
      price: price ?? 0,
      duration: duration ?? null,
      active: active !== undefined ? active : true,
      image: image ?? null,
    };

    let service;
    if (id) {
      service = await prisma.service.update({ where: { id }, data });
    } else {
      service = await prisma.service.create({ data });
    }

    return NextResponse.json({ ...service, user_id: service.userId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await request.json();
    await prisma.service.deleteMany({
      where: { id, userId: session.user.id },
    });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
