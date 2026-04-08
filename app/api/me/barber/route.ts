import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/me/barber — retorna o Barber vinculado ao usuário logado (se for barbeiro)
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = (session.user as any).role;
  if (role !== 'Barbeiro') return NextResponse.json({ barber: null });

  const barber = await prisma.barber.findFirst({
    where: { accountId: session.user.id },
    select: {
      id: true,
      name: true,
      userId: true,
      commission: true,
      commissionType: true,
      avatar: true,
      role: true,
    },
  });

  return NextResponse.json({ barber });
}
