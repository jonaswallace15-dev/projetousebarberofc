import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

function formatBankLabel(bankAccount: any) {
  if (!bankAccount) return 'Conta bancária cadastrada';
  const { bank, branchNumber, accountNumber, accountCheckDigit } = bankAccount;
  return `Banco ${bank} · Ag ${branchNumber} · CC ${accountNumber}-${accountCheckDigit}`;
}

// Saque via Pagar.me (Fase 3) — exige recipient ativo (KYC/conta bancária cadastrada
// em Configurações). Sem isso, o dinheiro está no saldo pooled da conta principal e
// não tem como o app mandar pra conta de uma barbearia específica.
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { amount, walletType } = await request.json();
    const userId = session.user.id;

    const parsedAmount = Math.round(Number(amount) * 100) / 100;
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }

    const validTypes = ['subscription', 'barbershop', 'barber'];
    const type = validTypes.includes(walletType) ? walletType : 'barbershop';

    const recipient = await prisma.pagarmeRecipient.findUnique({ where: { userId } });
    if (!recipient || recipient.status !== 'active') {
      return NextResponse.json({
        error: 'Cadastre seus dados bancários em Configurações antes de solicitar saque.',
        recipientStatus: recipient?.status || 'missing',
      }, { status: 400 });
    }

    const bankLabel = formatBankLabel(recipient.bankAccount);

    const withdrawal = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findFirst({ where: { userId, type } });
      if (!wallet) throw new Error('Carteira não encontrada');
      if (wallet.balance < parsedAmount) throw new Error('Saldo insuficiente');

      await tx.wallet.update({ where: { id: wallet.id }, data: { balance: { decrement: parsedAmount } } });
      await tx.walletTransaction.create({
        data: { userId, walletId: wallet.id, amount: parsedAmount, type: 'debit', method: 'pix', description: `Saque — ${bankLabel}`, category: 'saque' },
      });

      return tx.withdrawal.create({
        data: { walletId: wallet.id, userId, amount: parsedAmount, pixKey: bankLabel, status: 'Pendente' },
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
