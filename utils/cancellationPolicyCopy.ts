/**
 * Política de cancelamento lida pelo cliente (PR-5 / D3).
 *
 * A frase principal é GERADA da regra real (`client_cancel_cutoff_hours`).
 * A coluna antiga `business_settings.cancellation_policy` NÃO é migrada.
 * Textos-enlatados (chips Flexível/Moderada/Rígida e o seed demo) nunca
 * aparecem na UI — match EXATO das strings abaixo. Texto livre antigo
 * vira observações só se não for um desses enlatados.
 */

import { DEFAULT_CLIENT_CANCEL_CUTOFF_HOURS } from './clientCancelCutoff';

/** Versão PR-1 (antes do cutoff). O editor descasca se ainda estiver concatenada. */
export const LEGACY_GENERATED_CANCELLATION_POLICY_TEXT =
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

/** Seed demo e outros textos 24h marcados, tratados como legado (não viram observações). */
export const LEGACY_CANCELLATION_POLICY_EXTRAS: readonly string[] = [
  'Cancelamentos com até 24h de antecedência sem custo. Dados fictícios [AGENDIX-DEMO].',
];

export const CANCELLATION_POLICY_NOTES_HINT =
  'Aparece para o cliente abaixo da política, como "Observações: …". Não prometa multa: o sistema não cobra.';

const POLICY_KEYS = new Set(['flexible', 'moderate', 'strict']);

export function generatedCancellationPolicyText(
  cutoffHours: number | null | undefined,
  businessName: string | null | undefined,
): string {
  const hours = Number.isFinite(cutoffHours) ? Math.trunc(cutoffHours as number) : DEFAULT_CLIENT_CANCEL_CUTOFF_HOURS;
  const name = (businessName ?? '').trim() || 'o estabelecimento';
  if (hours <= 0) return `Para cancelar, fale com ${name}.`;
  return `Você pode cancelar até ${hours}h antes pela Minha Área`;
}

/** @deprecated use generatedCancellationPolicyText — mantido para descascar texto PR-1. */
export const GENERATED_CANCELLATION_POLICY_TEXT = generatedCancellationPolicyText(2, '');

export const GENERATED_CANCELLATION_POLICY_VERSIONS: readonly string[] = [
  LEGACY_GENERATED_CANCELLATION_POLICY_TEXT,
];

function normalizePolicy(stored: string | null | undefined): string {
  return (stored ?? '').trim();
}

/**
 * Enlatado = chave flexible/moderate/strict, match EXATO dos parágrafos dos
 * chips, extra do seed demo, ou qualquer texto com [AGENDIX-DEMO].
 */
export function isLegacyCancellationPolicy(stored: string | null | undefined): boolean {
  const raw = normalizePolicy(stored);
  if (!raw) return true;
  if (POLICY_KEYS.has(raw.toLowerCase())) return true;
  if (raw.includes('[AGENDIX-DEMO]')) return true;
  if (LEGACY_CANCELLATION_POLICY_EXTRAS.includes(raw)) return true;
  return Object.values(LEGACY_CANCELLATION_POLICY_TEMPLATES).includes(raw);
}

function stripGeneratedVersions(raw: string): string {
  const versions = [
    ...GENERATED_CANCELLATION_POLICY_VERSIONS,
    LEGACY_GENERATED_CANCELLATION_POLICY_TEXT,
  ].sort((a, b) => b.length - a.length);
  let next = raw.trim();
  for (const version of versions) {
    if (next === version) return '';
    if (next.startsWith(version)) next = next.slice(version.length).trim();
  }
  next = next.replace(/^Você pode cancelar até \d+h antes pela Minha Área\s*/u, '').trim();
  next = next.replace(/^Para cancelar, fale com .+\.\s*/u, '').trim();
  return next;
}

/**
 * Observações: `client_cancel_note` (coluna nova) tem prioridade.
 * `null`/`undefined` = nunca gravada → cai no texto livre antigo se não for enlatado.
 * `''` = dono limpou o campo; não volta o legado.
 */
export function cancellationPolicyNotesForDisplay(
  clientCancelNote: string | null | undefined,
  legacyPolicy: string | null | undefined,
): string {
  if (clientCancelNote != null) return stripGeneratedVersions(clientCancelNote);
  const raw = normalizePolicy(legacyPolicy);
  if (!raw || isLegacyCancellationPolicy(raw)) return '';
  return stripGeneratedVersions(raw);
}

export function splitCancellationPolicyForEditor(stored: string | null | undefined): {
  generated: string;
  notes: string;
} {
  return {
    generated: generatedCancellationPolicyText(DEFAULT_CLIENT_CANCEL_CUTOFF_HOURS, ''),
    notes: cancellationPolicyNotesForDisplay(undefined, stored),
  };
}

/** Texto da política escrito pelo gestor (`client_cancel_policy_text`). */
export const MAX_CLIENT_CANCEL_POLICY_TEXT_LENGTH = 300;

/** Prefixo das observações para o cliente. */
export const CANCELLATION_POLICY_NOTES_PREFIX = 'Observações:';

/** Texto personalizado efetivo: aparado; vazio/só espaços = null (usa o gerado). */
export function normalizeCustomCancellationPolicyText(text: string | null | undefined): string | null {
  const trimmed = (text ?? '').trim();
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_CLIENT_CANCEL_POLICY_TEXT_LENGTH);
}

export interface CancellationPolicyDisplayInput {
  cutoffHours?: number | null;
  businessName?: string | null;
  clientCancelPolicyText?: string | null;
  clientCancelNote?: string | null;
  legacyPolicy?: string | null;
}

export interface CancellationPolicyParts {
  /** Frase principal: o texto do gestor ou, se vazio, a gerada do prazo. */
  policy: string;
  /** Observações (sem prefixo); '' quando não há. */
  notes: string;
  isCustom: boolean;
}

export function resolveCancellationPolicyParts(input: CancellationPolicyDisplayInput): CancellationPolicyParts {
  const custom = normalizeCustomCancellationPolicyText(input.clientCancelPolicyText);
  return {
    policy: custom ?? generatedCancellationPolicyText(input.cutoffHours, input.businessName),
    notes: cancellationPolicyNotesForDisplay(input.clientCancelNote, input.legacyPolicy),
    isCustom: custom != null,
  };
}

/** Texto único (política + "Observações: …"), para quem precisa de uma string. */
export function resolveCancellationPolicyDisplay(input: CancellationPolicyDisplayInput | string | null | undefined): string {
  if (input == null || typeof input === 'string') {
    const generated = generatedCancellationPolicyText(DEFAULT_CLIENT_CANCEL_CUTOFF_HOURS, '');
    const notes = cancellationPolicyNotesForDisplay(undefined, typeof input === 'string' ? input : null);
    return notes ? `${generated}\n\n${CANCELLATION_POLICY_NOTES_PREFIX} ${notes}` : generated;
  }
  const { policy, notes } = resolveCancellationPolicyParts(input);
  return notes ? `${policy}\n\n${CANCELLATION_POLICY_NOTES_PREFIX} ${notes}` : policy;
}

export function composeCancellationPolicyForSave(notes: string): string {
  return notes.trim();
}
