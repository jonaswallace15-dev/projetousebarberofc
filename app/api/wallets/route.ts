import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const barberId = searchParams.get('barber_id');

  try {
    if (type === 'barbershop') {
      const wallet = await prisma.wallet.upsert({
        where: { userId_type_barberId: { userId: session.user.id, type: 'barbershop', barberId: null as any } },
        update: {},
        create: { userId: session.user.id, type: 'barbershop', balance: 0 },
      }).catch(async () => {
        // fallback: findFirst or create
        const existing = await prisma.wallet.findFirst({
          where: { userId: session.user.id, type: 'barbershop' },
        });
        if (existing) return existing;
        return prisma.wallet.create({
          data: { userId: session.user.id, type: 'barbershop', balance: 0 },
        });
      });
      return NextResponse.json(wallet);
    }

    if (type === 'barber' && barberId) {
      const existing = await prisma.wallet.findFirst({
        where: { barberId, type: 'barber' },
      });
      if (existing) return NextResponse.json(existing);

      const wallet = await prisma.wallet.create({
        data: { userId: session.user.id, barberId, type: 'barber', balance: 0 },
      });
      return NextResponse.json(wallet);
    }

    if (type === 'system') {
      const existing = await prisma.wallet.findFirst({ where: { type: 'system' } });
      if (existing) return NextResponse.json(existing);

      const wallet = await prisma.wallet.create({
        data: { type: 'system', balance: 0 },
      });
      return NextResponse.json(wallet);
    }

    // Retorna todas as carteiras do usuário
    const wallets = await prisma.wallet.findMany({
      where: { userId: session.user.id },
    });
    return NextResponse.json(wallets);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { action, transaction } = body;

    if (action === 'record') {
      const walletId = transaction.wallet_id ?? transaction.walletId;
      const amount = Number(transaction.amount);
      const txType = transaction.type;

      const result = await prisma.$transaction(async (tx) => {
        if (txType === 'credit') {
          await tx.wallet.update({
            where: { id: walletId },
            data: { balance: { increment: amount } },
          });
        } else {
          await tx.wallet.update({
            where: { id: walletId },
            data: { balance: { decrement: amount } },
          });
        }

        const newTx = await tx.walletTransaction.create({
          data: {
            userId: session.user.id,
            walletId,
            amount,
            type: txType,
            method: transaction.method ?? null,
            description: transaction.description ?? null,
            category: transaction.category ?? null,
            relatedId: transaction.related_id ?? transaction.relatedId ?? null,
          },
        });

        return newTx;
      });

      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
