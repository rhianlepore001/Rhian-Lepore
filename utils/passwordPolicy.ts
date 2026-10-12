/**
 * Política única de senha do AgendiX (cadastro do dono, convite de colaborador,
 * nova senha da recuperação). Nenhuma tela deve ter regex/regra própria.
 *
 * Exigência (bloqueia o envio): pelo menos 8 caracteres E 1 letra maiúscula.
 * Número e símbolo NÃO são obrigatórios; só aumentam a força.
 *
 * Força (só depois de cumprir o mínimo):
 *  - "Senha fraca":  cumpre só o mínimo (sem número, sem símbolo e < 12 caracteres)
 *  - "Senha forte":  mínimo + (número OU símbolo OU 12+ caracteres)
 *  - "Muito forte":  mínimo + número + símbolo + 12+ caracteres
 * Senha fraca é aceita (o usuário decide); o indicador só orienta.
 *
 * Supabase Auth: o painel deve exigir no máximo isto (Minimum length 8,
 * Password requirements "No required characters"). Ver supabase/templates/README.md.
 */

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_LONG_LENGTH = 12;

export type PasswordRequirementId = 'length' | 'uppercase';
export type PasswordStrengthLevel = 'empty' | 'missing' | 'weak' | 'strong' | 'very_strong';

export interface PasswordRequirement {
  id: PasswordRequirementId;
  label: string;
  ok: boolean;
}

export interface PasswordAssessment {
  level: PasswordStrengthLevel;
  /** Cumpre a exigência mínima (pode enviar). */
  valid: boolean;
  requirements: PasswordRequirement[];
  /** Rótulos do que falta para cumprir o mínimo. */
  missing: string[];
  hasNumber: boolean;
  hasSymbol: boolean;
  isLong: boolean;
  /** 0–3 segmentos acesos no indicador. */
  score: 0 | 1 | 2 | 3;
  /** Texto curto do nível ("Senha fraca"…); vazio quando ainda falta o mínimo. */
  label: string;
  /** Dica do próximo passo, ou null. */
  tip: string | null;
}

const UPPER = /\p{Lu}/u;
const NUMBER = /\p{N}/u;
const SYMBOL = /[^\p{L}\p{N}]/u;

export const STRENGTH_LABEL: Record<'weak' | 'strong' | 'very_strong', string> = {
  weak: 'Senha fraca',
  strong: 'Senha forte',
  very_strong: 'Muito forte',
};

export function assessPassword(password: string): PasswordAssessment {
  const length = [...password].length;
  const requirements: PasswordRequirement[] = [
    { id: 'length', label: `${PASSWORD_MIN_LENGTH} caracteres`, ok: length >= PASSWORD_MIN_LENGTH },
    { id: 'uppercase', label: 'uma letra maiúscula', ok: UPPER.test(password) },
  ];
  const valid = requirements.every((r) => r.ok);
  const hasNumber = NUMBER.test(password);
  const hasSymbol = SYMBOL.test(password);
  const isLong = length >= PASSWORD_LONG_LENGTH;
  const missing = requirements.filter((r) => !r.ok).map((r) => r.label);

  if (!password) {
    return { level: 'empty', valid: false, requirements, missing, hasNumber, hasSymbol, isLong, score: 0, label: '', tip: null };
  }
  if (!valid) {
    return { level: 'missing', valid, requirements, missing, hasNumber, hasSymbol, isLong, score: 0, label: '', tip: null };
  }

  let level: 'weak' | 'strong' | 'very_strong' = 'weak';
  if (hasNumber && hasSymbol && isLong) level = 'very_strong';
  else if (hasNumber || hasSymbol || isLong) level = 'strong';

  const extras: string[] = [];
  if (!hasNumber) extras.push('um número');
  if (!hasSymbol) extras.push('um símbolo');
  if (!isLong) extras.push(`${PASSWORD_LONG_LENGTH}+ caracteres`);
  const tip =
    level === 'weak'
      ? 'Para ficar forte, use um número, um símbolo ou 12+ caracteres.'
      : level === 'strong'
        ? `Para ficar muito forte: ${joinPt(extras)}.`
        : null;

  return {
    level,
    valid,
    requirements,
    missing,
    hasNumber,
    hasSymbol,
    isLong,
    score: level === 'weak' ? 1 : level === 'strong' ? 2 : 3,
    label: STRENGTH_LABEL[level],
    tip,
  };
}

export function joinPt(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`;
}

/** Mensagem de bloqueio para o envio do formulário, ou null se a senha serve. */
export function passwordPolicyError(password: string): string | null {
  const a = assessPassword(password);
  if (a.valid) return null;
  return `A senha precisa de ${joinPt(a.missing.length ? a.missing : a.requirements.map((r) => r.label))}.`;
}

/** Texto curto da regra (para hints). */
export const PASSWORD_RULE_HINT = `Mínimo de ${PASSWORD_MIN_LENGTH} caracteres e uma letra maiúscula.`;

/**
 * Erro `weak_password` do Supabase Auth → pt-BR. O servidor manda
 * `weak_password.reasons` (length | characters | pwned) e uma mensagem em inglês.
 */
export function describeServerWeakPassword(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  const e = error as { code?: unknown; message?: unknown; reasons?: unknown; weak_password?: { reasons?: unknown } };
  const message = typeof e.message === 'string' ? e.message : '';
  const isWeak = (e.code === 'weak_password' || /password should|weak password|weak_password/i.test(message)) && !/different from|same_password/i.test(message);
  if (!isWeak) return null;
  const reasonsRaw = Array.isArray(e.reasons) ? e.reasons : Array.isArray(e.weak_password?.reasons) ? e.weak_password?.reasons : [];
  const reasons = new Set((reasonsRaw as unknown[]).map(String));
  if (reasons.has('pwned') || /pwned|leak|compromised/i.test(message)) {
    return 'Senha fraca: ela já apareceu em vazamentos de dados na internet. Escolha outra senha.';
  }
  const min = message.match(/at least (\d+) characters/i);
  if (reasons.has('length') || min) {
    return `Senha fraca: use pelo menos ${min ? min[1] : PASSWORD_MIN_LENGTH} caracteres.`;
  }
  if (reasons.has('characters') || /should contain/i.test(message)) {
    return 'Senha fraca: o servidor pediu outros tipos de caractere. Inclua também um número e um símbolo (ex.: ! ou #).';
  }
  return 'Senha fraca. Use pelo menos 8 caracteres e uma letra maiúscula.';
}
