import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// Rota pública - sem autenticação
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug) return NextResponse.json({ error: 'Slug required' }, { status: 400 });

  try {
    const config = await prisma.config.findFirst({
      where: { slug },
      select: { userId: true },
    });

    return NextResponse.json({ user_id: config?.userId ?? null });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
