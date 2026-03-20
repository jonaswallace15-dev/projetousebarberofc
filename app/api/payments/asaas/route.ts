import { NextRequest, NextResponse } from 'next/server';

const ASAAS_URL = process.env.ASAAS_URL || 'https://sandbox.asaas.com/api/v3';
const ASAAS_API_KEY = process.env.ASAAS_API_KEY || '';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action, ...data } = body;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    access_token: ASAAS_API_KEY,
  };

  if (action === 'create') {
    try {
      // 1. Criar Cliente
      const customerRes = await fetch(`${ASAAS_URL}/customers`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: data.name, phone: data.phone, notificationDisabled: true }),
      });
      const customer = await customerRes.json();
      if (customer.errors) throw new Error(customer.errors[0].description);

      // 2. Criar Pagamento
      const paymentRes = await fetch(`${ASAAS_URL}/payments`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          customer: customer.id,
          billingType: 'PIX',
          dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().split('T')[0],
          value: data.value,
          description: data.description,
        }),
      });
      const payment = await paymentRes.json();
      if (payment.errors) throw new Error(payment.errors[0].description);

      // 3. Obter QR Code Pix
      const pixRes = await fetch(`${ASAAS_URL}/payments/${payment.id}/pixQrCode`, { method: 'GET', headers });
      const pix = await pixRes.json();

      return NextResponse.json({
        id: payment.id,
        invoiceUrl: payment.invoiceUrl,
        pixQrCode: pix.encodedImage,
        pixCopyPaste: pix.payload,
        status: payment.status,
      });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  if (action === 'status') {
    try {
      const res = await fetch(`${ASAAS_URL}/payments/${data.paymentId}`, { method: 'GET', headers });
      const result = await res.json();
      return NextResponse.json({ status: result.status });
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
