import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event, data } = body;

    if (event === 'billing.paid') {
      const billing = data?.billing;
      const appointmentId = billing?.products?.[0]?.externalId;

      if (appointmentId) {
        await prisma.appointment.update({
          where: { id: appointmentId },
          data: { status: 'Confirmado' },
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    // Retorna 200 mesmo em erro para evitar reenvios desnecessários do AbacatePay
    return NextResponse.json({ received: true, error: err.message });
  }
}
