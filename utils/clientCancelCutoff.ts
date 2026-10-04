/** Prazo para o cliente cancelar online (`business_settings.client_cancel_cutoff_hours`). */

export const CLIENT_CANCEL_CUTOFF_PRESETS = [1, 2, 6, 12, 24, 48, 0] as const;

export type ClientCancelCutoffHours = (typeof CLIENT_CANCEL_CUTOFF_PRESETS)[number];

export const DEFAULT_CLIENT_CANCEL_CUTOFF_HOURS = 2;
export const MAX_CLIENT_CANCEL_NOTE_LENGTH = 500;

/** 0 = o cliente não cancela online (só WhatsApp). */
export function isClientCancelCutoffPreset(hours: number): hours is ClientCancelCutoffHours {
  return (CLIENT_CANCEL_CUTOFF_PRESETS as readonly number[]).includes(hours);
}

export function clampClientCancelCutoffHours(value: number): ClientCancelCutoffHours {
  if (isClientCancelCutoffPreset(value)) return value;
  return DEFAULT_CLIENT_CANCEL_CUTOFF_HOURS;
}

export function cancelCutoffPresetLabel(hours: number): string {
  if (hours === 0) return 'Não pode cancelar online';
  return `${hours}h`;
}

export type ClientCancelCta = 'cancel' | 'whatsapp' | 'hidden';

function toMs(value: Date | string | number): number {
  if (typeof value === 'number') return value;
  if (value instanceof Date) return value.getTime();
  return new Date(value).getTime();
}

/**
 * Fonte da verdade no servidor: `now() <= appointment_time - cutoff`.
 * A UI replica a mesma regra em tempo absoluto (timestamptz / epoch), sem fuso.
 *
 * - horário já passou (`now >= appointment_time`) → sem botão
 * - Aguardando (pending) → Cancelar até o horário, mesmo com cutoff 0
 * - Confirmado + cutoff 0 → Falar com o negócio
 * - Confirmado + ainda dentro da janela → Cancelar
 * - Confirmado + janela fechada → Falar com o negócio
 */
export function clientCancelCta(input: {
  status: string;
  appointmentTime: Date | string | number;
  cutoffHours: number;
  now?: Date | string | number;
}): ClientCancelCta {
  const status = String(input.status ?? '').trim().toLowerCase();
  const appointmentMs = toMs(input.appointmentTime);
  const nowMs = toMs(input.now ?? Date.now());
  if (!Number.isFinite(appointmentMs) || !Number.isFinite(nowMs)) return 'hidden';
  if (appointmentMs <= nowMs) return 'hidden';
  if (status === 'pending') return 'cancel';
  if (status !== 'confirmed') return 'hidden';
  const cutoff = Number.isFinite(input.cutoffHours) ? Math.trunc(input.cutoffHours) : DEFAULT_CLIENT_CANCEL_CUTOFF_HOURS;
  if (cutoff <= 0) return 'whatsapp';
  const limitMs = appointmentMs - cutoff * 60 * 60 * 1000;
  return nowMs <= limitMs ? 'cancel' : 'whatsapp';
}

export function talkToBusinessLabel(businessName: string | null | undefined): string {
  const name = (businessName ?? '').trim() || 'o estabelecimento';
  return `Falar com ${name}`;
}

export function isCancelWindowClosedError(error: unknown): boolean {
  const raw = error && typeof error === 'object' ? error as {
    code?: string;
    message?: string;
    details?: string;
    hint?: string;
  } : { message: String(error ?? '') };
  const blob = `${raw.code ?? ''} ${raw.message ?? ''} ${raw.details ?? ''} ${raw.hint ?? ''}`.toLowerCase();
  return blob.includes('cancel_window_closed');
}

export const CANCEL_WINDOW_CLOSED_MESSAGE =
  'O prazo para cancelar online já passou. Fale com o estabelecimento.';

export function readCancelCutoffHours(raw: unknown): number {
  const n = Number(raw);
  return Number.isFinite(n) ? Math.trunc(n) : DEFAULT_CLIENT_CANCEL_CUTOFF_HOURS;
}
