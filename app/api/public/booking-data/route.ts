import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug) return NextResponse.json({ error: 'Slug required' }, { status: 400 });

  try {
    const config = await prisma.config.findFirst({
      where: { slug },
      select: { userId: true, data: true, slug: true },
    });

    if (!config?.userId) return NextResponse.json({ notFound: true }, { status: 404 });

    const userId = config.userId;

    const [services, barbers, products, appointments] = await Promise.all([
      prisma.service.findMany({
        where: { userId, active: true },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, price: true, duration: true, image: true },
      }),
      prisma.barber.findMany({
        where: { userId },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, avatar: true, services: true, schedule: true },
      }),
      prisma.product.findMany({
        where: { userId, active: true, stock: { gt: 0 } },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, price: true, image: true },
      }),
      prisma.appointment.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
        select: { id: true, barberId: true, date: true, time: true, status: true, serviceId: true },
      }),
    ]);

    return NextResponse.json(
      {
        userId,
        config: { user_id: userId, slug: config.slug, ...(config.data as object) },
        services,
        barbers,
        products,
        appointments,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
