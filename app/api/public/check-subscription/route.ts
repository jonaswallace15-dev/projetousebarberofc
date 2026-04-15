import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const cpf = searchParams.get('cpf')?.replace(/\D/g, '');

  if (!userId || !cpf) {
    return NextResponse.json({ isSubscriber: false });
  }

  try {
    // Busca o cliente pelo CPF e userId do estabelecimento
    const client = await prisma.client.findFirst({
      where: {
        userId,
        cpfCnpj: { contains: cpf },
      },
      select: { id: true },
    });

    if (!client) {
      // Fallback: procura assinatura ativa cujos dados JSON contenham o CPF
      const subByCpf = await prisma.clientSubscription.findFirst({
        where: {
          userId,
          status: 'active',
          data: { path: ['cpfCnpj'], equals: cpf },
        },
        include: { plan: { select: { name: true } } },
      });
      if (subByCpf) {
        return NextResponse.json({ isSubscriber: true, planName: subByCpf.plan.name });
      }
      return NextResponse.json({ isSubscriber: false });
    }

    // Verifica se tem assinatura ativa
    const subscription = await prisma.clientSubscription.findFirst({
      where: {
        userId,
        clientId: client.id,
        status: 'active',
      },
      include: {
        plan: { select: { name: true } },
      },
    });

    if (!subscription) {
      return NextResponse.json({ isSubscriber: false });
    }

    return NextResponse.json({
      isSubscriber: true,
      planName: subscription.plan.name,
    });
  } catch (err: any) {
    return NextResponse.json({ isSubscriber: false });
  }
}
