import { describe, expect, it } from 'vitest';
import { planCardState } from '../../utils/planCardState';

describe('planCardState', () => {
  it('assinatura ativa: o plano atual fica marcado e sem checkout; o outro oferece a troca', () => {
    expect(planCardState('solo', { status: 'active', currentPlan: 'solo' })).toEqual({
      isCurrent: true, label: 'Seu plano atual', canCheckout: false,
    });
    expect(planCardState('team', { status: 'active', currentPlan: 'solo' })).toEqual({
      isCurrent: false, label: 'Mudar para Equipe', canCheckout: true,
    });
    expect(planCardState('solo', { status: 'active', currentPlan: 'team' }).label).toBe('Mudar para Solo');
  });

  it('trial sem assinatura: igual a hoje', () => {
    for (const p of ['solo', 'team'] as const) {
      expect(planCardState(p, { status: 'trial', currentPlan: null })).toEqual({
        isCurrent: false, label: 'Começar Assinatura', canCheckout: true,
      });
    }
  });

  it('ativo sem plano conhecido ou outros status: igual a hoje (Alterar Plano)', () => {
    expect(planCardState('solo', { status: 'active', currentPlan: null }).label).toBe('Alterar Plano');
    expect(planCardState('team', { status: 'past_due', currentPlan: 'team' })).toEqual({
      isCurrent: false, label: 'Alterar Plano', canCheckout: true,
    });
  });
});
