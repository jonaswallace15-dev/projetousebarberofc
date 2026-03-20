import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const session = await auth();
  const { searchParams } = new URL(request.url);
  const publicUserId = searchParams.get('user_id');

  const userId = session?.user?.id || publicUserId;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const appointments = await prisma.appointment.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
    });

    const result = appointments.map((a) => ({
      ...a,
      user_id: a.userId,
      client_id: a.clientId,
      client_name: a.clientName,
      barber_id: a.barberId,
      barber_name: a.barberName,
      service_id: a.serviceId,
      service_name: a.serviceName,
    }));

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const body = await request.json();

  // Para booking público, user_id vem no body
  const userId = session?.user?.id || body.user_id;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // Aceitar tanto camelCase quanto snake_case no body
    const id = body.id;
    const clientId = body.clientId ?? body.client_id ?? null;
    const clientName = body.clientName ?? body.client_name ?? null;
    const barberId = body.barberId ?? body.barber_id ?? null;
    const barberName = body.barberName ?? body.barber_name ?? null;
    const serviceId = body.serviceId ?? body.service_id ?? null;
    const serviceName = body.serviceName ?? body.service_name ?? null;
    const time = body.time ?? null;
    const date = body.date ?? null;
    const status = body.status ?? 'Agendado';
    const price = body.price ?? null;

    const data = {
      userId,
      clientId,
      clientName,
      barberId,
      barberName,
      serviceId,
      serviceName,
      time,
      date,
      status,
      price,
    };

    let appointment;
    if (id) {
      appointment = await prisma.appointment.update({ where: { id }, data });
    } else {
      appointment = await prisma.appointment.create({ data });
    }

    return NextResponse.json({
      ...appointment,
      user_id: appointment.userId,
      client_id: appointment.clientId,
      client_name: appointment.clientName,
      barber_id: appointment.barberId,
      barber_name: appointment.barberName,
      service_id: appointment.serviceId,
      service_name: appointment.serviceName,
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
    await prisma.appointment.deleteMany({
      where: { id, userId: session.user.id },
    });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
