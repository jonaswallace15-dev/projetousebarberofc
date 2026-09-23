import { NextRequest, NextResponse } from 'next/server';
import { createPixOrder, isPagarmeConfigured, pagarmeDebugInfo } from '@/lib/pagarme';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, ...data } = body;

  // ─── Criar QR Code PIX ───────────────────────────────────────────────────
  if (action === 'create') {
    if (!isPagarmeConfigured()) {
      console.error('[PIX] Pagar.me não configurado:', pagarmeDebugInfo());
      return NextResponse.json({ error: 'Gateway de pagamento não configurado' }, { status: 500 });
    }

    try {
      const { prisma } = await import('@/lib/prisma');

      if (!data.serviceId || !data.userId) {
        return NextResponse.json({ error: 'Serviço inválido' }, { status: 400 });
      }
      if (!data.taxId || data.taxId.replace(/\D/g, '').length !== 11) {
        return NextResponse.json({ error: 'CPF obrigatório para pagamento PIX' }, { status: 400 });
      }

      const svc = await prisma.service.findFirst({ where: { id: data.serviceId, userId: data.userId } });
      if (!svc) return NextResponse.json({ error: 'Serviço não encontrado' }, { status: 404 });
      if (!svc.price || svc.price <= 0) return NextResponse.json({ error: 'Serviço sem preço definido' }, { status: 400 });

      let productPrice = 0;
      if (data.productId) {
        const prod = await prisma.product.findFirst({ where: { id: data.productId, userId: data.userId } });
        if (prod) productPrice = prod.price;
      }

      const totalAmount = svc.price + productPrice;
      const cpfDigits = data.taxId.replace(/\D/g, '');

      // Split pro recipient da barbearia quando o cadastro bancário já estiver ativo
      // (Fase 3) — sem recipient ativo, cai no saldo pooled da conta principal.
      const recipient = await prisma.pagarmeRecipient.findFirst({ where: { userId: data.userId, status: 'active' } });

      console.log('[PIX] Criando cobrança | serviço:', svc.name, '| valor:', totalAmount);

      const pix = await createPixOrder({
        valueCents: Math.round(totalAmount * 100),
        description: `${svc.name} — ${data.name}`,
        customer: {
          name: data.name,
          email: data.email || `${(data.phone || '').replace(/\D/g, '')}@semmail.com`,
          phone: (data.phone || '').replace(/\D/g, '') || undefined,
          cpf: cpfDigits || undefined,
        },
        metadata: data.appointmentId ? { referenceId: `APPT|${data.appointmentId}` } : undefined,
        splitRecipientId: recipient?.pagarmeRecipientId,
      });

      console.log('[PIX] Cobrança criada | orderId:', pix.orderId, '| status:', pix.status);

      return NextResponse.json({
        id: data.appointmentId || pix.orderId,
        pagarmeOrderId: pix.orderId,
        status: pix.status,
        brCode: pix.pix?.qrCode || null,
        pixQrCode: pix.pix?.qrCodeUrl || null,
      });
    } catch (err: any) {
      console.error('[PIX CREATE ERROR]', err.message);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  // ─── Checar status via DB (billingId = appointmentId) ────────────────────
  if (action === 'status') {
    try {
      const { prisma } = await import('@/lib/prisma');
      const appt = await prisma.appointment.findUnique({
        where: { id: data.billingId },
        select: { status: true },
      });
      const isPaid = appt?.status === 'Confirmado';
      return NextResponse.json({ status: isPaid ? 'PAID' : 'PENDING' });
    } catch (err: any) {
      console.error('[PIX STATUS ERROR]', err.message);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  // ─── Simular assinatura de plano (DB only — apenas dev) ──────────────────
  if (action === 'billing-simulate') {
    if (process.env.NODE_ENV === 'production')
      return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
    try {
      const { planId, userId, clientName, clientPhone, clientEmail } = data;
      const { prisma } = await import('@/lib/prisma');

      let client = await prisma.client.findFirst({ where: { userId, phone: clientPhone.replace(/\D/g, '') } });
      if (!client) {
        client = await prisma.client.create({
          data: {
            userId,
            name: clientName,
            phone: clientPhone.replace(/\D/g, ''),
            email: clientEmail || null,
            totalSpent: 0,
            frequency: 0,
            tag: 'Novo',
            lastVisit: new Date().toISOString().split('T')[0],
          },
        });
      }

      const existing = await prisma.clientSubscription.findFirst({ where: { userId, clientId: client.id, planId } });
      if (!existing) {
        await prisma.clientSubscription.create({
          data: { userId, clientId: client.id, planId, data: { simulatedAt: new Date().toISOString() } },
        });
        await prisma.subscriptionPlan.update({ where: { id: planId }, data: { activeUsers: { increment: 1 } } });
      }

      return NextResponse.json({ status: 'PAID' });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
