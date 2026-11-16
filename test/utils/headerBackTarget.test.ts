import { describe, expect, it } from 'vitest';
import { resolveHeaderBackTarget } from '../../utils/headerBackTarget';

describe('resolveHeaderBackTarget', () => {
  it('Performance da equipe volta ao Financeiro (Pagamentos)', () => {
    expect(resolveHeaderBackTarget('/financeiro/performance')).toEqual({
      to: '/financeiro?tab=commissions',
      label: 'Voltar ao Financeiro',
    });
  });

  it('sub-rota futura do Financeiro também volta ao Financeiro', () => {
    expect(resolveHeaderBackTarget('/financeiro/qualquer')).toEqual({
      to: '/financeiro?tab=commissions',
      label: 'Voltar ao Financeiro',
    });
  });

  it('Home não é sub-página — fallback início', () => {
    expect(resolveHeaderBackTarget('/agenda').to).toBe('/');
    expect(resolveHeaderBackTarget('/meus-insights').to).toBe('/');
  });

  it('Resultados por hora — gestor volta à performance', () => {
    expect(resolveHeaderBackTarget('/resultados-por-hora')).toEqual({
      to: '/financeiro/performance',
      label: 'Voltar à performance da equipe',
    });
  });

  it('Resultados por hora — colaborador volta a Meus resultados', () => {
    expect(resolveHeaderBackTarget('/resultados-por-hora', 'staff')).toEqual({
      to: '/meus-insights',
      label: 'Voltar a Meus resultados',
    });
  });
});
