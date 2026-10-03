/** Copy da política de cancelamento lida pelo cliente (PR-1 / D3). Só tela. */

export const GENERATED_CANCELLATION_POLICY_TEXT =
  'Você pode cancelar pela Minha Área até o horário do atendimento. Não há cobrança automática.';

/** Versões da frase gerada — o editor as descasca das observações (atual + anteriores). */
export const GENERATED_CANCELLATION_POLICY_VERSIONS: readonly string[] = [
  GENERATED_CANCELLATION_POLICY_TEXT,
];

/** Textos antigos dos chips 24h/48h/72h — prometiam multa que o sistema não cobra. */
export const LEGACY_CANCELLATION_POLICY_TEMPLATES: Record<'flexible' | 'moderate' | 'strict', string> = {
  flexible:
    'Cancelamentos podem ser feitos com até 24h de antecedência sem custo. Cancelamentos com menos de 24h terão cobrança de 50% do valor.',
  moderate:
    'Cancelamentos devem ser feitos com 48h de antecedência. Cancelamentos tardios terão cobrança integral.',
  strict:
    'Cancelamentos com menos de 72h de antecedência não terão reembolso. Reagendamentos são permitidos uma vez.',
};

/** Seed demo e outros textos 24h marcados, tratados como legado (não viram observações). */
export const LEGACY_CANCELLATION_POLICY_EXTRAS: readonly string[] = [
  'Cancelamentos com até 24h de antecedência sem custo. Dados fictícios [AGENDIX-DEMO].',
];

export const CANCELLATION_POLICY_NOTES_HINT =
  'Aparece abaixo da regra. Não prometa multa: o sistema não cobra.';

const POLICY_KEYS = new Set(['flexible', 'moderate', 'strict']);

function normalizePolicy(stored: string | null | undefined): string {
  return (stored ?? '').trim();
}

function isLegacyCancellationPolicy(stored: string | null | undefined): boolean {
  const raw = normalizePolicy(stored);
  if (!raw) return true;
  if (POLICY_KEYS.has(raw.toLowerCase())) return true;
  if (raw.includes('[AGENDIX-DEMO]')) return true;
  if (LEGACY_CANCELLATION_POLICY_EXTRAS.includes(raw)) return true;
  return Object.values(LEGACY_CANCELLATION_POLICY_TEMPLATES).includes(raw);
}

function stripGeneratedVersions(raw: string): string {
  const versions = [...GENERATED_CANCELLATION_POLICY_VERSIONS].sort((a, b) => b.length - a.length);
  for (const version of versions) {
    if (raw === version) return '';
    if (raw.startsWith(version)) return raw.slice(version.length).trim();
  }
  return raw;
}

export function splitCancellationPolicyForEditor(stored: string | null | undefined): {
  generated: string;
  notes: string;
} {
  const generated = GENERATED_CANCELLATION_POLICY_TEXT;
  const raw = normalizePolicy(stored);
  if (!raw || isLegacyCancellationPolicy(raw)) {
    return { generated, notes: '' };
  }
  return { generated, notes: stripGeneratedVersions(raw) };
}

export function resolveCancellationPolicyDisplay(stored: string | null | undefined): string {
  const { generated, notes } = splitCancellationPolicyForEditor(stored);
  return notes ? `${generated}\n\n${notes}` : generated;
}

export function composeCancellationPolicyForSave(notes: string): string {
  return notes.trim();
}
