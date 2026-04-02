import { prisma } from '@/lib/prisma';

/**
 * Cria ou encontra a carteira da barbearia e credita o valor do pagamento.
 * Chamado quando um agendamento é confirmado via pagamento.
 */
export async function creditWallet(userId: string, amount: number, appointmentId: string, description: string) {
  if (!userId || !amount || amount <= 0) return;

  // Idempotência: não creditar duas vezes o mesmo agendamento
  const alreadyCredited = await prisma.walletTransaction.findFirst({
    where: { relatedId: appointmentId, type: 'credit', category: 'pagamento' },
  });
  if (alreadyCredited) return;

  // Busca ou cria carteira da barbearia
  let wallet = await prisma.wallet.findFirst({
    where: { userId, type: 'barbershop' },
  });

  if (!wallet) {
    wallet = await prisma.wallet.create({
      data: { userId, type: 'barbershop', balance: 0 },
    });
  }

  const today = new Date().toISOString().split('T')[0];

  // Credita na carteira, registra WalletTransaction e FinanceTransaction
  await prisma.$transaction([
    prisma.wallet.update({
      where: { id: wallet.id },
      data: { balance: { increment: amount } },
    }),
    prisma.walletTransaction.create({
      data: {
        userId,
        walletId: wallet.id,
        amount,
        type: 'credit',
        method: 'pix',
        description,
        category: 'pagamento',
        relatedId: appointmentId,
      },
    }),
    prisma.financeTransaction.create({
      data: {
        userId,
        type: 'Entrada',
        category: 'Serviço',
        amount,
        date: today,
        method: 'Pix',
        description,
        appointmentId,
      },
    }),
  ]);
}
