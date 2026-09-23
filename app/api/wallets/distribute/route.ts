import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

async function getOrCreateWallet(userId: string, filter: { barberId?: string; type: string }) {
  const existing = await prisma.wallet.findFirst({ where: { ...filter, userId } });
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
    const { appointmentId, method } = await request.json();
    const userId = session.user.id;
    const paymentMethod = method || 'Pix';

    // Preço, agendamento e barbeiro sempre vêm do banco, nunca do que o cliente mandar,
    // e sempre filtrados por userId pra impedir que alguém credite carteira de outra barbearia.
    const appointment = await prisma.appointment.findFirst({ where: { id: appointmentId, userId } });
    if (!appointment) return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 });

    const barber = appointment.barberId
      ? await prisma.barber.findFirst({ where: { id: appointment.barberId, userId } })
      : null;
    if (!barber) return NextResponse.json({ error: 'Barbeiro não encontrado' }, { status: 404 });

    const totalAmount = Number(appointment.price) || 0;

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
