import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { amount, pixKey, walletType } = await request.json();
    const userId = session.user.id;

    const parsedAmount = Math.round(Number(amount) * 100) / 100;
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }

    const validTypes = ['subscription', 'barbershop', 'barber'];
    const type = validTypes.includes(walletType) ? walletType : 'barbershop';

    // Chave PIX obrigatória apenas para carteiras que não são de assinatura
    if (type !== 'subscription' && !pixKey?.trim()) {
      return NextResponse.json({ error: 'Chave PIX obrigatória' }, { status: 400 });
    }

    const finalPixKey = pixKey?.trim() || 'A definir pelo admin';

    const withdrawal = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findFirst({ where: { userId, type } });
      if (!wallet) throw new Error('Carteira não encontrada');
      if (wallet.balance < parsedAmount) throw new Error('Saldo insuficiente');

      await tx.wallet.update({ where: { id: wallet.id }, data: { balance: { decrement: parsedAmount } } });
      await tx.walletTransaction.create({
        data: { userId, walletId: wallet.id, amount: parsedAmount, type: 'debit', method: 'pix', description: `Saque PIX — chave: ${finalPixKey}`, category: 'saque' },
      });

      return tx.withdrawal.create({
        data: { walletId: wallet.id, userId, amount: parsedAmount, pixKey: finalPixKey, status: 'Pendente' },
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
    select: { id: true, amount: true, pixKey: true, status: true, createdAt: true, processedAt: true },
  });

  return NextResponse.json(withdrawals);
}
