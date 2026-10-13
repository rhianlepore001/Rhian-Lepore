import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  FALLBACK_STRIPE_PRICE_IDS,
  collectAllowedOrigins,
  collectAllowedPriceIds,
  isAllowedCheckoutMode,
  isAllowedPriceId,
  isAllowedReturnUrl,
} from '../../utils/checkoutAllowlist';

describe('checkoutAllowlist (A-06)', () => {
  const prices = collectAllowedPriceIds();
  const origins = collectAllowedOrigins();

  it('accepts official plan price IDs and rejects others', () => {
    for (const id of FALLBACK_STRIPE_PRICE_IDS) {
      expect(isAllowedPriceId(id, prices)).toBe(true);
    }
    expect(isAllowedPriceId('price_EVIL', prices)).toBe(false);
    expect(isAllowedPriceId('', prices)).toBe(false);
    expect(isAllowedPriceId(null, prices)).toBe(false);
  });

  it('accepts production/local return URLs and rejects phishing', () => {
    expect(
      isAllowedReturnUrl(
        'https://www.agendixstudio.com/#/?session_id={CHECKOUT_SESSION_ID}',
        origins,
      ),
    ).toBe(true);
    expect(isAllowedReturnUrl('http://localhost:5173/#/settings', origins)).toBe(true);
    expect(isAllowedReturnUrl('https://evil.example/phish', origins)).toBe(false);
    expect(isAllowedReturnUrl('javascript:alert(1)', origins)).toBe(false);
    expect(
      isAllowedReturnUrl(
        'https://rhian-lepore-git-fix-alto-a06-xxx-rhians-projects-df168429.vercel.app/#/',
        origins,
      ),
    ).toBe(true);
  });

  it('only allows subscription mode', () => {
    expect(isAllowedCheckoutMode('subscription')).toBe(true);
    expect(isAllowedCheckoutMode(undefined)).toBe(true);
    expect(isAllowedCheckoutMode('payment')).toBe(false);
    expect(isAllowedCheckoutMode('setup')).toBe(false);
  });

  it('edge allowlist mirrors utils price IDs (keep in sync)', () => {
    const edge = readFileSync(
      resolve(__dirname, '../../supabase/functions/create-checkout-session/allowlist.ts'),
      'utf8',
    );
    for (const id of FALLBACK_STRIPE_PRICE_IDS) {
      expect(edge).toContain(id);
    }
    expect(edge).toContain('isAllowedReturnUrl');
  });
});
