import { describe, expect, it } from 'vitest';
import {
  LIVE_STRIPE_PRICE_BY_PLAN,
  TESTMODE_STRIPE_PRICE_BY_PLAN,
  isStripeTestModeKey,
  planIdFromPriceId,
  resolvePlanPriceId,
} from '../../utils/stripePlanPrices';

describe('stripePlanPrices', () => {
  it('detects testmode key prefixes without needing the full secret', () => {
    expect(isStripeTestModeKey('sk_test_xxx')).toBe(true);
    expect(isStripeTestModeKey('rk_test_xxx')).toBe(true);
    expect(isStripeTestModeKey('sk_live_xxx')).toBe(false);
    expect(isStripeTestModeKey('rk_live_xxx')).toBe(false);
    expect(isStripeTestModeKey(undefined)).toBe(false);
  });

  it('resolves live defaults when env empty', () => {
    expect(resolvePlanPriceId('solo', 'BRL', () => undefined, false)).toBe(
      LIVE_STRIPE_PRICE_BY_PLAN.BRL.solo,
    );
    expect(resolvePlanPriceId('team', 'EUR', () => undefined, true)).toBe(
      TESTMODE_STRIPE_PRICE_BY_PLAN.EUR.team,
    );
  });

  it('prefers STRIPE_PRICE_* env over defaults', () => {
    const env = (k: string) => (k === 'STRIPE_PRICE_SOLO_BRL' ? 'price_env_solo_brl' : undefined);
    expect(resolvePlanPriceId('solo', 'BRL', env, false)).toBe('price_env_solo_brl');
  });

  it('maps known price ids back to plan', () => {
    expect(planIdFromPriceId(LIVE_STRIPE_PRICE_BY_PLAN.BRL.solo)).toBe('solo');
    expect(planIdFromPriceId(TESTMODE_STRIPE_PRICE_BY_PLAN.EUR.team)).toBe('team');
    expect(planIdFromPriceId('price_unknown')).toBeNull();
  });
});
