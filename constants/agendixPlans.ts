export const AGENDIX_TRIAL_DAYS = 10;

export type AgendixPlanId = 'solo' | 'equipe';
export type AgendixCurrency = 'BRL' | 'EUR';

export interface AgendixPlanPrice {
  label: string;
  value: number;
  priceId: string;
}

export interface AgendixPlanDefinition {
  id: AgendixPlanId;
  name: string;
  audience: string;
  features: readonly string[];
  ctaSubscribe: string;
  ctaSwitch: string;
  pricing: Record<AgendixCurrency, AgendixPlanPrice>;
}

export const AGENDIX_PLAN_COPY = {
  pageTitle: 'Escolha o plano da sua casa',
  pageSubtitle:
    'Agenda, fila digital e o caixa do dia no mesmo lugar. Sem marketplace. Sem o cliente precisar baixar app.',
  pageHint:
    'Este é o plano do AgendiX — o sistema. O Clube é o que você vende para os seus clientes.',
  footer: 'Sem fidelidade. Cancele quando quiser.',
  footerHint: 'Troca de plano quando precisar — o limite é o tamanho da equipe, não o módulo.',
  currentPlan: 'Plano atual',
  equipeUpgradeClub: 'O Clube faz parte do plano Equipe.',
  equipeUpgradeInsights: 'As análises fazem parte do plano Equipe.',
  soloSeatLimit: 'O plano Solo inclui 1 profissional. Mude para Equipe para cadastrar a equipe.',
  equipeSeatLimit: 'O plano Equipe inclui até 5 profissionais.',
} as const;

export const AGENDIX_PLANS: Record<AgendixPlanId, AgendixPlanDefinition> = {
  solo: {
    id: 'solo',
    name: 'Solo',
    audience: 'Para quem atende sozinho.',
    features: [
      '1 profissional — você na cadeira',
      'Agenda e fila digital no mesmo celular',
      'O cliente marca pelo seu link, sem baixar nada',
      'Quem chega sem hora entra pelo QR, vê a vez e pode pagar no Pix',
      'Você vê o caixa do dia: o que entrou e o que saiu',
      'Clientes e estoque no mesmo lugar — sem caderno paralelo',
    ],
    ctaSubscribe: 'Assinar Solo',
    ctaSwitch: 'Mudar para Solo',
    pricing: {
      BRL: { label: 'R$ 34,90', value: 34.9, priceId: 'price_1SmKO0PUPmLLh2qEwaMMPA6i' },
      EUR: { label: '€ 9,90', value: 9.9, priceId: 'price_1SmKQPPUPmLLh2qEtjjlg2S1' },
    },
  },
  equipe: {
    id: 'equipe',
    name: 'Equipe',
    audience: 'Para quem tem 2 a 5 profissionais.',
    features: [
      'Até 5 profissionais na casa',
      'Tudo do Solo',
      'Cada um entra com o próprio login e vê a própria agenda',
      'Comissão fecha sozinha — sem briga no fim do mês',
      'Clube: o cliente paga mensal, você ganha recorrência',
      'Você vê no mês quem fatura, o que vende e o que cancela',
    ],
    ctaSubscribe: 'Assinar Equipe',
    ctaSwitch: 'Mudar para Equipe',
    pricing: {
      BRL: { label: 'R$ 59,90', value: 59.9, priceId: 'price_1SmKQPPUPmLLh2qEwY9lvQki' },
      EUR: { label: '€ 19,90', value: 19.9, priceId: 'price_1SmKQPPUPmLLh2qEomuqHXvt' },
    },
  },
};

export const AGENDIX_PLAN_COMPARISON = [
  { label: 'Profissionais', solo: '1', equipe: 'até 5' },
  { label: 'Agenda + link público', solo: 'Sim', equipe: 'Sim' },
  { label: 'Fila digital (QR, chamada, Pix)', solo: 'Sim', equipe: 'Sim' },
  { label: 'Caixa, clientes e produtos', solo: 'Sim', equipe: 'Sim' },
  { label: 'Login da equipe', solo: '—', equipe: 'Sim' },
  { label: 'Comissões', solo: '—', equipe: 'Sim' },
  { label: 'Clube de assinatura', solo: '—', equipe: 'Sim' },
  { label: 'Análises do mês', solo: '—', equipe: 'Sim' },
] as const;

export function parseAgendixPlan(value: unknown): AgendixPlanId | null {
  if (value === 'solo' || value === 'equipe') return value;
  if (value === 'team') return 'equipe';
  return null;
}

export function getPlanCta(
  planId: AgendixPlanId,
  input: { isTrial: boolean; isSubscriptionActive: boolean; currentPlan: AgendixPlanId | null },
): { label: string; disabled: boolean } {
  const plan = AGENDIX_PLANS[planId];
  const isCurrent = input.isSubscriptionActive && !input.isTrial && input.currentPlan === planId;
  if (isCurrent) {
    return { label: AGENDIX_PLAN_COPY.currentPlan, disabled: true };
  }
  if (input.isTrial || !input.isSubscriptionActive) {
    return { label: plan.ctaSubscribe, disabled: false };
  }
  return { label: plan.ctaSwitch, disabled: false };
}
