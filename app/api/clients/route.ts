import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const clients = await prisma.client.findMany({
      where: { userId: session.user.id },
      orderBy: { name: 'asc' },
    });

    const result = clients.map((c) => ({
      ...c,
      user_id: c.userId,
      cpf_cnpj: c.cpfCnpj,
      birthDate: c.birthDate,
      lastVisit: c.lastVisit,
      totalSpent: c.totalSpent,
    }));

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const {
      id,
      user_id,
      cpf_cnpj,
      birthDate,
      lastVisit,
      totalSpent,
      name,
      phone,
      email,
      instagram,
      address,
      frequency,
      tag,
      notes,
    } = body;

    const data = {
      userId: session.user.id,
      name: name ?? '',
      phone: phone ?? null,
      email: email ?? null,
      instagram: instagram ?? null,
      birthDate: birthDate ?? null,
      cpfCnpj: cpf_cnpj ?? null,
      address: address ?? null,
      lastVisit: lastVisit ?? null,
      totalSpent: totalSpent ?? null,
      frequency: frequency ?? null,
      tag: tag ?? null,
      notes: notes ?? null,
    };

    let client;
    if (id) {
      client = await prisma.client.update({
        where: { id },
        data,
      });
    } else {
      client = await prisma.client.create({ data });
    }

    return NextResponse.json({
      ...client,
      user_id: client.userId,
      cpf_cnpj: client.cpfCnpj,
      birthDate: client.birthDate,
      lastVisit: client.lastVisit,
      totalSpent: client.totalSpent,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await request.json();
    await prisma.client.deleteMany({
      where: { id, userId: session.user.id },
    });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
