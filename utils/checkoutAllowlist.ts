/**
 * Checkout allowlists shared with the Edge Function.
 */

export {
  DEFAULT_CHECKOUT_ORIGINS,
  collectAllowedOrigins,
  isAllowedReturnUrl,
} from '../supabase/functions/create-checkout-session/allowlist';

export const FALLBACK_STRIPE_PRICE_IDS = [
  'price_1UHfuLPUPmLLh2qEjVZ7g0hA', // Solo BRL
  'price_1UHfuMPUPmLLh2qEBQdKfGNv', // Team BRL
  'price_1UHfuNPUPmLLh2qEUiuYaUyN', // Solo EUR
  'price_1UHfuNPUPmLLh2qEaolUiKUI', // Team EUR
] as const;

/** Live Price IDs currently inlined on www.agendixstudio.com (Vercel VITE_STRIPE_PRICE_*). */
export const PRODUCTION_STRIPE_PRICE_IDS = [
  'price_1UHgTEBoBv5fVrkrYEFLfgBs', // Solo BRL
  'price_1UHgTFBoBv5fVrkr1pimlz7G', // Team BRL
  'price_1UHgTGBoBv5fVrkr4GO9Qa2x', // Solo EUR
  'price_1UHgTGBoBv5fVrkrY2JCGvs5', // Team EUR
] as const;

export function collectAllowedPriceIds(extra: Array<string | undefined | null> = []): Set<string> {
  const ids = new Set<string>([...FALLBACK_STRIPE_PRICE_IDS, ...PRODUCTION_STRIPE_PRICE_IDS]);
  for (const raw of extra) {
    if (typeof raw === 'string' && raw.trim().startsWith('price_')) {
      ids.add(raw.trim());
    }
  }
  return ids;
}

export function isAllowedPriceId(priceId: unknown, allowed: Set<string>): boolean {
  return typeof priceId === 'string' && allowed.has(priceId);
}

export function isAllowedCheckoutMode(mode: unknown): mode is 'subscription' {
  return mode === 'subscription' || mode === undefined || mode === null || mode === '';
}
