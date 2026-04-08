import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const slug = request.nextUrl.searchParams.get('slug');
  if (!slug) return NextResponse.json({ available: false });

  const existing = await prisma.config.findFirst({
    where: {
      slug,
      NOT: { userId: session.user.id },
    },
  });

  return NextResponse.json({ available: !existing });
}
