import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createRecipient, getRecipient, sanitizeGatewayErrorMessage } from '@/lib/pagarme';
import { NextRequest, NextResponse } from 'next/server';

// Cadastro bancário/KYC da barbearia no Pagar.me (Recipient) — necessário pra
// receber split nas cobranças e sacar de verdade (Fase 3 da migração Pagar.me).
// Ver PagarmeRecipient no schema.prisma e lib/pagarme.ts (createRecipient).

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const recipient = await prisma.pagarmeRecipient.findUnique({ where: { userId: session.user.id } });
  if (!recipient) return NextResponse.json({ recipient: null });

  // Atualiza o status com o que a Stone tiver de mais recente (KYC pode mudar assíncrono)
  if (recipient.pagarmeRecipientId && recipient.status !== 'active') {
    try {
      const remote = await getRecipient(recipient.pagarmeRecipientId);
      if (remote.status && remote.status !== recipient.status) {
        await prisma.pagarmeRecipient.update({ where: { id: recipient.id }, data: { status: remote.status } });
        recipient.status = remote.status;
      }
    } catch (e) { console.error('[pagarme-recipient-refresh]', e); }
  }

  return NextResponse.json({
    recipient: {
      status: recipient.status,
      holderType: recipient.holderType,
      document: recipient.document,
      legalName: recipient.legalName,
      bankAccount: recipient.bankAccount,
      lastError: recipient.lastError,
    },
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const {
      holderType, document, legalName, email, phoneDdd, phoneNumber,
      birthdate, motherName, monthlyIncome, professionalOccupation,
      address, bankAccount,
    } = body;

    if (!holderType || !document || !legalName || !email || !phoneDdd || !phoneNumber || !address || !bankAccount) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }
    if (holderType === 'individual' && (!birthdate || !motherName || !monthlyIncome)) {
      return NextResponse.json({ error: 'Data de nascimento, nome da mãe e renda mensal são obrigatórios para pessoa física' }, { status: 400 });
    }

    const documentDigits = String(document).replace(/\D/g, '');
    const existing = await prisma.pagarmeRecipient.findUnique({ where: { userId: session.user.id } });

    let created;
    try {
      created = await createRecipient({
        code: `barbearia-${session.user.id}`,
        holderType,
        document: documentDigits,
        legalName,
        email,
        phoneDdd: String(phoneDdd).replace(/\D/g, ''),
        phoneNumber: String(phoneNumber).replace(/\D/g, ''),
        birthdate,
        motherName,
        monthlyIncome: monthlyIncome ? Math.round(Number(monthlyIncome) * 100) : undefined,
        professionalOccupation,
        address: {
          street: address.street,
          streetNumber: address.streetNumber,
          neighborhood: address.neighborhood,
          city: address.city,
          state: address.state,
          zipCode: address.zipCode,
          complementary: address.complementary,
          referencePoint: address.referencePoint,
        },
        bankAccount: {
          bank: bankAccount.bank,
          branchNumber: bankAccount.branchNumber,
          accountNumber: bankAccount.accountNumber,
          accountCheckDigit: bankAccount.accountCheckDigit,
          accountType: bankAccount.accountType,
        },
      });
    } catch (err: any) {
      const isMarketplaceDisabled = /company/i.test(err.message || '');
      const friendlyError = isMarketplaceDisabled
        ? 'Seu cadastro bancário ainda não pode ser processado. Entre em contato com o suporte para liberar essa função.'
        : sanitizeGatewayErrorMessage(err.message) || 'Erro ao cadastrar recebedor';

      const saved = existing
        ? await prisma.pagarmeRecipient.update({ where: { id: existing.id }, data: { status: 'error', lastError: friendlyError } })
        : await prisma.pagarmeRecipient.create({
            data: {
              userId: session.user.id,
              status: 'error',
              holderType,
              document: documentDigits,
              legalName,
              registrationData: body,
              bankAccount,
              lastError: friendlyError,
            },
          });
      return NextResponse.json({ error: friendlyError, recipient: { status: saved.status, lastError: saved.lastError } }, { status: 422 });
    }

    const data = {
      userId: session.user.id,
      pagarmeRecipientId: created.id,
      status: created.status || 'pending',
      holderType,
      document: documentDigits,
      legalName,
      registrationData: body,
      bankAccount,
      lastError: null,
    };

    const saved = existing
      ? await prisma.pagarmeRecipient.update({ where: { id: existing.id }, data })
      : await prisma.pagarmeRecipient.create({ data });

    return NextResponse.json({ recipient: { status: saved.status, holderType: saved.holderType, document: saved.document, legalName: saved.legalName } });
  } catch (err: any) {
    return NextResponse.json({ error: sanitizeGatewayErrorMessage(err.message) }, { status: 500 });
  }
}
