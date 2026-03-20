import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const configs = await prisma.config.findMany({
      orderBy: { slug: 'asc' },
      include: {
        user: { select: { email: true } },
      },
    });

    const result = configs.map((c) => ({
      ...(c.data as object),
      id: c.id,
      user_id: c.userId,
      slug: c.slug,
      user: c.user,
    }));

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
