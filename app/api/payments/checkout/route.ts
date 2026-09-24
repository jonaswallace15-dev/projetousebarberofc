import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createPixOrder, createCardSubscription, cancelSubscription as cancelPagarmeSubscription, sanitizeGatewayErrorMessage } from '@/lib/pagarme';
import { PLATFORM_PLANS, isPlatformPlanId } from '@/lib/platformPlans';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // ── Checkout PIX via Pagar.me ──────────────────────────────────────────
    if (action === 'create-pagarme-pix-checkout') {
      const { planId, clientName, clientEmail, clientPhone, clientCpf } = body;
      const cpfDigits = (clientCpf || '').replace(/\D/g, '');

      if (!clientCpf || cpfDigits.length !== 11) {
        return NextResponse.json({ error: 'CPF inválido' }, { status: 400 });
      }

      const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
      if (!plan) return NextResponse.json({ error: 'Plano não encontrado' }, { status: 404 });

      const phoneDigits = (clientPhone || '').replace(/\D/g, '');
      const email = clientEmail || `${phoneDigits || cpfDigits}@semmail.com`;

      const recipient = await prisma.pagarmeRecipient.findFirst({ where: { userId: plan.userId, status: 'active' } });

      const pix = await createPixOrder({
        valueCents: Math.round(plan.price * 100),
        description: `Assinatura — ${plan.name}`,
        customer: {
          name: clientName,
          email,
          phone: phoneDigits || undefined,
          cpf: cpfDigits || undefined,
        },
        metadata: { referenceId: `SUB|${plan.id}|${plan.userId}|${phoneDigits}|${cpfDigits}` },
        splitRecipientId: recipient?.pagarmeRecipientId,
      });

      // Cria/atualiza cliente local e ClientSubscription pending_payment
      let localClientId: string | null = null;
      let clientSubscriptionId: string | null = null;
      try {
        let client = phoneDigits
          ? await prisma.client.findFirst({ where: { userId: plan.userId, phone: phoneDigits } })
          : await prisma.client.findFirst({ where: { userId: plan.userId, cpfCnpj: { contains: cpfDigits } } });

        if (client) {
          const updateData: any = {};
          if (!client.cpfCnpj && cpfDigits) updateData.cpfCnpj = cpfDigits;
          if (clientName && client.name !== clientName) updateData.name = clientName;
          if (clientEmail && !client.email) updateData.email = clientEmail;
          if (Object.keys(updateData).length > 0) {
            await prisma.client.update({ where: { id: client.id }, data: updateData });
          }
          localClientId = client.id;
        } else {
          const created = await prisma.client.create({
            data: {
              userId: plan.userId,
              name: clientName || '',
              phone: phoneDigits || '',
              email: clientEmail || null,
              cpfCnpj: cpfDigits || null,
              tag: 'Novo',
              lastVisit: new Date().toISOString().slice(0, 10),
              totalSpent: 0,
              frequency: 0,
            },
          });
          localClientId = created.id;
        }

        if (localClientId) {
          let sub = await prisma.clientSubscription.findFirst({
            where: { userId: plan.userId, clientId: localClientId, planId: plan.id },
          });
          if (sub) {
            sub = await prisma.clientSubscription.update({
              where: { id: sub.id },
              data: {
                status: 'pending_payment',
                data: { ...(sub.data as object), pagarmeOrderId: pix.orderId },
              },
            });
          } else {
            sub = await prisma.clientSubscription.create({
              data: {
                userId: plan.userId,
                clientId: localClientId,
                planId: plan.id,
                status: 'pending_payment',
                data: {
                  pagarmeOrderId: pix.orderId,
                  cpfCnpj: cpfDigits || null,
                  subscribedAt: new Date().toISOString(),
                },
              },
            });
          }
          clientSubscriptionId = sub.id;
        }
      } catch (e) { console.error('[pagarme-checkout-upsert]', e); }

      return NextResponse.json({
        pagarmeOrderId: pix.orderId,
        brCode: pix.pix?.qrCode || null,
        qrCodeImage: pix.pix?.qrCodeUrl || null,
        expiresAt: pix.pix?.expiresAt || null,
        clientSubscriptionId,
      });
    }

    // ── Checkout Cartão recorrente via Pagar.me (assinatura mensal real) ──
    if (action === 'create-pagarme-card-subscription') {
      const { planId, clientName, clientEmail, clientPhone, clientCpf, cardToken, card, billingDay } = body;
      const cpfDigits = (clientCpf || '').replace(/\D/g, '');
      const phoneDigits = (clientPhone || '').replace(/\D/g, '');

      if (!cardToken && !card) return NextResponse.json({ error: 'Dados do cartão ausentes' }, { status: 400 });
      if (!clientCpf || cpfDigits.length !== 11) {
        return NextResponse.json({ error: 'CPF inválido' }, { status: 400 });
      }

      const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
      if (!plan) return NextResponse.json({ error: 'Plano não encontrado' }, { status: 404 });

      const email = clientEmail || `${phoneDigits || cpfDigits}@semmail.com`;
      const recipient = await prisma.pagarmeRecipient.findFirst({ where: { userId: plan.userId, status: 'active' } });

      const subscription = await createCardSubscription({
        planPriceCents: Math.round(plan.price * 100),
        planName: plan.name,
        cardToken,
        billingDay: billingDay ? Number(billingDay) : undefined,
        card,
        customer: { name: clientName, email, phone: phoneDigits || undefined, cpf: cpfDigits },
        metadata: { referenceId: `SUB|${plan.id}|${plan.userId}|${phoneDigits}|${cpfDigits}` },
        splitRecipientId: recipient?.pagarmeRecipientId,
      });

      // Cria/atualiza cliente local e ClientSubscription — cartão é síncrono, então já
      // ativa direto (o webhook cuida das renovações dos ciclos seguintes)
      let clientSubscriptionId: string | null = null;
      try {
        let client = phoneDigits
          ? await prisma.client.findFirst({ where: { userId: plan.userId, phone: phoneDigits } })
          : await prisma.client.findFirst({ where: { userId: plan.userId, cpfCnpj: { contains: cpfDigits } } });

        if (client) {
          const updateData: any = {};
          if (!client.cpfCnpj && cpfDigits) updateData.cpfCnpj = cpfDigits;
          if (clientName && client.name !== clientName) updateData.name = clientName;
          if (clientEmail && !client.email) updateData.email = clientEmail;
          if (Object.keys(updateData).length > 0) await prisma.client.update({ where: { id: client.id }, data: updateData });
        } else {
          client = await prisma.client.create({
            data: {
              userId: plan.userId,
              name: clientName || '',
              phone: phoneDigits || '',
              email: clientEmail || null,
              cpfCnpj: cpfDigits || null,
              tag: 'Novo',
              lastVisit: new Date().toISOString().slice(0, 10),
              totalSpent: 0,
              frequency: 0,
            },
          });
        }

        const subActive = subscription.status === 'active';
        let sub = await prisma.clientSubscription.findFirst({
          where: { userId: plan.userId, clientId: client.id, planId: plan.id },
        });
        const subData = {
          pagarmeSubscriptionId: subscription.subscriptionId,
          cpfCnpj: cpfDigits || null,
          billingDay: billingDay ? Number(billingDay) : null,
          ...(subActive ? { confirmedAt: new Date().toISOString() } : { subscribedAt: new Date().toISOString() }),
        };
        if (sub) {
          sub = await prisma.clientSubscription.update({
            where: { id: sub.id },
            data: { status: subActive ? 'active' : 'pending_payment', data: { ...(sub.data as object), ...subData } },
          });
        } else {
          sub = await prisma.clientSubscription.create({
            data: { userId: plan.userId, clientId: client.id, planId: plan.id, status: subActive ? 'active' : 'pending_payment', data: subData },
          });
        }
        clientSubscriptionId = sub.id;

        if (subActive) {
          await prisma.subscriptionPlan.update({ where: { id: plan.id }, data: { activeUsers: { increment: 1 } } });
        }
      } catch (e) { console.error('[pagarme-card-subscription-upsert]', e); }

      return NextResponse.json({
        pagarmeSubscriptionId: subscription.subscriptionId,
        status: subscription.status,
        clientSubscriptionId,
      });
    }

    // ── Mensalidade do UseBarber (a barbearia paga a plataforma) ────────────
    // Sem split — 100% vai pro recipient da própria conta Pagar.me do UseBarber,
    // diferente das assinaturas acima (onde o cliente paga a barbearia).
    if (action === 'create-platform-subscription') {
      const session = await auth();
      if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      if ((session.user as any).role !== 'Proprietário') {
        return NextResponse.json({ error: 'Só o dono da barbearia pode gerenciar a assinatura.' }, { status: 403 });
      }

      const { plan, billingCycle, clientCpf, card } = body;
      if (!isPlatformPlanId(plan)) return NextResponse.json({ error: 'Plano inválido' }, { status: 400 });
      const cycle = billingCycle === 'yearly' ? 'yearly' : 'monthly';
      const cpfDigits = (clientCpf || '').replace(/\D/g, '');
      if (cpfDigits.length !== 11) return NextResponse.json({ error: 'CPF inválido' }, { status: 400 });
      if (!card) return NextResponse.json({ error: 'Dados do cartão ausentes' }, { status: 400 });

      const planDef = PLATFORM_PLANS[plan];
      const priceCents = Math.round((cycle === 'yearly' ? planDef.priceYearly : planDef.priceMonthly) * 100);

      const subscription = await createCardSubscription({
        planPriceCents: priceCents,
        planName: `UseBarber — Plano ${planDef.name} (${cycle === 'yearly' ? 'anual' : 'mensal'})`,
        card,
        intervalCount: cycle === 'yearly' ? 12 : 1,
        customer: {
          name: session.user.name || 'Barbearia',
          email: session.user.email || `${cpfDigits}@semmail.com`,
          cpf: cpfDigits,
        },
        metadata: { referenceId: `PLATFORM|${session.user.id}` },
      });

      const isActive = subscription.status === 'active';
      await prisma.platformSubscription.upsert({
        where: { userId: session.user.id },
        update: {
          plan, billingCycle: cycle,
          status: isActive ? 'active' : 'past_due',
          pagarmeSubscriptionId: subscription.subscriptionId,
          lastError: null,
        },
        create: {
          userId: session.user.id, plan, billingCycle: cycle,
          status: isActive ? 'active' : 'past_due',
          pagarmeSubscriptionId: subscription.subscriptionId,
        },
      });

      return NextResponse.json({ status: subscription.status, plan, billingCycle: cycle });
    }

    // ── Cancelar Assinatura ────────────────────────────────────────────────
    // Só o dono da barbearia (autenticado) pode cancelar, e só a própria assinatura —
    // os IDs de gateway vêm do registro no banco, nunca do que o cliente mandar aqui.
    // Asaas cancel mantido pois assinantes legados ainda armazenam asaasSubscriptionId
    if (action === 'cancel-subscription') {
      const session = await auth();
      if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

      const { clientSubscriptionId } = body;
      if (!clientSubscriptionId) return NextResponse.json({ error: 'clientSubscriptionId obrigatório' }, { status: 400 });

      const sub = await prisma.clientSubscription.findFirst({
        where: { id: clientSubscriptionId, userId: session.user.id },
        select: { planId: true, data: true },
      });
      if (!sub) return NextResponse.json({ error: 'Assinatura não encontrada' }, { status: 404 });

      const subData = (sub.data as any) || {};
      const pagarmeSubscriptionId = subData.pagarmeSubscriptionId;
      const asaasSubscriptionId = subData.asaasSubscriptionId;

      if (pagarmeSubscriptionId) {
        try {
          await cancelPagarmeSubscription(pagarmeSubscriptionId);
        } catch (e) { console.error('[cancel-pagarme-subscription]', e); }
      } else if (asaasSubscriptionId) {
        const ASAAS_URL = process.env.ASAAS_URL || 'https://api.asaas.com/v3';
        const ASAAS_KEY = process.env.ASAAS_API_KEY
          ? (process.env.ASAAS_API_KEY.startsWith('$') ? process.env.ASAAS_API_KEY : `$${process.env.ASAAS_API_KEY}`)
          : '';
        await fetch(`${ASAAS_URL}/subscriptions/${asaasSubscriptionId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', access_token: ASAAS_KEY },
        });
      }

      await prisma.clientSubscription.delete({ where: { id: clientSubscriptionId } });
      if (sub.planId) {
        await prisma.subscriptionPlan.update({
          where: { id: sub.planId },
          data: { activeUsers: { decrement: 1 } },
        });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    console.error('[checkout]', err);
    return NextResponse.json({ error: sanitizeGatewayErrorMessage(err.message) }, { status: 500 });
  }
}
