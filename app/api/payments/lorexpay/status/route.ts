import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/payments/lorexpay/status?clientSubscriptionId=xxx
// Retorna o status da ClientSubscription para polling na página de checkout
export async function GET(request: NextRequest) {
  const clientSubscriptionId = request.nextUrl.searchParams.get('clientSubscriptionId');
  if (!clientSubscriptionId) {
    return NextResponse.json({ error: 'clientSubscriptionId obrigatório' }, { status: 400 });
  }

  try {
    const sub = await prisma.clientSubscription.findUnique({
      where: { id: clientSubscriptionId },
      select: { status: true },
    });
    return NextResponse.json({ status: sub?.status || 'not_found' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
