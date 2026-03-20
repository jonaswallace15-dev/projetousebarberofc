import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const barbers = await prisma.barber.findMany({
      orderBy: { name: 'asc' },
      include: {
        user: { select: { email: true } },
      },
    });

    const result = barbers.map((b) => ({
      ...b,
      user_id: b.userId,
      commissionType: b.commissionType,
    }));

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
