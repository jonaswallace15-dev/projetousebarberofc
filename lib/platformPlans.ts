// Planos pagos da própria plataforma UseBarber (mensalidade cobrada da barbearia,
// sem relação com os planos de assinatura que a barbearia cria pros CLIENTES dela
// — ver model SubscriptionPlan). Mesmos valores anunciados na landing page.

export type PlatformPlanId = 'start' | 'pro' | 'premium';

export interface PlatformPlan {
  id: PlatformPlanId;
  name: string;
  priceMonthly: number;
  priceYearly: number;
}

export const PLATFORM_PLANS: Record<PlatformPlanId, PlatformPlan> = {
  start: { id: 'start', name: 'Start', priceMonthly: 29, priceYearly: 290 },
  pro: { id: 'pro', name: 'Pro', priceMonthly: 59, priceYearly: 590 },
  premium: { id: 'premium', name: 'Premium', priceMonthly: 79, priceYearly: 790 },
};

export const TRIAL_DAYS = 7;

// Barbearias cadastradas ANTES dessa feature (sem PlatformSubscription ainda)
// só começam a contar o trial a partir de 01/10/2026, não da data em que essa
// mudança foi lançada — combinado com o usuário. Barbearias novas (cadastradas
// depois do deploy, via app/api/auth/register e lib/auth.ts) contam a partir de
// agora normalmente.
export const LEGACY_TRIAL_START = new Date('2026-10-01T00:00:00-03:00');

export function isPlatformPlanId(value: unknown): value is PlatformPlanId {
  return value === 'start' || value === 'pro' || value === 'premium';
}
