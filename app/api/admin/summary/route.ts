import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const transactions = await prisma.walletTransaction.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      include: { wallet: true },
    });

    const summary = transactions.reduce(
      (acc, curr) => {
        if (curr.type === 'credit') acc.totalIn += Number(curr.amount);
        else acc.totalOut += Number(curr.amount);
        return acc;
      },
      { totalIn: 0, totalOut: 0 }
    );

    return NextResponse.json({ ...summary, transactions });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
