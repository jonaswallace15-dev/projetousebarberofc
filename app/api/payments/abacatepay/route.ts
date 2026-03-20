import { NextRequest, NextResponse } from 'next/server';

const ABACATEPAY_URL = process.env.ABACATEPAY_URL || 'https://api.abacatepay.com/v1';
const ABACATEPAY_API_KEY = process.env.ABACATEPAY_API_KEY;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, ...data } = body;

  if (!ABACATEPAY_API_KEY) {
    return NextResponse.json({ error: 'AbacatePay API key não configurada' }, { status: 500 });
  }

  if (action === 'create') {
    try {
      const origin = request.headers.get('origin') || 'https://usebarber.com.br';
      const options = {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ABACATEPAY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          frequency: 'ONE_TIME',
          methods: ['PIX'],
          products: [
            {
              externalId: data.externalId,
              name: data.description,
              description: 'Agendamento Profissional',
              quantity: 1,
              price: Math.round(data.value * 100),
            },
          ],
          returnUrl: `${origin}/agendamento/confirmado`,
          completionUrl: `${origin}/agendamento/finalizado`,
          customer: {
            name: data.name,
            cellphone: data.phone,
            email: data.email,
            taxId: '',
          },
          externalId: data.externalId,
        }),
      };

      const response = await fetch(`${ABACATEPAY_URL}/billing/create`, options);
      const result = await response.json();

      if (!response.ok || result.error || result.errors) {
        return NextResponse.json({ error: result.error || result.errors?.[0]?.message || 'Erro na API AbacatePay' }, { status: 400 });
      }

      const billing = result.data?.billing || result.data || result;
      return NextResponse.json({
        id: billing.id,
        url: billing.url || billing.checkoutUrl,
        status: billing.status,
      });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  if (action === 'status') {
    try {
      const res = await fetch(`${ABACATEPAY_URL}/billing/${data.billingId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${ABACATEPAY_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });
      const result = await res.json();
      const billing = result.data || result;
      return NextResponse.json({ status: billing.status });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
