import { prisma } from '@/lib/prisma';
import { TRIAL_DAYS, LEGACY_TRIAL_START } from '@/lib/platformPlans';

export type BillingState = 'trialing' | 'active' | 'blocked';

export interface BillingStatus {
  state: BillingState;
  plan: string | null;
  billingCycle: string | null;
  trialEndsAt: string | null;
  daysLeft: number | null;
  lastError: string | null;
  /** true só quando é o próprio dono da barbearia (Proprietário) — só ele pode assinar/pagar. */
  canManage: boolean;
}

/**
 * Resolve o userId da barbearia "dona" da assinatura da plataforma a partir de
 * quem está logado. Um Barbeiro não tem PlatformSubscription própria — o acesso
 * dele depende do status da barbearia em que trabalha (Barber.userId).
 */
async function resolveBarbershopUserId(sessionUserId: string, role: string): Promise<string> {
  if (role === 'Barbeiro') {
    const barber = await prisma.barber.findFirst({
      where: { accountId: sessionUserId },
      select: { userId: true },
    });
    if (barber) return barber.userId;
  }
  return sessionUserId;
}

/**
 * Status de cobrança efetivo pra quem está logado. Super Admin nunca é
 * bloqueado (não tem barbearia própria, tem seu próprio painel em /admin).
 * Barbearias sem nenhum registro ainda (contas de ANTES dessa feature) só
 * começam a contar o trial de 7 dias a partir de LEGACY_TRIAL_START
 * (01/10/2026), não da data em que acessarem o painel pela primeira vez após
 * o deploy — combinado com o usuário. Barbearias novas contam a partir do
 * cadastro normalmente (ver app/api/auth/register e lib/auth.ts).
 */
export async function getBillingStatus(sessionUserId: string, role: string): Promise<BillingStatus> {
  if (role === 'Super Admin') {
    return { state: 'active', plan: null, billingCycle: null, trialEndsAt: null, daysLeft: null, lastError: null, canManage: false };
  }

  const barbershopUserId = await resolveBarbershopUserId(sessionUserId, role);
  const canManage = barbershopUserId === sessionUserId && role !== 'Barbeiro';

  let sub = await prisma.platformSubscription.findUnique({ where: { userId: barbershopUserId } });
  if (!sub) {
    const legacyTrialEndsAt = new Date(LEGACY_TRIAL_START.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
    sub = await prisma.platformSubscription.create({
      data: {
        userId: barbershopUserId,
        status: 'trialing',
        trialEndsAt: legacyTrialEndsAt,
      },
    });
  }

  const now = Date.now();

  if (sub.status === 'active') {
    return {
      state: 'active',
      plan: sub.plan,
      billingCycle: sub.billingCycle,
      trialEndsAt: null,
      daysLeft: null,
      lastError: sub.lastError,
      canManage,
    };
  }

  if (sub.status === 'trialing') {
    const trialEndsAt = sub.trialEndsAt?.getTime() ?? 0;
    if (trialEndsAt > now) {
      return {
        state: 'trialing',
        plan: sub.plan,
        billingCycle: sub.billingCycle,
        trialEndsAt: sub.trialEndsAt?.toISOString() ?? null,
        daysLeft: Math.ceil((trialEndsAt - now) / (24 * 60 * 60 * 1000)),
        lastError: sub.lastError,
        canManage,
      };
    }
  }

  // status 'past_due' / 'canceled', ou trial expirado
  return {
    state: 'blocked',
    plan: sub.plan,
    billingCycle: sub.billingCycle,
    trialEndsAt: sub.trialEndsAt?.toISOString() ?? null,
    daysLeft: 0,
    lastError: sub.lastError,
    canManage,
  };
}
