import type { Region } from './formatters';

export type PlanCurrency = 'BRL' | 'EUR';
export type AgendixPlanId = 'solo' | 'team';

/**
 * Preços mensais oficiais do plano AgendiX (não o clube de assinatura dos clientes).
 * `team` é o plano Equipe / Ilimitado — a chave permanece `team` para não mudar semantics no código.
 */
export const PLAN_AMOUNTS = {
    BRL: {
        solo: 19.99,
        team: 28.99,
    },
    EUR: {
        solo: 5.99,
        team: 9.99,
    },
} as const;

export const PLAN_PRICE_LABELS = {
    BRL: {
        solo: 'R$ 19,99',
        team: 'R$ 28,99',
    },
    EUR: {
        solo: '€ 5,99',
        team: '€ 9,99',
    },
} as const;

/**
 * Fallbacks = Price IDs criados no Stripe **testmode** (20 Set 2026) alinhados aos
 * valores oficiais. Em produção (chave live na Vercel), defina as envs abaixo com
 * IDs live equivalentes — testmode IDs não cobram em livemode.
 *
 * VITE_STRIPE_PRICE_SOLO_BRL  → Solo BRL 19,99
 * VITE_STRIPE_PRICE_TEAM_BRL  → Equipe/Ilimitado BRL 28,99
 * VITE_STRIPE_PRICE_SOLO_EUR  → Solo EUR 5,99
 * VITE_STRIPE_PRICE_TEAM_EUR  → Equipe/Ilimitado EUR 9,99
 */
const FALLBACK_STRIPE_PRICE_IDS = {
    BRL: {
        solo: 'price_1UHfuLPUPmLLh2qEjVZ7g0hA',
        team: 'price_1UHfuMPUPmLLh2qEBQdKfGNv',
    },
    EUR: {
        solo: 'price_1UHfuNPUPmLLh2qEUiuYaUyN',
        team: 'price_1UHfuNPUPmLLh2qEaolUiKUI',
    },
} as const;

const STRIPE_PRICE_ENV_KEYS: Record<PlanCurrency, Record<AgendixPlanId, string>> = {
    BRL: {
        solo: 'VITE_STRIPE_PRICE_SOLO_BRL',
        team: 'VITE_STRIPE_PRICE_TEAM_BRL',
    },
    EUR: {
        solo: 'VITE_STRIPE_PRICE_SOLO_EUR',
        team: 'VITE_STRIPE_PRICE_TEAM_EUR',
    },
};

function readEnvPriceId(envKey: string, fallback: string): string {
    const value = (import.meta.env as Record<string, string | undefined>)[envKey];
    if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
    }
    return fallback;
}

export function regionToPlanCurrency(region: Region): PlanCurrency {
    return region === 'PT' ? 'EUR' : 'BRL';
}

export function getPlanStripePriceId(currency: PlanCurrency, planId: AgendixPlanId): string {
    return readEnvPriceId(
        STRIPE_PRICE_ENV_KEYS[currency][planId],
        FALLBACK_STRIPE_PRICE_IDS[currency][planId],
    );
}

export function getPlanPricing(currency: PlanCurrency) {
    return {
        solo: {
            amount: PLAN_AMOUNTS[currency].solo,
            price: PLAN_PRICE_LABELS[currency].solo,
            priceId: getPlanStripePriceId(currency, 'solo'),
        },
        team: {
            amount: PLAN_AMOUNTS[currency].team,
            price: PLAN_PRICE_LABELS[currency].team,
            priceId: getPlanStripePriceId(currency, 'team'),
        },
    };
}
