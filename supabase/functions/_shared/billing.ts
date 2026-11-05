/**
 * AgendiX billing — pure logic shared by edge functions (Deno) and vitest (Node).
 * Self-contained on purpose: no imports, no Deno APIs, no hard-coded Stripe IDs.
 * SQL mirror of hasActiveAccess: public.billing_has_access (migration 20261105100000).
 */

export type PlanCurrency = 'BRL' | 'EUR';
export type AgendixPlanId = 'solo' | 'team';
export type AgendixSubscriptionStatus = 'trial' | 'active' | 'past_due' | 'canceled' | 'subscriber';

type EnvGet = (key: string) => string | undefined | null;

const PLANS: AgendixPlanId[] = ['solo', 'team'];
const CURRENCIES: PlanCurrency[] = ['BRL', 'EUR'];

/** Secret names (Supabase Edge secrets) holding the Stripe Price IDs. */
export function priceEnvKey(planId: AgendixPlanId, currency: PlanCurrency): string {
  return `STRIPE_PRICE_${planId.toUpperCase()}_${currency}`;
}

export function isAgendixPlanId(v: unknown): v is AgendixPlanId {
  return v === 'solo' || v === 'team';
}

export function isPlanCurrency(v: unknown): v is PlanCurrency {
  return v === 'BRL' || v === 'EUR';
}

/** Price ID from config only. Returns null when missing/invalid (caller must fail loudly). */
export function resolvePlanPriceId(
  planId: AgendixPlanId,
  currency: PlanCurrency,
  envGet: EnvGet,
): string | null {
  const raw = envGet(priceEnvKey(planId, currency));
  if (typeof raw !== 'string') return null;
  const v = raw.trim();
  return /^price_[A-Za-z0-9_]+$/.test(v) ? v : null;
}

/** Map of every configured price id → plan/currency (for webhook plan detection + legacy priceId). */
export function configuredPriceIds(
  envGet: EnvGet,
): Map<string, { planId: AgendixPlanId; currency: PlanCurrency }> {
  const map = new Map<string, { planId: AgendixPlanId; currency: PlanCurrency }>();
  for (const currency of CURRENCIES) {
    for (const planId of PLANS) {
      const id = resolvePlanPriceId(planId, currency, envGet);
      if (id) map.set(id, { planId, currency });
    }
  }
  return map;
}

export function mapStripeSubscriptionStatus(
  s: string | null | undefined,
): AgendixSubscriptionStatus | null {
  switch (s) {
    case 'active':
    case 'trialing':
      return 'active';
    case 'past_due':
    case 'incomplete':
    case 'paused':
      return 'past_due';
    case 'canceled':
    case 'unpaid':
    case 'incomplete_expired':
      return 'canceled';
    default:
      return null;
  }
}

export const HANDLED_STRIPE_EVENT_TYPES = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid',
  'invoice.payment_failed',
] as const;

export type ProfileBillingPatch = {
  subscription_status?: AgendixSubscriptionStatus;
  subscription_plan?: AgendixPlanId;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  subscription_current_period_end?: string | null;
};

export type ProfileMatch = {
  by: 'id' | 'stripe_customer_id' | 'stripe_subscription_id';
  value: string;
};

export type StripeEventLike = {
  id: string;
  type: string;
  created: number;
  livemode?: boolean;
  data: { object: Record<string, unknown> };
};

export type BillingUpdate =
  | { kind: 'ignore'; reason: string }
  | { kind: 'update'; match: ProfileMatch; fallbackMatches: ProfileMatch[]; patch: ProfileBillingPatch; eventAt: string };

type AnyObj = Record<string, any>;

const idOf = (v: unknown): string | undefined => {
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object' && typeof (v as AnyObj).id === 'string') return (v as AnyObj).id;
  return undefined;
};

const unixToIso = (sec: unknown): string | null =>
  typeof sec === 'number' && Number.isFinite(sec) && sec > 0 ? new Date(sec * 1000).toISOString() : null;

function matches(userId: unknown, customer?: string, subscription?: string): ProfileMatch[] {
  const out: ProfileMatch[] = [];
  if (typeof userId === 'string' && userId.trim()) out.push({ by: 'id', value: userId.trim() });
  if (subscription?.startsWith('sub_')) out.push({ by: 'stripe_subscription_id', value: subscription });
  if (customer?.startsWith('cus_')) out.push({ by: 'stripe_customer_id', value: customer });
  return out;
}

/** Pure: turn a verified Stripe event into a profile billing patch. */
export function billingUpdateFromEvent(
  event: StripeEventLike,
  planFromPriceId: (priceId: string) => AgendixPlanId | null,
): BillingUpdate {
  const obj = (event.data?.object ?? {}) as AnyObj;
  const eventAt = new Date((event.created || 0) * 1000).toISOString();
  const done = (m: ProfileMatch[], patch: ProfileBillingPatch): BillingUpdate =>
    m.length === 0
      ? { kind: 'ignore', reason: 'no_match' }
      : { kind: 'update', match: m[0], fallbackMatches: m.slice(1), patch, eventAt };

  switch (event.type) {
    case 'checkout.session.completed': {
      if (obj.mode && obj.mode !== 'subscription') return { kind: 'ignore', reason: 'non_subscription' };
      const customer = idOf(obj.customer);
      const sub = idOf(obj.subscription);
      const patch: ProfileBillingPatch = {};
      if (customer?.startsWith('cus_')) patch.stripe_customer_id = customer;
      if (sub?.startsWith('sub_')) patch.stripe_subscription_id = sub;
      if (isAgendixPlanId(obj.metadata?.plan_id)) patch.subscription_plan = obj.metadata.plan_id;
      if (obj.payment_status === 'paid' || obj.payment_status === 'no_payment_required' || obj.status === 'complete') {
        if (obj.payment_status !== 'unpaid') patch.subscription_status = 'active';
      }
      return done(matches(obj.client_reference_id ?? obj.metadata?.supabase_user_id, customer, sub), patch);
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const customer = idOf(obj.customer);
      const sub = idOf(obj.id);
      const status = event.type === 'customer.subscription.deleted'
        ? 'canceled'
        : mapStripeSubscriptionStatus(obj.status);
      const patch: ProfileBillingPatch = {
        subscription_current_period_end: unixToIso(obj.current_period_end ?? obj.items?.data?.[0]?.current_period_end),
      };
      if (status) patch.subscription_status = status;
      if (customer?.startsWith('cus_')) patch.stripe_customer_id = customer;
      if (sub?.startsWith('sub_')) patch.stripe_subscription_id = sub;
      const metaPlan = obj.metadata?.plan_id;
      const pricePlan = typeof obj.items?.data?.[0]?.price?.id === 'string'
        ? planFromPriceId(obj.items.data[0].price.id)
        : null;
      const plan = isAgendixPlanId(metaPlan) ? metaPlan : pricePlan;
      if (plan) patch.subscription_plan = plan;
      return done(matches(obj.metadata?.supabase_user_id, customer, sub), patch);
    }
    case 'invoice.paid':
    case 'invoice.payment_failed': {
      const customer = idOf(obj.customer);
      const sub = idOf(obj.subscription ?? obj.parent?.subscription_details?.subscription);
      if (!sub) return { kind: 'ignore', reason: 'non_subscription_invoice' };
      const patch: ProfileBillingPatch = {
        subscription_status: event.type === 'invoice.paid' ? 'active' : 'past_due',
      };
      if (event.type === 'invoice.paid') {
        const end = unixToIso(obj.lines?.data?.[0]?.period?.end);
        if (end) patch.subscription_current_period_end = end;
      }
      return done(matches(obj.subscription_details?.metadata?.supabase_user_id, customer, sub), patch);
    }
    default:
      return { kind: 'ignore', reason: 'unhandled_type' };
  }
}

export type AccessInput = {
  subscription_status?: string | null;
  trial_ends_at?: string | null;
  subscription_current_period_end?: string | null;
};

/** Server-side paywall rule. Keep identical to SQL public.billing_has_access. */
export function hasActiveAccess(p: AccessInput, now: Date = new Date()): boolean {
  const status = p.subscription_status ?? 'trial';
  const after = (iso?: string | null) => {
    if (!iso) return false;
    const t = Date.parse(iso);
    return Number.isFinite(t) && t > now.getTime();
  };
  if (status === 'active' || status === 'subscriber' || status === 'paid') return true;
  if (status === 'trial') return after(p.trial_ends_at);
  if (status === 'past_due') return after(p.subscription_current_period_end);
  return false;
}

/**
 * Remaining trial carried into Stripe Checkout so subscribing early never shortens
 * the trial (7-day default or 30-day promo). Stripe requires trial_end >= now + 48h.
 */
export function checkoutTrialEnd(
  status: string | null | undefined,
  trialEndsAt: string | null | undefined,
  now: Date = new Date(),
): number | undefined {
  if ((status ?? 'trial') !== 'trial' || !trialEndsAt) return undefined;
  const t = Date.parse(trialEndsAt);
  if (!Number.isFinite(t) || t - now.getTime() < 48 * 3600 * 1000) return undefined;
  return Math.floor(t / 1000);
}
