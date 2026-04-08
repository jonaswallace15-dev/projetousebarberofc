import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// POST /api/invite — gera token de convite para um barbeiro
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { barberId } = await request.json();
  if (!barberId) return NextResponse.json({ error: 'barberId obrigatório' }, { status: 400 });

  // Verifica que o barbeiro pertence ao proprietário logado
  const barber = await prisma.barber.findFirst({
    where: { id: barberId, userId: session.user.id },
  });
  if (!barber) return NextResponse.json({ error: 'Barbeiro não encontrado' }, { status: 404 });

  // Invalida tokens anteriores para este barbeiro
  await prisma.inviteToken.deleteMany({ where: { barberId } });

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias

  await prisma.inviteToken.create({
    data: { token, barberId, userId: session.user.id, expiresAt },
  });

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  return NextResponse.json({ url: `${baseUrl}/convite/${token}` });
}

// GET /api/invite?token=xxx — valida o token e retorna dados do barbeiro
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'Token inválido' }, { status: 400 });

  try {
    const invite = await prisma.inviteToken.findUnique({ where: { token } });

    if (!invite) return NextResponse.json({ error: 'Convite inválido' }, { status: 404 });
    if (invite.usedAt) return NextResponse.json({ error: 'Convite já utilizado' }, { status: 400 });
    if (invite.expiresAt < new Date()) return NextResponse.json({ error: 'Convite expirado' }, { status: 400 });

    const barber = await prisma.barber.findUnique({
      where: { id: invite.barberId },
      select: { id: true, name: true, userId: true },
    });
    if (!barber) return NextResponse.json({ error: 'Barbeiro não encontrado' }, { status: 404 });

    return NextResponse.json({
      barberId: barber.id,
      barberName: barber.name,
      ownerId: barber.userId,
    });
  } catch (err: any) {
    console.error('[invite GET]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
