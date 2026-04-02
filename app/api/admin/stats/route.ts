import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== 'Super Admin')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfMonthStr = startOfMonth.toISOString().split('T')[0];

    const [
      totalShops,
      totalAppointments,
      revenueAgg,
      mrrAgg,
      totalBarbers,
      totalClients,
      newSignups7d,
      newSignups30d,
      pendingWithdrawals,
    ] = await Promise.all([
      prisma.config.count(),
      prisma.appointment.count(),
      prisma.financeTransaction.aggregate({ _sum: { amount: true } }),
      prisma.financeTransaction.aggregate({
        where: { date: { gte: startOfMonthStr } },
        _sum: { amount: true },
      }),
      prisma.barber.count(),
      prisma.client.count(),
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.withdrawal.count({ where: { status: 'Pendente' } }),
    ]);

    const totalRevenue = revenueAgg._sum.amount ?? 0;
    const mrr = mrrAgg._sum.amount ?? 0;
    const ticketMedio = totalAppointments > 0 ? totalRevenue / totalAppointments : 0;

    return NextResponse.json({
      totalShops,
      totalAppointments,
      totalRevenue,
      mrr,
      totalBarbers,
      totalClients,
      newSignups7d,
      newSignups30d,
      pendingWithdrawals,
      ticketMedio,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
