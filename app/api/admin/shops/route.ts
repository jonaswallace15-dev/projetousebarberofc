import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== 'Super Admin')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    const [configs, barberCounts, clientCounts, appointmentCounts, recentApptCounts, revenueAggs] = await Promise.all([
      prisma.config.findMany({
        include: { user: { select: { email: true, name: true, createdAt: true } } },
      }),
      prisma.barber.groupBy({ by: ['userId'], _count: { id: true } }),
      prisma.client.groupBy({ by: ['userId'], _count: { id: true } }),
      prisma.appointment.groupBy({ by: ['userId'], _count: { id: true } }),
      prisma.appointment.groupBy({
        by: ['userId'],
        where: { date: { gte: thirtyDaysAgoStr } },
        _count: { id: true },
      }),
      prisma.financeTransaction.groupBy({ by: ['userId'], _sum: { amount: true } }),
    ]);

    const barberMap = Object.fromEntries(barberCounts.map(b => [b.userId, b._count.id]));
    const clientMap = Object.fromEntries(clientCounts.map(c => [c.userId, c._count.id]));
    const apptMap = Object.fromEntries(appointmentCounts.map(a => [a.userId, a._count.id]));
    const recentMap = Object.fromEntries(recentApptCounts.map(a => [a.userId, a._count.id]));
    const revenueMap = Object.fromEntries(revenueAggs.map(r => [r.userId, r._sum.amount ?? 0]));

    const result = configs.map((c) => ({
      id: c.id,
      slug: c.slug,
      userId: c.userId,
      user: c.user,
      email: c.user?.email,
      createdAt: c.user?.createdAt,
      ...((c.data as object) || {}),
      barbersCount: barberMap[c.userId] || 0,
      clients: clientMap[c.userId] || 0,
      appointments: apptMap[c.userId] || 0,
      recentAppointments: recentMap[c.userId] || 0,
      revenue: revenueMap[c.userId] || 0,
    }));

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
