import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  HANDLED_STRIPE_EVENT_TYPES,
  billingPatchFromSubscription,
  isHandledStripeEventType,
  mapStripeSubscriptionStatus,
  matchFromCheckoutSession,
  matchFromInvoice,
  matchFromSubscription,
} from '../../utils/stripeWebhook';
import { planIdFromPriceId } from '../../utils/stripePlanPrices';
import {
  buildStripeSignatureHeader,
  verifyStripeSignature,
} from '../../utils/stripeWebhookVerify';

const fixturesDir = resolve(__dirname, '../fixtures/stripe');

function loadFixture(name: string) {
  return JSON.parse(readFileSync(resolve(fixturesDir, name), 'utf8'));
}

describe('stripeWebhook mapping', () => {
  it('maps Stripe subscription statuses', () => {
    expect(mapStripeSubscriptionStatus('active')).toBe('active');
    expect(mapStripeSubscriptionStatus('trialing')).toBe('active');
    expect(mapStripeSubscriptionStatus('past_due')).toBe('past_due');
    expect(mapStripeSubscriptionStatus('canceled')).toBe('canceled');
    expect(mapStripeSubscriptionStatus('unpaid')).toBe('canceled');
    expect(mapStripeSubscriptionStatus('nope')).toBeNull();
  });

  it('matches checkout.session.completed via client_reference_id', () => {
    const evt = loadFixture('checkout.session.completed.json');
    const match = matchFromCheckoutSession(evt.data.object);
    expect(match).toEqual({
      by: 'client_reference_id',
      value: 'a0000000-0000-4000-8000-0000000000a0',
    });
  });

  it('builds billing patch from subscription.updated fixture', () => {
    const evt = loadFixture('customer.subscription.updated.json');
    const patch = billingPatchFromSubscription(evt.data.object, planIdFromPriceId);
    expect(patch.subscription_status).toBe('active');
    expect(patch.subscription_plan).toBe('solo');
    expect(patch.stripe_subscription_id).toBe('sub_TEST123');
    expect(patch.stripe_customer_id).toBe('cus_TESTOWNERA');
    expect(patch.subscription_current_period_end).toMatch(/^\d{4}-/);
  });

  it('matches invoice.payment_failed by customer', () => {
    const evt = loadFixture('invoice.payment_failed.json');
    expect(matchFromInvoice(evt.data.object)).toEqual({
      by: 'stripe_customer_id',
      value: 'cus_TESTOWNERA',
    });
  });

  it('matches subscription by metadata user', () => {
    expect(
      matchFromSubscription({
        id: 'sub_x',
        customer: null,
        metadata: { supabase_user_id: 'user-1' },
      }),
    ).toEqual({ by: 'metadata_user', value: 'user-1' });
  });

  it('lists handled event types', () => {
    for (const t of HANDLED_STRIPE_EVENT_TYPES) {
      expect(isHandledStripeEventType(t)).toBe(true);
    }
    expect(isHandledStripeEventType('charge.succeeded')).toBe(false);
  });
});

describe('stripeWebhookVerify (signatures)', () => {
  const secret = 'whsec_test_secret_unit';
  const payload = JSON.stringify(loadFixture('checkout.session.completed.json'));

  it('accepts a valid signature header', () => {
    const header = buildStripeSignatureHeader(payload, secret, 1_760_000_000);
    const result = verifyStripeSignature(payload, header, secret, 300, 1_760_000_000);
    expect(result).toEqual({ ok: true, timestamp: 1_760_000_000 });
  });

  it('rejects a tampered payload', () => {
    const header = buildStripeSignatureHeader(payload, secret, 1_760_000_000);
    const result = verifyStripeSignature(payload + ' ', header, secret, 300, 1_760_000_000);
    expect(result.ok).toBe(false);
    expect('reason' in result && result.reason).toBe('bad_signature');
  });

  it('rejects a bad secret', () => {
    const header = buildStripeSignatureHeader(payload, secret, 1_760_000_000);
    const result = verifyStripeSignature(payload, header, 'whsec_other', 300, 1_760_000_000);
    expect(result.ok).toBe(false);
  });

  it('rejects missing header', () => {
    expect(verifyStripeSignature(payload, null, secret).ok).toBe(false);
  });

  it('rejects timestamp outside tolerance', () => {
    const header = buildStripeSignatureHeader(payload, secret, 1_000_000_000);
    const result = verifyStripeSignature(payload, header, secret, 300, 1_760_000_000);
    expect(result.ok).toBe(false);
    expect('reason' in result && result.reason).toBe('timestamp_outside_tolerance');
  });
});
