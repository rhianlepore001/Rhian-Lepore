/**
 * Server-side AgendiX plan → Stripe Price ID resolution.
 * Edge function mirrors logic in supabase/functions/create-checkout-session/planPrices.ts
 */
const FALLBACK_STRIPE_PRICE_IDS = [
  "price_1UHfuLPUPmLLh2qEjVZ7g0hA",
  "price_1UHfuMPUPmLLh2qEBQdKfGNv",
  "price_1UHfuNPUPmLLh2qEUiuYaUyN",
  "price_1UHfuNPUPmLLh2qEaolUiKUI",
] as const;

const PRODUCTION_STRIPE_PRICE_IDS = [
  "price_1UHgTEBoBv5fVrkrYEFLfgBs",
  "price_1UHgTFBoBv5fVrkr1pimlz7G",
  "price_1UHgTGBoBv5fVrkr4GO9Qa2x",
  "price_1UHgTGBoBv5fVrkrY2JCGvs5",
] as const;

export type PlanCurrency = 'BRL' | 'EUR';
export type AgendixPlanId = 'solo' | 'team';

/** Live prices currently in the production Vercel bundle (2026-10-13). */
export const LIVE_STRIPE_PRICE_BY_PLAN: Record<PlanCurrency, Record<AgendixPlanId, string>> = {
  BRL: {
    solo: 'price_1UHgTEBoBv5fVrkrYEFLfgBs',
    team: 'price_1UHgTFBoBv5fVrkr1pimlz7G',
  },
  EUR: {
    solo: 'price_1UHgTGBoBv5fVrkr4GO9Qa2x',
    team: 'price_1UHgTGBoBv5fVrkrY2JCGvs5',
  },
};

export const TESTMODE_STRIPE_PRICE_BY_PLAN: Record<PlanCurrency, Record<AgendixPlanId, string>> = {
  BRL: {
    solo: FALLBACK_STRIPE_PRICE_IDS[0],
    team: FALLBACK_STRIPE_PRICE_IDS[1],
  },
  EUR: {
    solo: FALLBACK_STRIPE_PRICE_IDS[2],
    team: FALLBACK_STRIPE_PRICE_IDS[3],
  },
};

const ENV_KEYS: Record<PlanCurrency, Record<AgendixPlanId, string[]>> = {
  BRL: {
    solo: ['STRIPE_PRICE_SOLO_BRL', 'VITE_STRIPE_PRICE_SOLO_BRL'],
    team: ['STRIPE_PRICE_TEAM_BRL', 'VITE_STRIPE_PRICE_TEAM_BRL'],
  },
  EUR: {
    solo: ['STRIPE_PRICE_SOLO_EUR', 'VITE_STRIPE_PRICE_SOLO_EUR', 'VITE_STRIPE_PRICE_SOLO_EU'],
    team: ['STRIPE_PRICE_TEAM_EUR', 'VITE_STRIPE_PRICE_TEAM_EUR', 'VITE_STRIPE_PRICE_TEAM_EU'],
  },
};

export function isAgendixPlanId(v: unknown): v is AgendixPlanId {
  return v === 'solo' || v === 'team';
}

export function isPlanCurrency(v: unknown): v is PlanCurrency {
  return v === 'BRL' || v === 'EUR';
}

/** True when Stripe secret/restricted key is testmode (never log the key). */
export function isStripeTestModeKey(secret: string | undefined | null): boolean {
  if (typeof secret !== 'string') return false;
  const s = secret.trim();
  return s.startsWith('sk_test') || s.startsWith('rk_test');
}

/**
 * Resolve price ID from env map first, then mode-appropriate defaults.
 * preferTestmode: when true (or when STRIPE_PRICE_MODE=test), use testmode fallbacks.
 */
export function resolvePlanPriceId(
  planId: AgendixPlanId,
  currency: PlanCurrency,
  envGet: (key: string) => string | undefined | null,
  preferTestmode = false,
): string {
  for (const key of ENV_KEYS[currency][planId]) {
    const raw = envGet(key);
    if (typeof raw === 'string' && raw.trim().startsWith('price_')) {
      return raw.trim();
    }
  }
  const mode = (envGet('STRIPE_PRICE_MODE') || '').trim().toLowerCase();
  const useTest = preferTestmode || mode === 'test' || mode === 'testmode';
  return useTest
    ? TESTMODE_STRIPE_PRICE_BY_PLAN[currency][planId]
    : LIVE_STRIPE_PRICE_BY_PLAN[currency][planId];
}

export function planIdFromPriceId(priceId: string): AgendixPlanId | null {
  for (const currency of ['BRL', 'EUR'] as const) {
    for (const plan of ['solo', 'team'] as const) {
      if (
        LIVE_STRIPE_PRICE_BY_PLAN[currency][plan] === priceId
        || TESTMODE_STRIPE_PRICE_BY_PLAN[currency][plan] === priceId
      ) {
        return plan;
      }
    }
  }
  // Also match PRODUCTION / FALLBACK flat lists
  const liveIdx = (PRODUCTION_STRIPE_PRICE_IDS as readonly string[]).indexOf(priceId);
  if (liveIdx >= 0) return liveIdx % 2 === 0 ? 'solo' : 'team';
  const fbIdx = (FALLBACK_STRIPE_PRICE_IDS as readonly string[]).indexOf(priceId);
  if (fbIdx >= 0) return fbIdx % 2 === 0 ? 'solo' : 'team';
  return null;
}

export function regionToPlanCurrency(region: string | null | undefined): PlanCurrency {
  return region === 'PT' ? 'EUR' : 'BRL';
}
