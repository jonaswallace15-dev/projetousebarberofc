import { auth } from '@/lib/auth';
import { getBillingStatus } from '@/lib/billing';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = (session.user as any).role || 'Proprietário';
  const status = await getBillingStatus(session.user.id, role);
  return NextResponse.json(status);
}
