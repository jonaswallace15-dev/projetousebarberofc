import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = (session.user as any).role;

  try {
    // Barbeiro: retorna comissões calculadas com base nos agendamentos dele
    if (role === 'Barbeiro') {
      const barber = await prisma.barber.findFirst({
        where: { accountId: session.user.id },
        select: { id: true, commission: true, commissionType: true, userId: true },
      });
      if (!barber) return NextResponse.json([]);

      const appointments = await prisma.appointment.findMany({
        where: { barberId: barber.id, status: 'Confirmado' },
        orderBy: { date: 'desc' },
      });

      const result = appointments.map((a) => {
        const gross = a.price || 0;
        const earned = barber.commissionType === 'fixed'
          ? barber.commission
          : (gross * barber.commission) / 100;
        return {
          id: a.id,
          user_id: barber.userId,
          appointment_id: a.id,
          type: 'Entrada',
          category: 'Comissão',
          amount: earned,
          date: a.date,
          method: 'Pix',
          description: `${a.serviceName} — ${a.clientName}`,
          _gross: gross,
          _commissionRate: barber.commissionType === 'fixed' ? `R$${barber.commission}` : `${barber.commission}%`,
        };
      });

      return NextResponse.json(result);
    }

    // Proprietário: retorna todas as transações dele
    const transactions = await prisma.financeTransaction.findMany({
      where: { userId: session.user.id },
      orderBy: { date: 'desc' },
    });

    const result = transactions.map((t) => ({
      ...t,
      user_id: t.userId,
      appointment_id: t.appointmentId,
    }));

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const {
      id,
      user_id,
      appointment_id,
      appointmentId,
      type,
      category,
      amount,
      date,
      method,
      description,
    } = body;

    const data = {
      userId: session.user.id,
      type: type ?? 'income',
      category: category ?? null,
      amount: amount ?? 0,
      date: date ?? null,
      method: method ?? null,
      description: description ?? null,
      appointmentId: appointmentId ?? appointment_id ?? null,
    };

    let transaction;
    if (id) {
      transaction = await prisma.financeTransaction.update({ where: { id }, data });
    } else {
      transaction = await prisma.financeTransaction.create({ data });
    }

    return NextResponse.json({
      ...transaction,
      user_id: transaction.userId,
      appointment_id: transaction.appointmentId,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await request.json();
    await prisma.financeTransaction.deleteMany({
      where: { id, userId: session.user.id },
    });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
