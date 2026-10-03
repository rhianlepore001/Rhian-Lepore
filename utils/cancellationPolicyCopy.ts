/** Copy da política de cancelamento lida pelo cliente (PR-1 / D3). Só tela. */

export const GENERATED_CANCELLATION_POLICY_TEXT =
  'Você pode cancelar pela Minha Área até o horário do atendimento. Não há cobrança automática.';

/** Textos antigos dos chips 24h/48h/72h — prometiam multa que o sistema não cobra. */
export const LEGACY_CANCELLATION_POLICY_TEMPLATES: Record<'flexible' | 'moderate' | 'strict', string> = {
  flexible:
    'Cancelamentos podem ser feitos com até 24h de antecedência sem custo. Cancelamentos com menos de 24h terão cobrança de 50% do valor.',
  moderate:
    'Cancelamentos devem ser feitos com 48h de antecedência. Cancelamentos tardios terão cobrança integral.',
  strict:
    'Cancelamentos com menos de 72h de antecedência não terão reembolso. Reagendamentos são permitidos uma vez.',
};

export function resolveCancellationPolicyDisplay(_stored: string | null | undefined): string {
  throw new Error('not implemented');
}

export function splitCancellationPolicyForEditor(_stored: string | null | undefined): {
  generated: string;
  notes: string;
} {
  throw new Error('not implemented');
}

export function composeCancellationPolicyForSave(_notes: string): string {
  throw new Error('not implemented');
}
