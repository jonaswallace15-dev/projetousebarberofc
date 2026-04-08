import { NextRequest, NextResponse } from 'next/server';

const ASAAS_URL = process.env.ASAAS_URL || 'https://api-sandbox.asaas.com/v3';
const ASAAS_API_KEY = process.env.ASAAS_API_KEY
  ? (process.env.ASAAS_API_KEY.startsWith('$') ? process.env.ASAAS_API_KEY : `$${process.env.ASAAS_API_KEY}`)
  : undefined;

function asaasHeaders() {
  return {
    'Content-Type': 'application/json',
    'access_token': ASAAS_API_KEY || '',
  };
}

// Retorna due date de amanhã no formato YYYY-MM-DD
function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

async function asaasJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Gateway retornou resposta inválida (${res.status}): ${text.slice(0, 200)}`);
  }
}

// Cria ou reutiliza cliente no Asaas pelo CPF
async function findOrCreateCustomer(name: string, cpfCnpj: string, email: string, phone: string): Promise<string> {
  const digits = cpfCnpj.replace(/\D/g, '');

  // Tenta buscar cliente existente pelo CPF
  const search = await fetch(`${ASAAS_URL}/customers?cpfCnpj=${digits}`, {
    headers: asaasHeaders(),
  });
  const searchData = await asaasJson(search);
  if (searchData.data?.length > 0) return searchData.data[0].id;

  // Cria novo cliente
  const create = await fetch(`${ASAAS_URL}/customers`, {
    method: 'POST',
    headers: asaasHeaders(),
    body: JSON.stringify({
      name,
      cpfCnpj: digits,
      email: email || undefined,
      phone: phone || undefined,
    }),
  });
  const created = await asaasJson(create);
  if (!create.ok || created.errors?.length) {
    throw new Error(created.errors?.[0]?.description || 'Erro ao criar cliente no gateway');
  }
  return created.id;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, ...data } = body;

  if (!ASAAS_API_KEY) {
    return NextResponse.json({ error: 'Gateway de pagamento não configurado' }, { status: 500 });
  }

  // ─── Criar QR Code PIX ───────────────────────────────────────────────────
  if (action === 'create') {
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
      let productName = '';
      if (data.productId) {
        const prod = await prisma.product.findFirst({ where: { id: data.productId, userId: data.userId } });
        if (prod) { productPrice = prod.price; productName = prod.name; }
      }

      const totalAmount = svc.price + productPrice;
      const description = productName ? `${svc.name} + ${productName}` : svc.name;

      // Cria/reutiliza cliente no Asaas
      const customerId = await findOrCreateCustomer(
        data.name,
        data.taxId,
        data.email || `${data.phone}@semmail.com`,
        data.phone || '',
      );

      // Cria cobrança PIX
      const paymentRes = await fetch(`${ASAAS_URL}/payments`, {
        method: 'POST',
        headers: asaasHeaders(),
        body: JSON.stringify({
          customer: customerId,
          billingType: 'PIX',
          value: totalAmount,
          dueDate: tomorrow(),
          description,
          ...(data.appointmentId ? { externalReference: data.appointmentId } : {}),
        }),
      });
      const payment = await asaasJson(paymentRes);

      if (!paymentRes.ok || payment.errors?.length) {
        const msg = payment.errors?.[0]?.description || 'Erro ao gerar cobrança';
        return NextResponse.json({ error: msg }, { status: 400 });
      }

      // Busca QR Code PIX
      const qrRes = await fetch(`${ASAAS_URL}/payments/${payment.id}/pixQrCode`, {
        headers: asaasHeaders(),
      });
      const qrData = await asaasJson(qrRes);

      return NextResponse.json({
        id: payment.id,
        status: payment.status,
        brCode: qrData.payload || null,
        pixQrCode: qrData.encodedImage || null,
      });
    } catch (err: any) {
      console.error('[PIX CREATE ERROR]', err.message);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  // ─── Checar status ────────────────────────────────────────────────────────
  if (action === 'status') {
    try {
      const res = await fetch(`${ASAAS_URL}/payments/${data.billingId}`, {
        headers: asaasHeaders(),
      });
      const result = await asaasJson(res);
      // Asaas: RECEIVED ou CONFIRMED = pago
      const raw = result.status || null;
      const normalized = ['RECEIVED', 'CONFIRMED'].includes(raw) ? 'PAID' : raw;
      return NextResponse.json({ status: normalized });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  // ─── Simular pagamento (sandbox only) ────────────────────────────────────
  if (action === 'simulate') {
    try {
      const res = await fetch(`${ASAAS_URL}/payments/${data.billingId}/simulate`, {
        method: 'POST',
        headers: asaasHeaders(),
      });

      let result: any = {};
      try { result = await res.json(); } catch { /* resposta não-JSON */ }

      if (!res.ok) {
        const msg = result?.errors?.[0]?.description || 'Simulação indisponível neste ambiente';
        return NextResponse.json({ error: msg }, { status: 400 });
      }

      return NextResponse.json({ status: 'PAID' });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  // ─── Simular assinatura de plano (DB only) ────────────────────────────────
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
