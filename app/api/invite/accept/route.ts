import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

// POST /api/invite/accept — barbeiro cria senha e se vincula
export async function POST(request: NextRequest) {
  const { token, password, email } = await request.json();

  if (!token || !password || !email) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  if (password.length < 6) return NextResponse.json({ error: 'Senha deve ter mínimo 6 caracteres' }, { status: 400 });

  const invite = await prisma.inviteToken.findUnique({ where: { token } });

  if (!invite) return NextResponse.json({ error: 'Convite inválido' }, { status: 404 });
  if (invite.usedAt) return NextResponse.json({ error: 'Convite já utilizado' }, { status: 400 });
  if (invite.expiresAt < new Date()) return NextResponse.json({ error: 'Convite expirado' }, { status: 400 });

  const barber = await prisma.barber.findUnique({ where: { id: invite.barberId } });
  if (!barber) return NextResponse.json({ error: 'Barbeiro não encontrado' }, { status: 404 });

  // Verifica se já existe conta para este barbeiro
  if (barber.accountId) {
    return NextResponse.json({ error: 'Este barbeiro já possui uma conta' }, { status: 400 });
  }

  const hashed = await bcrypt.hash(password, 10);

  // Verifica se o email já está em uso
  const emailInUse = await prisma.user.findUnique({ where: { email } });
  if (emailInUse) return NextResponse.json({ error: 'Este e-mail já está cadastrado.' }, { status: 400 });

  let userAccount = await prisma.user.findUnique({ where: { email } });
  if (!userAccount) {
    userAccount = await prisma.user.create({
      data: { email, password: hashed, name: barber.name, role: 'Barbeiro' },
    });
  }

  // Vincula o User ao Barber
  await prisma.barber.update({
    where: { id: barber.id },
    data: { accountId: userAccount.id },
  });

  // Marca convite como usado
  await prisma.inviteToken.update({
    where: { token },
    data: { usedAt: new Date() },
  });

  return NextResponse.json({ success: true, email });
}
