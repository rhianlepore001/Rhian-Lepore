import { describe, expect, it } from 'vitest';
import {
  daysRemaining,
  effectiveMembershipStatus,
  formatDatePt,
  periodProgressPercent,
  validityHeadline,
} from '@/utils/membershipValidity';

const NOW = new Date('2026-09-05T12:00:00.000Z');

describe('effectiveMembershipStatus', () => {
  it('marca active como overdue quando o vencimento já passou', () => {
    expect(effectiveMembershipStatus('active', '2026-09-01T00:00:00.000Z', NOW)).toBe('overdue');
  });

  it('mantém active quando ainda não venceu', () => {
    expect(effectiveMembershipStatus('active', '2026-10-01T00:00:00.000Z', NOW)).toBe('active');
  });

  it('não altera pending nem cancelled', () => {
    expect(effectiveMembershipStatus('pending', '2026-09-01T00:00:00.000Z', NOW)).toBe('pending');
    expect(effectiveMembershipStatus('cancelled', '2026-09-01T00:00:00.000Z', NOW)).toBe('cancelled');
  });
});

describe('daysRemaining', () => {
  it('conta dias até o fim do período', () => {
    expect(daysRemaining('2026-09-15T12:00:00.000Z', NOW)).toBe(10);
  });

  it('retorna null sem data', () => {
    expect(daysRemaining(null, NOW)).toBeNull();
  });
});

describe('periodProgressPercent', () => {
  it('calcula o progresso do período', () => {
    expect(
      periodProgressPercent('2026-09-01T12:00:00.000Z', '2026-10-01T12:00:00.000Z', NOW)
    ).toBe(13);
  });

  it('retorna null se faltar data', () => {
    expect(periodProgressPercent(null, '2026-10-01T00:00:00.000Z', NOW)).toBeNull();
  });
});

describe('validityHeadline', () => {
  it('explica pending sem inventar validade', () => {
    expect(validityHeadline('pending', '2026-10-01T00:00:00.000Z', NOW)).toMatch(/Pagamento pendente/);
  });

  it('mostra validade e dias restantes quando ativo', () => {
    const text = validityHeadline('active', '2026-09-15T12:00:00.000Z', NOW);
    expect(text).toContain(formatDatePt('2026-09-15T12:00:00.000Z'));
    expect(text).toMatch(/10 dias restantes/);
  });

  it('mostra vencimento quando atrasado', () => {
    expect(validityHeadline('overdue', '2026-09-01T00:00:00.000Z', NOW)).toMatch(/Venceu/);
  });
});
