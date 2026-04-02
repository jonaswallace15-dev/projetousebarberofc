import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const planId = request.nextUrl.searchParams.get('planId');
  if (!planId) return NextResponse.json({ error: 'planId required' }, { status: 400 });

  const plan = await prisma.subscriptionPlan.findUnique({
    where: { id: planId },
    include: { user: { include: { config: { select: { data: true } } } } },
  });

  if (!plan) return NextResponse.json({ error: 'Plano não encontrado' }, { status: 404 });

  const configData = (plan.user?.config?.data as any) || {};

  return NextResponse.json({
    id: plan.id,
    name: plan.name,
    price: plan.price,
    benefits: plan.benefits,
    activeUsers: plan.activeUsers,
    userId: plan.userId,
    barbershopName: configData.name || 'Barbearia',
    barbershopLogo: configData.logo_url || configData.logoUrl || null,
  });
}
