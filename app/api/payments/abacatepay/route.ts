import { NextRequest, NextResponse } from 'next/server';

const ABACATEPAY_URL = process.env.ABACATEPAY_URL || 'https://api.abacatepay.com/v1';
const ABACATEPAY_API_KEY = process.env.ABACATEPAY_API_KEY;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, ...data } = body;

  if (!ABACATEPAY_API_KEY) {
    return NextResponse.json({ error: 'AbacatePay API key não configurada' }, { status: 500 });
  }

  // Criar QR Code PIX
  if (action === 'create') {
    try {
      const response = await fetch(`${ABACATEPAY_URL}/pixQrCode/create`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ABACATEPAY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.round(data.value * 100),
          expiresIn: 3600,
          description: data.description,
          customer: {
            name: data.name,
            cellphone: data.phone,
            email: data.email,
            taxId: data.taxId || '',
          },
          metadata: {
            externalId: data.externalId,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        return NextResponse.json({ error: result.error || 'Erro na API AbacatePay' }, { status: 400 });
      }

      const pix = result.data;
      return NextResponse.json({
        id: pix.id,
        status: pix.status,
        brCode: pix.brCode || null,
        pixQrCode: pix.brCodeBase64 || null,
      });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  // Checar status — GET /pixQrCode/check?id=
  if (action === 'status') {
    try {
      const res = await fetch(`${ABACATEPAY_URL}/pixQrCode/check?id=${data.billingId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${ABACATEPAY_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      const result = await res.json();
      return NextResponse.json({ status: result.data?.status || null });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  // Simular pagamento (Dev Mode apenas)
  if (action === 'simulate') {
    try {
      const res = await fetch(`${ABACATEPAY_URL}/pixQrCode/simulate-payment?id=${data.billingId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ABACATEPAY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ metadata: {} }),
      });
      const result = await res.json();
      // simulate-payment retorna diretamente status: "PAID" em result.data.status
      return NextResponse.json({ status: result.data?.status || null });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  // Simular assinatura de plano (Dev Mode apenas)
  if (action === 'billing-simulate') {
    if (process.env.NODE_ENV === 'production')
      return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
    try {
      const { planId, userId, clientName, clientPhone, clientEmail } = data;
      const { prisma } = await import('@/lib/prisma');

      // Find or create client
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
      console.error('[billing-simulate]', err);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  // Checar status de billing (cartão)
  if (action === 'billing-status') {
    try {
      const res = await fetch(`${ABACATEPAY_URL}/billing/get?id=${data.billingId}`, {
        headers: { Authorization: `Bearer ${ABACATEPAY_API_KEY}` },
      });
      const result = await res.json();
      const status = result.data?.status || null;
      return NextResponse.json({ status });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  // Criar cobrança recorrente via Checkout (planos de assinatura)
  if (action === 'plan-billing') {
    try {
      const { planId, planName, planPrice, userId, clientName, clientPhone, clientEmail, clientTaxId, origin } = data;
      const baseUrl = origin || process.env.NEXT_PUBLIC_BASE_URL || 'https://usebarber.com.br';

      const response = await fetch(`${ABACATEPAY_URL}/billing/create`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ABACATEPAY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          frequency: 'MULTIPLE_PAYMENTS',
          methods: ['CARD'],
          products: [{
            externalId: planId,
            name: planName,
            description: `Assinatura mensal — ${planName}`,
            quantity: 1,
            price: Math.round(planPrice * 100),
          }],
          returnUrl: `${baseUrl}/plano/${planId}`,
          completionUrl: `${baseUrl}/plano/${planId}?pago=1`,
          customer: {
            name: clientName,
            cellphone: clientPhone.replace(/\D/g, ''),
            email: clientEmail || `${clientPhone.replace(/\D/g, '')}@semmail.com`,
            taxId: clientTaxId?.replace(/\D/g, '') || '',
          },
          metadata: {
            type: 'plan_subscription',
            planId,
            userId,
            clientName,
            clientPhone: clientPhone.replace(/\D/g, ''),
            clientEmail: clientEmail || '',
          },
        }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        return NextResponse.json({ error: result.error || 'Erro ao criar cobrança' }, { status: 400 });
      }

      const billing = result.data;
      return NextResponse.json({ id: billing.id, url: billing.url });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
