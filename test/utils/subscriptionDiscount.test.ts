import { describe, expect, it } from 'vitest';
import { computeSubscriptionDiscount } from '@/utils/subscriptionDiscount';

describe('computeSubscriptionDiscount', () => {
  it('sem plano ativo cobra o subtotal', () => {
    const result = computeSubscriptionDiscount({
      isActive: false,
      services: [{ id: 's1', price: 50 }],
    });
    expect(result.hasActiveSubscription).toBe(false);
    expect(result.canUseMembership).toBe(false);
    expect(result.finalCents).toBe(5000);
  });

  it('teto estourado não permite usar o clube', () => {
    const result = computeSubscriptionDiscount({
      isActive: true,
      planName: 'Corte',
      planServiceIds: ['s1'],
      services: [{ id: 's1', price: 50 }],
      usageLimit: 4,
      usageThisPeriod: 4,
    });
    expect(result.hasActiveSubscription).toBe(true);
    expect(result.canUseMembership).toBe(false);
    expect(result.finalCents).toBe(5000);
    expect(result.message).toContain('limite');
  });

  it('serviço no plano fica coberto', () => {
    const result = computeSubscriptionDiscount({
      isActive: true,
      planName: 'Corte Ilimitado',
      planServiceIds: ['s1'],
      services: [{ id: 's1', price: 50 }],
    });
    expect(result.fullyCovered).toBe(true);
    expect(result.canUseMembership).toBe(true);
    expect(result.finalCents).toBe(0);
  });
});
