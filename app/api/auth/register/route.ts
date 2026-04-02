import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const { email, password, name, role, barbershopName, phone } = await request.json();

  if (!email || !password || !name) {
    return NextResponse.json({ error: 'email, password e name são obrigatórios' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'A senha deve ter no mínimo 6 caracteres' }, { status: 400 });
  }

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return NextResponse.json({ error: 'already registered' }, { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const userRole = role === 'Proprietário' ? 'Proprietário' : 'Barbeiro';

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      role: userRole,
      barbers: {
        create: {
          name,
          role: userRole === 'Proprietário' ? 'Dono / Master' : 'Barbeiro',
          commission: userRole === 'Proprietário' ? 100 : 50,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2563eb&color=fff`,
        },
      },
      ...(userRole === 'Proprietário' && barbershopName
        ? {
            config: {
              create: {
                slug: barbershopName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now(),
                data: { name: barbershopName, phone: phone ?? '' },
              },
            },
          }
        : {}),
    },
  });

  return NextResponse.json({ id: user.id, email: user.email });
}
