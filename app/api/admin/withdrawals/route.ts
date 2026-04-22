import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

const ASAAS_URL = process.env.ASAAS_URL || 'https://api.asaas.com/v3';
const ASAAS_API_KEY = process.env.ASAAS_API_KEY
  ? (process.env.ASAAS_API_KEY.startsWith('$') ? process.env.ASAAS_API_KEY : `$${process.env.ASAAS_API_KEY}`)
  : undefined;

function detectPixKeyType(key: string): string {
  const digits = key.replace(/\D/g, '');
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key)) return 'EMAIL';
  if (digits.length === 11 && !key.includes('-') === false || (digits.length === 11 && /^\d+$/.test(digits))) return 'CPF';
  if (digits.length === 14) return 'CNPJ';
  if (key.startsWith('+') || (digits.length >= 10 && digits.length <= 11)) return 'PHONE';
  return 'EVP'; // chave aleatória
}

async function asaasJsonSafe(res: Response): Promise<any> {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { _raw: text.slice(0, 300), errors: [{ description: `Resposta inválida do Asaas (status ${res.status})` }] }; }
}

async function getAsaasBalance(): Promise<number> {
  if (!ASAAS_API_KEY) return 0;
  try {
    const res = await fetch(`${ASAAS_URL}/finance/balance`, {
      headers: { 'access_token': ASAAS_API_KEY },
      signal: AbortSignal.timeout(8000),
    });
    const data = await asaasJsonSafe(res);
    console.log('[Asaas Balance]', data);
    return typeof data.balance === 'number' ? data.balance : 0;
  } catch (e: any) {
    console.error('[Asaas Balance Error]', e.message);
    return 0;
  }
}

async function sendPixViaAsaas(pixKey: string, amount: number, description: string): Promise<{ success: boolean; transferId?: string; error?: string }> {
  if (!ASAAS_API_KEY) return { success: false, error: 'Asaas API key não configurada' };

  const cleanKey = pixKey.trim();
  if (!cleanKey || cleanKey.toLowerCase() === 'a definir pelo admin') {
    return { success: false, error: 'Chave PIX não definida pelo barbeiro' };
  }

  const pixAddressKeyType = detectPixKeyType(cleanKey);
  const pixAddressKey = pixAddressKeyType === 'CPF' || pixAddressKeyType === 'CNPJ' || pixAddressKeyType === 'PHONE'
    ? cleanKey.replace(/\D/g, '')
    : cleanKey;

  try {
    const res = await fetch(`${ASAAS_URL}/transfers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY,
      },
      body: JSON.stringify({ operationType: 'PIX', value: amount, pixAddressKey, pixAddressKeyType, description }),
      signal: AbortSignal.timeout(8000),
    });

    const data = await asaasJsonSafe(res);
    console.log('[Asaas Transfer] status:', res.status, 'body:', JSON.stringify(data));

    if (!res.ok || data.errors?.length) {
      const msg = data.errors?.[0]?.description || data.error || `Erro Asaas status ${res.status}`;
      return { success: false, error: msg };
    }

    return { success: true, transferId: data.id };
  } catch (e: any) {
    return { success: false, error: e.message || 'Timeout ou erro de conexão com Asaas' };
  }
}

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

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    if (action === 'approve') {
      const withdrawal = await prisma.withdrawal.findUnique({ where: { id } });
      if (!withdrawal) return NextResponse.json({ error: 'Saque não encontrado' }, { status: 404 });
      if (withdrawal.status !== 'Pendente') return NextResponse.json({ error: 'Saque já processado' }, { status: 400 });

      // Aprova imediatamente no banco para não bloquear a resposta
      const updated = await prisma.withdrawal.update({
        where: { id },
        data: {
          status: 'Aprovado',
          processedAt: new Date(),
          notes: 'Aprovado — transferência PIX em processamento...',
        },
      });

      // Tenta enviar PIX via Asaas em background (sem bloquear a resposta)
      const withdrawalId = withdrawal.id;
      const pixKey = withdrawal.pixKey;
      const amount = withdrawal.amount;

      Promise.resolve().then(async () => {
        try {
          const availableBalance = await getAsaasBalance();
          const actualAmount = Math.min(amount, Math.floor(availableBalance * 100) / 100);

          if (actualAmount < 0.01) {
            await prisma.withdrawal.update({
              where: { id: withdrawalId },
              data: { notes: `Saldo insuficiente no Asaas: R$ ${availableBalance.toFixed(2)} disponível — envie o PIX manualmente.` },
            });
            return;
          }

          const transfer = await sendPixViaAsaas(pixKey, actualAmount, `Saque UseBarber — ID ${withdrawalId}`);

          await prisma.withdrawal.update({
            where: { id: withdrawalId },
            data: {
              notes: transfer.success
                ? `PIX enviado via Asaas — ID: ${transfer.transferId} | R$${actualAmount.toFixed(2)}`
                : `Erro ao enviar PIX: ${transfer.error} — envie manualmente a chave: ${pixKey}`,
            },
          });
        } catch (e: any) {
          console.error('[pix-background]', e.message);
          await prisma.withdrawal.update({
            where: { id: withdrawalId },
            data: { notes: `Erro no processamento PIX: ${e.message} — envie manualmente a chave: ${pixKey}` },
          }).catch(() => {});
        }
      });

      return NextResponse.json(updated);
    }

    // Rejeitar — estorna saldo na carteira do barbeiro
    const toReject = await prisma.withdrawal.findUnique({
      where: { id },
      select: { status: true, amount: true, walletId: true, userId: true },
    });
    if (!toReject) return NextResponse.json({ error: 'Saque não encontrado' }, { status: 404 });
    if (toReject.status === 'Rejeitado') return NextResponse.json({ error: 'Saque já rejeitado' }, { status: 400 });

    const updated = await prisma.$transaction(async (tx) => {
      // Só estorna se ainda não tinha sido aprovado (Pendente) ou se aprovado mas PIX não enviado
      if (toReject.status === 'Pendente' || toReject.status === 'Aprovado') {
        await tx.wallet.update({
          where: { id: toReject.walletId },
          data: { balance: { increment: toReject.amount } },
        });
        await tx.walletTransaction.create({
          data: {
            userId: toReject.userId,
            walletId: toReject.walletId,
            amount: toReject.amount,
            type: 'credit',
            method: 'pix',
            description: `Estorno de saque rejeitado${notes ? ` — ${notes}` : ''}`,
            category: 'estorno',
          },
        });
      }

      return tx.withdrawal.update({
        where: { id },
        data: {
          status: 'Rejeitado',
          processedAt: new Date(),
          ...(notes ? { notes } : {}),
        },
      });
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
