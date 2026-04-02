import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { walletId, amount, pixKey } = await request.json();
    const userId = session.user.id;

    const parsedAmount = Number(amount);
    if (!walletId || !Number.isFinite(parsedAmount) || parsedAmount <= 0 || !pixKey?.trim()) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }

    const wallet = await prisma.wallet.findFirst({ where: { id: walletId, userId } });
    if (!wallet) return NextResponse.json({ error: 'Carteira não encontrada' }, { status: 404 });
    if (wallet.balance < amount) return NextResponse.json({ error: 'Saldo insuficiente' }, { status: 400 });

    const withdrawal = await prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { id: walletId },
        data: { balance: { decrement: amount } },
      });

      await tx.walletTransaction.create({
        data: {
          userId,
          walletId,
          amount,
          type: 'debit',
          method: 'pix',
          description: `Saque PIX — chave: ${pixKey}`,
          category: 'saque',
        },
      });

      return tx.withdrawal.create({
        data: { walletId, userId, amount, pixKey, status: 'Pendente' },
      });
    });

    return NextResponse.json(withdrawal);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const withdrawals = await prisma.withdrawal.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(withdrawals);
}
