import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  HANDLED_STRIPE_EVENT_TYPES,
  billingUpdateFromEvent,
  checkoutTrialEnd,
  configuredPriceIds,
  hasActiveAccess,
  mapStripeSubscriptionStatus,
  resolvePlanPriceId,
} from '../../supabase/functions/_shared/billing';
import {
  signStripePayload,
  verifyStripeSignature,
} from '../../supabase/functions/_shared/stripeSignature';

const fixtures = resolve(__dirname, '../fixtures/stripe');
const load = (n: string) => JSON.parse(readFileSync(resolve(fixtures, n), 'utf8'));

const ENV: Record<string, string> = {
  STRIPE_PRICE_SOLO_BRL: 'price_test_fake_solo_brl',
  STRIPE_PRICE_TEAM_BRL: 'price_test_fake_team_brl',
  STRIPE_PRICE_SOLO_EUR: 'price_test_fake_solo_eur',
  STRIPE_PRICE_TEAM_EUR: 'price_test_fake_team_eur',
};
const envGet = (k: string) => ENV[k];

describe('price config (no hard-coded ids)', () => {
  it('resolves price id from env config', () => {
    expect(resolvePlanPriceId('solo', 'BRL', envGet)).toBe('price_test_fake_solo_brl');
    expect(resolvePlanPriceId('team', 'EUR', envGet)).toBe('price_test_fake_team_eur');
  });
  it('returns null when not configured (never falls back to a baked-in id)', () => {
    expect(resolvePlanPriceId('solo', 'BRL', () => undefined)).toBeNull();
    expect(resolvePlanPriceId('solo', 'BRL', () => 'not-a-price')).toBeNull();
  });
  it('maps configured price ids back to plans', () => {
    const map = configuredPriceIds(envGet);
    expect(map.get('price_test_fake_team_brl')).toEqual({ planId: 'team', currency: 'BRL' });
    expect(map.size).toBe(4);
  });
  it('shared module has no hard-coded Stripe price ids', () => {
    const src = readFileSync(resolve(__dirname, '../../supabase/functions/_shared/billing.ts'), 'utf8');
    expect(src).not.toMatch(/price_1[A-Za-z0-9]{10,}/);
    const edge = readFileSync(resolve(__dirname, '../../supabase/functions/create-checkout-session/index.ts'), 'utf8');
    expect(edge).not.toMatch(/price_1[A-Za-z0-9]{10,}/);
    expect(edge).not.toMatch(/automatic_payment_methods/);
  });
});

describe('status mapping', () => {
  it('maps Stripe statuses', () => {
    expect(mapStripeSubscriptionStatus('active')).toBe('active');
    expect(mapStripeSubscriptionStatus('trialing')).toBe('active');
    expect(mapStripeSubscriptionStatus('past_due')).toBe('past_due');
    expect(mapStripeSubscriptionStatus('unpaid')).toBe('canceled');
    expect(mapStripeSubscriptionStatus('canceled')).toBe('canceled');
    expect(mapStripeSubscriptionStatus('weird')).toBeNull();
  });
  it('handles the required event types', () => {
    for (const t of ['checkout.session.completed', 'customer.subscription.updated', 'customer.subscription.deleted', 'invoice.payment_failed']) {
      expect(HANDLED_STRIPE_EVENT_TYPES).toContain(t);
    }
  });
});

describe('billingUpdateFromEvent', () => {
  const planOf = (id: string) => configuredPriceIds(envGet).get(id)?.planId ?? null;

  it('checkout.session.completed → active + ids', () => {
    const u = billingUpdateFromEvent(load('checkout.session.completed.json'), planOf);
    expect(u.kind).toBe('update');
    if (u.kind !== 'update') return;
    expect(u.match).toEqual({ by: 'id', value: 'a0000000-0000-4000-8000-0000000000a0' });
    expect(u.patch).toMatchObject({
      subscription_status: 'active',
      subscription_plan: 'solo',
      stripe_customer_id: 'cus_TESTOWNERA',
      stripe_subscription_id: 'sub_TEST123',
    });
    expect(u.eventAt).toBe(new Date(1760000000 * 1000).toISOString());
  });

  it('customer.subscription.updated → plan from configured price + period end', () => {
    const evt = load('customer.subscription.updated.json');
    delete evt.data.object.metadata.plan_id;
    const u = billingUpdateFromEvent(evt, planOf);
    if (u.kind !== 'update') throw new Error('expected update');
    expect(u.patch.subscription_plan).toBe('solo');
    expect(u.patch.subscription_status).toBe('active');
    expect(u.patch.subscription_current_period_end).toBe(new Date(1762592000 * 1000).toISOString());
  });

  it('customer.subscription.deleted → canceled even if status lags', () => {
    const evt = load('customer.subscription.updated.json');
    evt.type = 'customer.subscription.deleted';
    const u = billingUpdateFromEvent(evt, planOf);
    if (u.kind !== 'update') throw new Error('expected update');
    expect(u.patch.subscription_status).toBe('canceled');
  });

  it('invoice.payment_failed → past_due matched by subscription, then customer', () => {
    const u = billingUpdateFromEvent(load('invoice.payment_failed.json'), planOf);
    if (u.kind !== 'update') throw new Error('expected update');
    expect(u.match).toEqual({ by: 'stripe_subscription_id', value: 'sub_TEST123' });
    expect(u.fallbackMatches).toEqual([{ by: 'stripe_customer_id', value: 'cus_TESTOWNERA' }]);
    expect(u.patch.subscription_status).toBe('past_due');
  });

  it('ignores unrelated events and non-subscription checkouts', () => {
    expect(billingUpdateFromEvent({ id: 'evt_x', type: 'charge.refunded', created: 1, data: { object: {} } }, planOf).kind).toBe('ignore');
    const evt = load('checkout.session.completed.json');
    evt.data.object.mode = 'payment';
    expect(billingUpdateFromEvent(evt, planOf).kind).toBe('ignore');
  });

  it('does not activate an unpaid checkout', () => {
    const evt = load('checkout.session.completed.json');
    evt.data.object.payment_status = 'unpaid';
    evt.data.object.status = 'open';
    const u = billingUpdateFromEvent(evt, planOf);
    if (u.kind !== 'update') throw new Error('expected update');
    expect(u.patch.subscription_status).toBeUndefined();
  });
});

describe('hasActiveAccess (mirrors SQL billing_has_access)', () => {
  const now = new Date('2026-11-05T10:00:00Z');
  const future = '2026-12-05T10:00:00Z';
  const past = '2026-11-01T10:00:00Z';
  it('trial respects trial_ends_at (7-day default or 30-day promo alike)', () => {
    expect(hasActiveAccess({ subscription_status: 'trial', trial_ends_at: future }, now)).toBe(true);
    expect(hasActiveAccess({ subscription_status: 'trial', trial_ends_at: past }, now)).toBe(false);
    expect(hasActiveAccess({ subscription_status: 'trial', trial_ends_at: null }, now)).toBe(false);
    expect(hasActiveAccess({ subscription_status: null, trial_ends_at: future }, now)).toBe(true);
  });
  it('paid statuses grant access (including legacy subscriber/paid)', () => {
    for (const s of ['active', 'subscriber', 'paid']) {
      expect(hasActiveAccess({ subscription_status: s, trial_ends_at: past }, now)).toBe(true);
    }
  });
  it('past_due keeps access only until current period end', () => {
    expect(hasActiveAccess({ subscription_status: 'past_due', subscription_current_period_end: future }, now)).toBe(true);
    expect(hasActiveAccess({ subscription_status: 'past_due', subscription_current_period_end: past }, now)).toBe(false);
  });
  it('canceled has no access', () => {
    expect(hasActiveAccess({ subscription_status: 'canceled', trial_ends_at: future }, now)).toBe(false);
  });
});

describe('checkoutTrialEnd keeps the remaining trial', () => {
  const now = new Date('2026-11-05T10:00:00Z');
  it('passes trial_end when trial ends > 48h from now', () => {
    expect(checkoutTrialEnd('trial', '2026-11-30T10:00:00Z', now)).toBe(Date.parse('2026-11-30T10:00:00Z') / 1000);
  });
  it('omits trial_end when trial is over, too close, or user not on trial', () => {
    expect(checkoutTrialEnd('trial', '2026-11-06T10:00:00Z', now)).toBeUndefined();
    expect(checkoutTrialEnd('trial', null, now)).toBeUndefined();
    expect(checkoutTrialEnd('canceled', '2026-11-30T10:00:00Z', now)).toBeUndefined();
  });
});

describe('verifyStripeSignature', () => {
  const secret = 'whsec_fake_for_tests';
  const payload = JSON.stringify({ id: 'evt_fake', type: 'checkout.session.completed' });
  it('accepts a valid signature', async () => {
    const t = 1760000000;
    const header = await signStripePayload(payload, secret, t);
    expect(await verifyStripeSignature(payload, header, secret, 300, t + 10)).toBe(true);
  });
  it('rejects tampered payload, wrong secret, stale timestamp, junk header', async () => {
    const t = 1760000000;
    const header = await signStripePayload(payload, secret, t);
    expect(await verifyStripeSignature(payload + ' ', header, secret, 300, t)).toBe(false);
    expect(await verifyStripeSignature(payload, header, 'whsec_other', 300, t)).toBe(false);
    expect(await verifyStripeSignature(payload, header, secret, 300, t + 301)).toBe(false);
    expect(await verifyStripeSignature(payload, 'garbage', secret, 300, t)).toBe(false);
  });
});
