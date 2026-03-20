import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
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
