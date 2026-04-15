import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { creditWallet } from '@/lib/creditWallet';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const session = await auth();
  const { searchParams } = new URL(request.url);
  const publicUserId = searchParams.get('user_id');

  const userId = session?.user?.id || publicUserId;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // Se o usuário logado for barbeiro, filtra pelos agendamentos dele
    const role = (session?.user as any)?.role;
    let barberId: string | undefined;
    if (role === 'Barbeiro' && session?.user?.id) {
      const barber = await prisma.barber.findFirst({ where: { accountId: session.user.id }, select: { id: true, userId: true } });
      if (barber) { barberId = barber.id; }
    }

    const appointments = await prisma.appointment.findMany({
      where: barberId
        ? { barberId }
        : { userId },
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
    const productId = body.productId ?? body.product_id ?? null;
    const productName = body.productName ?? body.product_name ?? null;
    const time = body.time ?? null;
    const date = body.date ?? null;
    const status = body.status ?? 'Agendado';

    // Busca preço do banco pelo serviceId para evitar manipulação no frontend
    let price: number | null = null;
    if (serviceId) {
      const svc = await prisma.service.findFirst({ where: { id: serviceId, userId } });
      price = svc?.price ?? null;
    }
    // Fallback apenas para agendamentos internos do admin (sem serviceId no banco)
    if (price === null) price = typeof body.price === 'number' ? body.price : 0;

    const data = {
      userId,
      clientId,
      clientName,
      barberId,
      barberName,
      serviceId,
      serviceName,
      productId,
      productName,
      time,
      date,
      status,
      price,
    } as any;

    // Validação de conflito server-side (apenas para novos agendamentos)
    if (!id && barberId && date && time) {
      const service = serviceId ? await prisma.service.findFirst({ where: { id: serviceId, userId } }) : null;
      const newDuration = service?.duration || 30;
      const [newH, newM] = time.split(':').map(Number);
      const newStart = newH * 60 + newM;
      const newEnd = newStart + newDuration;

      const existingAppts = await prisma.appointment.findMany({
        where: { barberId, date, status: { notIn: ['Cancelado'] } },
        select: { time: true, serviceId: true },
      });

      for (const appt of existingAppts) {
        const [aH, aM] = appt.time.split(':').map(Number);
        const aStart = aH * 60 + aM;
        const aSvc = appt.serviceId ? await prisma.service.findFirst({ where: { id: appt.serviceId, userId } }) : null;
        const aEnd = aStart + (aSvc?.duration || 30);
        if (newStart < aEnd && aStart < newEnd) {
          return NextResponse.json({ error: 'Horário indisponível. Já existe um agendamento neste período.' }, { status: 409 });
        }
      }
    }

    let appointment;
    if (id) {
      appointment = await prisma.appointment.update({ where: { id }, data });
    } else {
      appointment = await prisma.appointment.create({ data });
    }

    // Auto-upsert client whenever phone is available (any status)
    const clientPhone = body.clientPhone ?? body.client_phone ?? null;
    if (clientPhone) {
      const clientEmail = body.clientEmail ?? body.client_email ?? null;
      try {
        const confirmedAppts = await prisma.appointment.findMany({
          where: { userId, clientName: clientName || '', status: 'Confirmado' },
          select: { price: true, date: true },
          orderBy: { date: 'desc' },
        });
        const totalSpent = confirmedAppts.reduce((s, a) => s + (a.price || 0), 0);
        const frequency = confirmedAppts.length;
        const lastVisit = confirmedAppts[0]?.date || date || '';
        const tag = frequency >= 5 ? 'VIP' : frequency >= 2 ? 'Recorrente' : 'Novo';
        const existing = await prisma.client.findFirst({ where: { userId, phone: clientPhone } });
        if (existing) {
          await prisma.client.update({
            where: { id: existing.id },
            data: { name: clientName || existing.name, totalSpent, frequency, tag, lastVisit, ...(clientEmail ? { email: clientEmail } : {}) },
          });
        } else {
          await prisma.client.create({
            data: { userId, name: clientName || '', phone: clientPhone, email: clientEmail || null, totalSpent, frequency, tag, lastVisit },
          });
        }
      } catch (e) { console.error('[client-upsert]', e); }
    }

    // Decrementar estoque do produto quando agendamento é confirmado (apenas na criação)
    if (status === 'Confirmado' && !id && productId) {
      try {
        const prod = await prisma.product.findFirst({ where: { id: productId, userId } });
        if (prod && prod.stock > 0) {
          await prisma.product.update({
            where: { id: productId },
            data: { stock: { decrement: 1 } },
          });
        }
      } catch (e) { console.error('[stock-decrement]', e); }
    }

    // Creditar carteira apenas quando confirmado E o cliente não for assinante
    if (status === 'Confirmado') {
      const apptPrice = appointment.price ?? body.price ?? 0;
      if (apptPrice > 0) {
        try {
          // Verifica se o cliente tem assinatura ativa — assinantes não geram crédito na carteira de PIX
          let isSubscriberClient = false;
          const phone = clientPhone ?? body.clientPhone ?? body.client_phone ?? null;
          if (phone) {
            const phoneDigits = phone.replace(/\D/g, '');
            const clientRecord = await prisma.client.findFirst({ where: { userId, phone: phoneDigits }, select: { id: true } });
            if (clientRecord) {
              const activeSub = await prisma.clientSubscription.findFirst({
                where: { userId, clientId: clientRecord.id, status: 'active' },
              });
              isSubscriberClient = !!activeSub;
            }
          }

          if (!isSubscriberClient) {
            await creditWallet(
              userId,
              apptPrice,
              appointment.id,
              `Pagamento PIX — ${appointment.serviceName} (${appointment.clientName})`,
            );
          }
        } catch (e) { console.error('[creditWallet]', e); }
      }
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
