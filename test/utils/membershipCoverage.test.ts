import { describe, expect, it } from 'vitest';
import { applyMembershipCoverage } from '@/utils/membershipCoverage';

const corte = { id: 's1', name: 'Corte', price: 50 };
const barba = { id: 's2', name: 'Barba', price: 30 };

describe('applyMembershipCoverage', () => {
  it('sem teto: cobre serviços do plano', () => {
    const result = applyMembershipCoverage({
      services: [corte, barba],
      planServiceIds: ['s1', 's2'],
      planName: 'Gold',
      usageLimitPerMonth: null,
      usageThisPeriod: 0,
    });
    expect(result.fullyCovered).toBe(true);
    expect(result.finalCents).toBe(0);
    expect(result.remainingUses).toBeNull();
  });

  it('teto atingido: cobra o atendimento inteiro', () => {
    const result = applyMembershipCoverage({
      services: [corte],
      planServiceIds: ['s1'],
      planName: 'Silver',
      usageLimitPerMonth: 4,
      usageThisPeriod: 4,
    });
    expect(result.fullyCovered).toBe(false);
    expect(result.finalCents).toBe(5000);
    expect(result.remainingUses).toBe(0);
    expect(result.message).toContain('Limite');
  });

  it('ainda tem usos: cobre e informa restantes', () => {
    const result = applyMembershipCoverage({
      services: [corte],
      planServiceIds: ['s1'],
      planName: 'Silver',
      usageLimitPerMonth: 4,
      usageThisPeriod: 2,
    });
    expect(result.fullyCovered).toBe(true);
    expect(result.finalCents).toBe(0);
    expect(result.remainingUses).toBe(2);
    expect(result.message).toContain('2 usos restantes');
  });
});
