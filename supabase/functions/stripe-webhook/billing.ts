/**
 * Stripe subscription webhook helpers (shared with edge stripe-webhook).
 * Signature verification for Node tests lives in stripeWebhookVerify.ts.
 */

export type AgendixSubscriptionStatus =
  | 'trial'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'subscriber';

export type AgendixPlanId = 'solo' | 'team';

export type ProfileBillingPatch = {
  subscription_status?: AgendixSubscriptionStatus;
  subscription_plan?: AgendixPlanId | null;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  subscription_current_period_end?: string | null; // ISO
};

/** Map Stripe Subscription.status → AgendiX profiles.subscription_status */
export function mapStripeSubscriptionStatus(
  stripeStatus: string | null | undefined,
): AgendixSubscriptionStatus | null {
  switch (stripeStatus) {
    case 'active':
    case 'trialing':
      return 'active';
    case 'past_due':
      return 'past_due';
    case 'canceled':
    case 'unpaid':
    case 'incomplete_expired':
      return 'canceled';
    case 'incomplete':
    case 'paused':
      return 'past_due';
    default:
      return null;
  }
}

export function unixToIso(sec: number | null | undefined): string | null {
  if (typeof sec !== 'number' || !Number.isFinite(sec) || sec <= 0) return null;
  return new Date(sec * 1000).toISOString();
}

export type ProfileMatch = {
  by: 'client_reference_id' | 'metadata_user' | 'stripe_customer_id' | 'stripe_subscription_id';
  value: string;
};

export function matchFromCheckoutSession(session: {
  client_reference_id?: string | null;
  metadata?: Record<string, string> | null;
  customer?: string | { id?: string } | null;
}): ProfileMatch | null {
  const ref = session.client_reference_id?.trim();
  if (ref) return { by: 'client_reference_id', value: ref };
  const meta = session.metadata?.supabase_user_id?.trim();
  if (meta) return { by: 'metadata_user', value: meta };
  const customer = typeof session.customer === 'string'
    ? session.customer
    : session.customer?.id;
  if (customer?.startsWith('cus_')) {
    return { by: 'stripe_customer_id', value: customer };
  }
  return null;
}

export function matchFromSubscription(sub: {
  id?: string;
  customer?: string | { id?: string } | null;
  metadata?: Record<string, string> | null;
}): ProfileMatch | null {
  const meta = sub.metadata?.supabase_user_id?.trim();
  if (meta) return { by: 'metadata_user', value: meta };
  const customer = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
  if (customer?.startsWith('cus_')) {
    return { by: 'stripe_customer_id', value: customer };
  }
  if (sub.id?.startsWith('sub_')) {
    return { by: 'stripe_subscription_id', value: sub.id };
  }
  return null;
}

export function matchFromInvoice(invoice: {
  customer?: string | { id?: string } | null;
  subscription?: string | { id?: string } | null;
  metadata?: Record<string, string> | null;
}): ProfileMatch | null {
  const meta = invoice.metadata?.supabase_user_id?.trim();
  if (meta) return { by: 'metadata_user', value: meta };
  const customer = typeof invoice.customer === 'string'
    ? invoice.customer
    : invoice.customer?.id;
  if (customer?.startsWith('cus_')) {
    return { by: 'stripe_customer_id', value: customer };
  }
  const sub = typeof invoice.subscription === 'string'
    ? invoice.subscription
    : invoice.subscription?.id;
  if (sub?.startsWith('sub_')) {
    return { by: 'stripe_subscription_id', value: sub };
  }
  return null;
}

export function planFromSubscription(sub: {
  metadata?: Record<string, string> | null;
  items?: { data?: Array<{ price?: { id?: string } | null }> };
}, planIdFromPriceId: (priceId: string) => AgendixPlanId | null): AgendixPlanId | null {
  const metaPlan = sub.metadata?.plan_id;
  if (metaPlan === 'solo' || metaPlan === 'team') return metaPlan;
  const priceId = sub.items?.data?.[0]?.price?.id;
  if (priceId) return planIdFromPriceId(priceId);
  return null;
}

export function billingPatchFromSubscription(
  sub: {
    id: string;
    status: string;
    customer?: string | { id?: string } | null;
    current_period_end?: number | null;
    metadata?: Record<string, string> | null;
    items?: { data?: Array<{ price?: { id?: string } | null }> };
  },
  planIdFromPriceId: (priceId: string) => AgendixPlanId | null,
): ProfileBillingPatch {
  const status = mapStripeSubscriptionStatus(sub.status);
  const customer = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
  const plan = planFromSubscription(sub, planIdFromPriceId);
  const patch: ProfileBillingPatch = {
    stripe_subscription_id: sub.id,
    subscription_current_period_end: unixToIso(sub.current_period_end ?? null),
  };
  if (status) patch.subscription_status = status;
  if (plan) patch.subscription_plan = plan;
  if (customer?.startsWith('cus_')) patch.stripe_customer_id = customer;
  return patch;
}

export const HANDLED_STRIPE_EVENT_TYPES = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid',
  'invoice.payment_failed',
] as const;

export type HandledStripeEventType = (typeof HANDLED_STRIPE_EVENT_TYPES)[number];

export function isHandledStripeEventType(t: string): t is HandledStripeEventType {
  return (HANDLED_STRIPE_EVENT_TYPES as readonly string[]).includes(t);
}
