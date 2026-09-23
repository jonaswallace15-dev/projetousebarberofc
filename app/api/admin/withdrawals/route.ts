import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createTransfer } from '@/lib/pagarme';
import { NextRequest, NextResponse } from 'next/server';

// Saques antigos (anteriores à Fase 3 da migração Pagar.me) foram pagos manualmente
// pelo admin direto no painel do Asaas, fora do app. Todos os novos saem via Transfers
// do recipient da barbearia no Pagar.me (ver sendTransferViaPagarme abaixo).
async function sendTransferViaPagarme(userId: string, amount: number): Promise<{ success: boolean; transferId?: string; error?: string }> {
  const recipient = await prisma.pagarmeRecipient.findUnique({ where: { userId } });
  if (!recipient?.pagarmeRecipientId || recipient.status !== 'active') {
    return { success: false, error: 'Barbearia sem recipient ativo no Pagar.me — cadastro bancário incompleto.' };
  }

  try {
    const transfer = await createTransfer({ recipientId: recipient.pagarmeRecipientId, amountCents: Math.round(amount * 100) });
    return { success: true, transferId: transfer.id };
  } catch (e: any) {
    return { success: false, error: e.message || 'Erro ao criar transferência no Pagar.me' };
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== 'Super Admin')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const withdrawals = await prisma.withdrawal.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        wallet: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
      },
    });

    return NextResponse.json(withdrawals);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== 'Super Admin')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id, action, notes } = await request.json();

    if (!['approve', 'reject', 'retry-transfer'].includes(action)) {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    if (action === 'approve') {
      const withdrawal = await prisma.withdrawal.findUnique({ where: { id } });
      if (!withdrawal) return NextResponse.json({ error: 'Saque não encontrado' }, { status: 404 });
      if (withdrawal.status !== 'Pendente') return NextResponse.json({ error: 'Saque já processado' }, { status: 400 });

      // Marca como aprovado e tenta a transferência sincronamente
      await prisma.withdrawal.update({
        where: { id },
        data: { status: 'Aprovado', processedAt: new Date(), notes: 'Aprovado — enviando transferência...' },
      });

      const transfer = await sendTransferViaPagarme(withdrawal.userId, withdrawal.amount);

      const updated = await prisma.withdrawal.update({
        where: { id },
        data: {
          pagarmeTransferId: transfer.transferId || null,
          notes: transfer.success
            ? `Transferência enviada via Pagar.me — ID: ${transfer.transferId} | R$${withdrawal.amount.toFixed(2)}`
            : `Erro ao enviar transferência: ${transfer.error} — clique em Retentar ou resolva o cadastro bancário da barbearia.`,
        },
      });

      return NextResponse.json(updated);
    }

    if (action === 'retry-transfer') {
      const withdrawal = await prisma.withdrawal.findUnique({ where: { id } });
      if (!withdrawal) return NextResponse.json({ error: 'Saque não encontrado' }, { status: 404 });
      if (withdrawal.status !== 'Aprovado') return NextResponse.json({ error: 'Saque não está aprovado' }, { status: 400 });

      const transfer = await sendTransferViaPagarme(withdrawal.userId, withdrawal.amount);

      const updated = await prisma.withdrawal.update({
        where: { id },
        data: {
          pagarmeTransferId: transfer.transferId || withdrawal.pagarmeTransferId,
          notes: transfer.success
            ? `Transferência enviada via Pagar.me — ID: ${transfer.transferId} | R$${withdrawal.amount.toFixed(2)}`
            : `Erro ao enviar transferência: ${transfer.error} — clique em Retentar ou resolva o cadastro bancário da barbearia.`,
        },
      });

      return NextResponse.json(updated);
    }

    // Rejeitar — estorna saldo na carteira do barbeiro
    const toReject = await prisma.withdrawal.findUnique({
      where: { id },
      select: { status: true, amount: true, walletId: true, userId: true },
    });
    if (!toReject) return NextResponse.json({ error: 'Saque não encontrado' }, { status: 404 });
    if (toReject.status === 'Rejeitado') return NextResponse.json({ error: 'Saque já rejeitado' }, { status: 400 });

    const updated = await prisma.$transaction(async (tx) => {
      // Só estorna se ainda não tinha sido aprovado (Pendente) ou se aprovado mas a transferência não saiu
      if (toReject.status === 'Pendente' || toReject.status === 'Aprovado') {
        await tx.wallet.update({
          where: { id: toReject.walletId },
          data: { balance: { increment: toReject.amount } },
        });
        await tx.walletTransaction.create({
          data: {
            userId: toReject.userId,
            walletId: toReject.walletId,
            amount: toReject.amount,
            type: 'credit',
            method: 'pix',
            description: `Estorno de saque rejeitado${notes ? ` — ${notes}` : ''}`,
            category: 'estorno',
          },
        });
      }

      return tx.withdrawal.update({
        where: { id },
        data: {
          status: 'Rejeitado',
          processedAt: new Date(),
          ...(notes ? { notes } : {}),
        },
      });
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
