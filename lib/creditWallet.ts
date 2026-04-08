import { prisma } from '@/lib/prisma';

/**
 * Cria ou encontra a carteira da barbearia e credita o valor do pagamento.
 * Chamado quando um agendamento é confirmado via pagamento.
 */
export async function creditWallet(
  userId: string,
  amount: number,
  relatedId: string,
  description: string,
  walletType: 'barbershop' | 'subscription' = 'barbershop',
) {
  if (!userId || !amount || amount <= 0) return;

  // Idempotência: não creditar duas vezes o mesmo evento
  const alreadyCredited = await prisma.walletTransaction.findFirst({
    where: { relatedId, type: 'credit', category: 'pagamento' },
  });
  if (alreadyCredited) return;

  // Busca ou cria carteira do tipo solicitado
  let wallet = await prisma.wallet.findFirst({
    where: { userId, type: walletType },
  });

  if (!wallet) {
    wallet = await prisma.wallet.create({
      data: { userId, type: walletType, balance: 0 },
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
        relatedId,
      },
    }),
    prisma.financeTransaction.create({
      data: {
        userId,
        type: 'Entrada',
        category: walletType === 'subscription' ? 'Assinatura' : 'Serviço',
        amount,
        date: today,
        method: walletType === 'subscription' ? 'Cartão' : 'Pix',
        description,
        appointmentId: walletType === 'barbershop' ? relatedId : null,
      },
    }),
  ]);
}
