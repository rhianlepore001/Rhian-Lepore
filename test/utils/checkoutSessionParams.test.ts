import { describe, expect, it } from 'vitest';
import {
  CHECKOUT_STRIPE_API_VERSION,
  buildCheckoutSessionParams,
  resolvePlanPriceId,
  type AgendixPlanId,
  type PlanCurrency,
} from '../../supabase/functions/_shared/billing';

const ENV: Record<string, string> = {
  STRIPE_PRICE_SOLO_BRL: 'price_test_fake_solo_brl',
  STRIPE_PRICE_TEAM_BRL: 'price_test_fake_team_brl',
  STRIPE_PRICE_SOLO_EUR: 'price_test_fake_solo_eur',
  STRIPE_PRICE_TEAM_EUR: 'price_test_fake_team_eur',
};
const envGet = (k: string) => ENV[k];

const cases: Array<[AgendixPlanId, PlanCurrency]> = [
  ['solo', 'BRL'], ['team', 'BRL'], ['solo', 'EUR'], ['team', 'EUR'],
];

describe('create-checkout-session: parâmetros da sessão Stripe', () => {
  it.each(cases)('%s/%s usa o preço configurado dessa moeda e desliga a conversão automática', (planId, currency) => {
    const priceId = resolvePlanPriceId(planId, currency, envGet)!;
    const p = buildCheckoutSessionParams({
      customerId: 'cus_fake', userId: 'user-1', planId, currency, priceId,
      successUrl: 'https://www.agendixstudio.com/#/?session_id={CHECKOUT_SESSION_ID}',
      cancelUrl: 'https://www.agendixstudio.com/#/configuracoes/assinatura',
    });
    expect(p.line_items).toEqual([{ price: ENV[`STRIPE_PRICE_${planId.toUpperCase()}_${currency}`], quantity: 1 }]);
    // Sem Adaptive Pricing: o cliente paga o preço real na moeda do preço (EUR = preço em euro,
    // nunca o BRL convertido).
    expect(p.adaptive_pricing).toEqual({ enabled: false });
    expect(p.mode).toBe('subscription');
    expect(p.metadata).toEqual({ supabase_user_id: 'user-1', plan_id: planId, currency });
    expect(p.subscription_data.metadata).toEqual(p.metadata);
    expect(p.subscription_data).not.toHaveProperty('trial_end');
  });

  it('mantém o trial restante quando houver', () => {
    const p = buildCheckoutSessionParams({
      customerId: 'cus_fake', userId: 'u', planId: 'solo', currency: 'EUR', priceId: 'price_x',
      successUrl: 's', cancelUrl: 'c', trialEnd: 1800000000,
    });
    expect(p.subscription_data.trial_end).toBe(1800000000);
  });

  it('usa uma versão da API que aceita adaptive_pricing (2024-11-20 ou mais nova)', () => {
    expect(CHECKOUT_STRIPE_API_VERSION >= '2024-11-20').toBe(true);
  });
});
