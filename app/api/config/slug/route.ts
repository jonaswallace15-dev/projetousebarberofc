import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// Rota pública - sem autenticação - retorna config completa incluindo logo e banner
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug) return NextResponse.json({ error: 'Slug required' }, { status: 400 });

  try {
    const config = await prisma.config.findFirst({
      where: { slug },
      select: { userId: true, data: true, slug: true },
    });

    if (!config) return NextResponse.json({ user_id: null });

    return NextResponse.json({
      user_id: config.userId,
      slug: config.slug,
      ...(config.data as object),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
