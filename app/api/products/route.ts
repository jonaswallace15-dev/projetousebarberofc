import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const session = await auth();
  const { searchParams } = new URL(request.url);
  const publicUserId = searchParams.get('user_id');

  const userId = session?.user?.id || publicUserId;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const products = await prisma.product.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });

    const result = products.map((p) => ({
      ...p,
      user_id: p.userId,
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
    const { id, user_id, name, price, stock, image, active } = body;

    const data = {
      userId: session.user.id,
      name: name ?? '',
      price: price ?? 0,
      stock: stock ?? 0,
      image: image ?? null,
      active: active !== undefined ? active : true,
    };

    let product;
    if (id) {
      product = await prisma.product.update({ where: { id }, data });
    } else {
      product = await prisma.product.create({ data });
    }

    return NextResponse.json({ ...product, user_id: product.userId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await request.json();
    await prisma.product.deleteMany({
      where: { id, userId: session.user.id },
    });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
