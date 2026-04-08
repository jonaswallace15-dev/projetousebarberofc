import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const wallets = await prisma.wallet.findMany({
      where: { userId: session.user.id },
      select: { id: true },
    });

    const walletIds = wallets.map(w => w.id);

    const transactions = await prisma.walletTransaction.findMany({
      where: { walletId: { in: walletIds } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json(transactions);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
