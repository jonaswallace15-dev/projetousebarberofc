import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const [totalShops, totalAppointments, revenueAgg, systemWallets] = await Promise.all([
      prisma.config.count(),
      prisma.appointment.count(),
      prisma.financeTransaction.aggregate({ _sum: { amount: true } }),
      prisma.wallet.findMany({ where: { type: 'system' } }),
    ]);

    const totalRevenue = revenueAgg._sum.amount ?? 0;
    const systemBalance = systemWallets.reduce((acc, w) => acc + (w.balance ?? 0), 0);

    return NextResponse.json({
      totalShops,
      totalAppointments,
      totalRevenue,
      systemBalance,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
