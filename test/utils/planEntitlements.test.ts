import { describe, expect, it } from 'vitest';
import {
  AGENDIX_PLAN_COMPARISON,
  AGENDIX_PLAN_COPY,
  AGENDIX_PLANS,
  AGENDIX_TRIAL_DAYS,
  getPlanCta,
  parseAgendixPlan,
} from '@/constants/agendixPlans';
import {
  EQUIPE_ENTITLEMENTS,
  SOLO_ENTITLEMENTS,
  canAddProfessional,
  resolvePlanEntitlements,
} from '@/utils/planEntitlements';

describe('planos AgendiX', () => {
  it('mantém 10 dias de trial e dois planos com copy de decisão', () => {
    expect(AGENDIX_TRIAL_DAYS).toBe(10);
    expect(AGENDIX_PLANS.solo.audience).toBe('Para quem atende sozinho.');
    expect(AGENDIX_PLANS.equipe.audience).toBe('Para quem tem 2 a 5 profissionais.');
    expect(AGENDIX_PLANS.solo.features).toHaveLength(6);
    expect(AGENDIX_PLANS.equipe.features[1]).toBe('Tudo do Solo');
    expect(AGENDIX_PLAN_COPY.pageTitle).toMatch(/plano da sua casa/i);
  });

  it('não promete lembrete, nota fiscal nem suporte prioritário', () => {
    const allText = [
      ...AGENDIX_PLANS.solo.features,
      ...AGENDIX_PLANS.equipe.features,
      AGENDIX_PLAN_COPY.pageSubtitle,
    ].join(' ').toLowerCase();
    expect(allText).not.toMatch(/whatsapp/);
    expect(allText).not.toMatch(/nfs-?e/);
    expect(allText).not.toMatch(/prioridade/);
    expect(allText).not.toMatch(/lembrete/);
  });

  it('parseia aliases e rejeita valor inválido', () => {
    expect(parseAgendixPlan('solo')).toBe('solo');
    expect(parseAgendixPlan('equipe')).toBe('equipe');
    expect(parseAgendixPlan('team')).toBe('equipe');
    expect(parseAgendixPlan('enterprise')).toBeNull();
    expect(parseAgendixPlan(null)).toBeNull();
  });

  it('trial e legado recebem Equipe; Solo pago limita cadeira e módulos', () => {
    expect(resolvePlanEntitlements({ isTrial: true, subscriptionPlan: 'solo' })).toEqual(EQUIPE_ENTITLEMENTS);
    expect(resolvePlanEntitlements({ isTrial: false, subscriptionPlan: null })).toEqual(EQUIPE_ENTITLEMENTS);
    expect(resolvePlanEntitlements({ isTrial: false, subscriptionPlan: 'solo' })).toEqual(SOLO_ENTITLEMENTS);
    expect(SOLO_ENTITLEMENTS.maxProfessionals).toBe(1);
    expect(EQUIPE_ENTITLEMENTS.maxProfessionals).toBe(5);
    expect(canAddProfessional(1, 1)).toBe(false);
    expect(canAddProfessional(5, 4)).toBe(true);
  });

  it('CTA distingue trial, plano atual e troca', () => {
    expect(getPlanCta('solo', { isTrial: true, isSubscriptionActive: true, currentPlan: null }).label).toBe('Assinar Solo');
    expect(getPlanCta('equipe', { isTrial: false, isSubscriptionActive: true, currentPlan: 'equipe' })).toEqual({
      label: 'Plano atual',
      disabled: true,
    });
    expect(getPlanCta('equipe', { isTrial: false, isSubscriptionActive: true, currentPlan: 'solo' }).label).toBe('Mudar para Equipe');
  });

  it('tabela compara o que muda de verdade', () => {
    const profissionais = AGENDIX_PLAN_COMPARISON.find((row) => row.label === 'Profissionais');
    const clube = AGENDIX_PLAN_COMPARISON.find((row) => row.label === 'Clube de assinatura');
    expect(profissionais).toEqual({ label: 'Profissionais', solo: '1', equipe: 'até 5' });
    expect(clube?.solo).toBe('—');
    expect(clube?.equipe).toBe('Sim');
  });
});
