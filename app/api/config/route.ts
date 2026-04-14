import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const config = await prisma.config.findUnique({
      where: { userId: session.user.id },
    });

    if (!config) return NextResponse.json(null);

    return NextResponse.json({
      ...(config.data as object),
      id: config.id,
      user_id: config.userId,
      slug: config.slug,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const existing = await prisma.config.findUnique({ where: { userId: session.user.id } });
    if (!existing) return NextResponse.json({ ok: true });

    const currentData = (existing.data as object) ?? {};
    await prisma.config.update({
      where: { userId: session.user.id },
      data: { data: { ...currentData, ...body } },
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { slug, id, user_id, ...rest } = body;

    // Preserva campos como `theme` que podem ter sido salvos separadamente
    const existing = await prisma.config.findUnique({ where: { userId: session.user.id } });
    const currentData = (existing?.data as object) ?? {};

    const config = await prisma.config.upsert({
      where: { userId: session.user.id },
      update: {
        slug: slug ?? null,
        data: { ...currentData, ...rest },
      },
      create: {
        userId: session.user.id,
        slug: slug ?? null,
        data: rest,
      },
    });

    return NextResponse.json({
      ...(config.data as object),
      id: config.id,
      user_id: config.userId,
      slug: config.slug,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
