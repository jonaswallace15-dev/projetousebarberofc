import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

async function getOrCreateWallet(userId: string, filter: { barberId?: string; type: string }) {
  const existing = await prisma.wallet.findFirst({ where: { ...filter } });
  if (existing) return existing;

  return prisma.wallet.create({
    data: {
      userId,
      barberId: filter.barberId ?? null,
      type: filter.type,
      balance: 0,
    },
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { appointment, barber, method } = await request.json();
    const userId = session.user.id;
    const totalAmount = Number(appointment.price);
    const paymentMethod = method || 'Pix';

    let barberCommission = 0;
    if (barber.commissionType === 'percentage') {
      barberCommission = (totalAmount * Number(barber.commission)) / 100;
    } else {
      barberCommission = Number(barber.commission);
    }
    const ownerShare = totalAmount - barberCommission;

    const [barberWallet, barbershopWallet] = await Promise.all([
      getOrCreateWallet(userId, { barberId: barber.id, type: 'barber' }),
      getOrCreateWallet(userId, { type: 'barbershop' }),
    ]);

    if (barberCommission > 0) {
      await prisma.$transaction(async (tx) => {
        await tx.wallet.update({
          where: { id: barberWallet.id },
          data: { balance: { increment: barberCommission } },
        });
        await tx.walletTransaction.create({
          data: {
            userId,
            walletId: barberWallet.id,
            amount: barberCommission,
            type: 'credit',
            method: paymentMethod,
            description: `Comissão - ${appointment.serviceName} (${appointment.clientName})`,
            category: 'Commission',
            relatedId: appointment.id ?? null,
          },
        });
      });
    }

    if (ownerShare > 0) {
      await prisma.$transaction(async (tx) => {
        await tx.wallet.update({
          where: { id: barbershopWallet.id },
          data: { balance: { increment: ownerShare } },
        });
        await tx.walletTransaction.create({
          data: {
            userId,
            walletId: barbershopWallet.id,
            amount: ownerShare,
            type: 'credit',
            method: paymentMethod,
            description: `Parte Proprietário - ${appointment.serviceName} (${appointment.clientName})`,
            category: 'Owner_Share',
            relatedId: appointment.id ?? null,
          },
        });
      });
    }

    return NextResponse.json({ barberCommission, ownerShare });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
