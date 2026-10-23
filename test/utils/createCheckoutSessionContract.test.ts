import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('create-checkout-session contract', () => {
  const src = readFileSync(
    resolve(__dirname, '../../supabase/functions/create-checkout-session/index.ts'),
    'utf8',
  );

  it('does not pass automatic_payment_methods on Checkout Sessions', () => {
    expect(src).not.toMatch(/automatic_payment_methods/);
  });

  it('sets client_reference_id and resolves plan prices server-side', () => {
    expect(src).toMatch(/client_reference_id:\s*user\.id/);
    expect(src).toMatch(/resolvePlanPriceId/);
    expect(src).toMatch(/isAllowedPriceId/);
  });
});
