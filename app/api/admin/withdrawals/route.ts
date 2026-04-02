import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== 'Super Admin')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const withdrawals = await prisma.withdrawal.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        wallet: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
      },
    });

    return NextResponse.json(withdrawals);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== 'Super Admin')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id, action, notes } = await request.json();

    let status: string;
    if (action === 'approve') {
      status = 'Aprovado';
    } else if (action === 'reject') {
      status = 'Rejeitado';
    } else {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    const updateData: any = {
      status,
      processedAt: new Date(),
    };
    if (action === 'reject' && notes) {
      updateData.notes = notes;
    }

    const withdrawal = await prisma.withdrawal.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(withdrawal);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
