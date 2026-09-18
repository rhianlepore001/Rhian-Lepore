import { describe, expect, it } from 'vitest';
import {
    PLAN_AMOUNTS,
    PLAN_PRICE_LABELS,
    getPlanPricing,
    regionToPlanCurrency,
} from '@/utils/planPricing';

describe('preços do plano AgendiX', () => {
    it('define Solo e Ilimitado/Equipe em BRL e EUR', () => {
        expect(PLAN_AMOUNTS.BRL.solo).toBe(19.99);
        expect(PLAN_AMOUNTS.BRL.team).toBe(28.99);
        expect(PLAN_AMOUNTS.EUR.solo).toBe(5.99);
        expect(PLAN_AMOUNTS.EUR.team).toBe(9.99);
    });

    it('exibe valores no formato local', () => {
        expect(PLAN_PRICE_LABELS.BRL.solo).toBe('R$ 19,99');
        expect(PLAN_PRICE_LABELS.BRL.team).toBe('R$ 28,99');
        expect(PLAN_PRICE_LABELS.EUR.solo).toBe('€ 5,99');
        expect(PLAN_PRICE_LABELS.EUR.team).toBe('€ 9,99');
    });

    it('mapeia região PT para euro e o restante para real', () => {
        expect(regionToPlanCurrency('PT')).toBe('EUR');
        expect(regionToPlanCurrency('BR')).toBe('BRL');
    });

    it('expõe labels e priceIds existentes sem inventar IDs novos', () => {
        const brl = getPlanPricing('BRL');
        const eur = getPlanPricing('EUR');

        expect(brl.solo.price).toBe('R$ 19,99');
        expect(brl.team.price).toBe('R$ 28,99');
        expect(eur.solo.price).toBe('€ 5,99');
        expect(eur.team.price).toBe('€ 9,99');

        expect(brl.solo.priceId).toMatch(/^price_/);
        expect(brl.team.priceId).toMatch(/^price_/);
        expect(eur.solo.priceId).toMatch(/^price_/);
        expect(eur.team.priceId).toMatch(/^price_/);
        expect(brl.solo.priceId).toBe('price_1SmKO0PUPmLLh2qEwaMMPA6i');
        expect(brl.team.priceId).toBe('price_1SmKQPPUPmLLh2qEwY9lvQki');
        expect(eur.solo.priceId).toBe('price_1SmKQPPUPmLLh2qEtjjlg2S1');
        expect(eur.team.priceId).toBe('price_1SmKQPPUPmLLh2qEomuqHXvt');
    });
});
