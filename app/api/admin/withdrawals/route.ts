import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

const ASAAS_URL = process.env.ASAAS_URL || 'https://api-sandbox.asaas.com/v3';
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

async function getAsaasBalance(): Promise<number> {
  if (!ASAAS_API_KEY) return 0;
  const res = await fetch(`${ASAAS_URL}/finance/balance`, {
    headers: { 'access_token': ASAAS_API_KEY },
  });
  const data = await res.json();
  console.log('[Asaas Balance]', data);
  return data.balance ?? 0;
}

async function sendPixViaAsaas(pixKey: string, amount: number, description: string): Promise<{ success: boolean; transferId?: string; error?: string; actualAmount?: number }> {
  if (!ASAAS_API_KEY) return { success: false, error: 'Asaas API key não configurada' };

  const pixAddressKeyType = detectPixKeyType(pixKey.trim());
  const pixAddressKey = pixAddressKeyType === 'CPF' || pixAddressKeyType === 'CNPJ' || pixAddressKeyType === 'PHONE'
    ? pixKey.replace(/\D/g, '')
    : pixKey.trim();

  const res = await fetch(`${ASAAS_URL}/transfers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'access_token': ASAAS_API_KEY,
    },
    body: JSON.stringify({
      value: amount,
      pixAddressKey,
      pixAddressKeyType,
      description,
    }),
  });

  const data = await res.json();
  console.log('[Asaas Transfer] status:', res.status, 'body:', JSON.stringify(data));

  if (!res.ok || data.errors?.length) {
    const msg = data.errors?.[0]?.description || data.error || 'Erro ao transferir via Asaas';
    return { success: false, error: msg };
  }

  return { success: true, transferId: data.id };
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

      // Usa o saldo disponível no Asaas (após taxas), limitado ao valor solicitado
      const availableBalance = await getAsaasBalance();
      const actualAmount = Math.min(withdrawal.amount, Math.floor(availableBalance * 100) / 100);

      if (actualAmount < 0.01) {
        return NextResponse.json({ error: `Saldo insuficiente no Asaas: R$ ${availableBalance.toFixed(2)} disponível.` }, { status: 400 });
      }

      // Envia PIX via Asaas com o valor real disponível
      const transfer = await sendPixViaAsaas(
        withdrawal.pixKey,
        actualAmount,
        `Saque UseBarber — ID ${withdrawal.id}`,
      );

      if (!transfer.success) {
        return NextResponse.json({ error: `Falha ao enviar PIX: ${transfer.error}` }, { status: 502 });
      }

      const updated = await prisma.withdrawal.update({
        where: { id },
        data: {
          status: 'Aprovado',
          processedAt: new Date(),
          notes: `Asaas transfer ID: ${transfer.transferId} | Solicitado: R$${withdrawal.amount.toFixed(2)} | Enviado: R$${actualAmount.toFixed(2)} (após taxas Asaas)`,
        },
      });

      return NextResponse.json(updated);
    }

    // Rejeitar
    const updated = await prisma.withdrawal.update({
      where: { id },
      data: {
        status: 'Rejeitado',
        processedAt: new Date(),
        ...(notes ? { notes } : {}),
      },
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
