import type { BusinessRemainderNoun } from './businessCopy';
import { getVisualStatus } from './appointmentStatus';
import { getDateStringInTimeZone, formatTimeInTimeZone, getTodayInTimeZone, addDaysToDateString } from './businessTimezone';

/**
 * Exclusão de profissional (Configurações › Equipe → delete_staff_collaborator).
 * Códigos que o servidor devolve e a tela traduz — nunca mostrar o erro cru.
 */
export const STAFF_HAS_OPEN_APPOINTMENTS = 'STAFF_HAS_OPEN_APPOINTMENTS';
export const STAFF_LEGACY_LINKED_RECORDS = 'STAFF_LEGACY_LINKED_RECORDS';

/** Servidor recusou: o profissional ainda tem atendimento em aberto. */
export class StaffHasOpenAppointmentsError extends Error {
  /** Contagem do servidor (DETAIL open_count=N); null se não veio. */
  readonly openCount: number | null;

  constructor(openCount: number | null) {
    super(STAFF_HAS_OPEN_APPOINTMENTS);
    this.name = 'StaffHasOpenAppointmentsError';
    this.openCount = openCount;
  }
}

/** Registros antigos (user_id = perfil do colaborador) impedem apagar o acesso (FK 23503). */
export class StaffLegacyLinkedRecordsError extends Error {
  constructor() {
    super(STAFF_LEGACY_LINKED_RECORDS);
    this.name = 'StaffLegacyLinkedRecordsError';
  }
}

interface RawRpcError {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
}

function asRaw(error: unknown): RawRpcError {
  return error && typeof error === 'object' ? (error as RawRpcError) : { message: String(error ?? '') };
}

export function isStaffHasOpenAppointmentsError(error: unknown): boolean {
  const raw = asRaw(error);
  return (raw.message ?? '').includes(STAFF_HAS_OPEN_APPOINTMENTS) || raw.hint === 'staff_has_open_appointments';
}

/** "open_count=3" → 3. */
export function parseOpenCount(details: string | null | undefined): number | null {
  const match = /open_count=(\d+)/.exec(details ?? '');
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function openCountFromError(error: unknown): number | null {
  return parseOpenCount(asRaw(error).details);
}

export function isStaffLegacyLinkError(error: unknown): boolean {
  return asRaw(error).code === '23503';
}

export const STAFF_LEGACY_LINKED_MESSAGE =
  'Não deu para excluir: este profissional tem registros antigos ligados ao acesso dele. Nada foi apagado. Fale com o suporte para resolvermos.';

/** Atendimento em aberto para listar no aviso. */
export interface OpenAppointment {
  id: string;
  appointment_time: string;
  status: string;
  service: string | null;
  duration_minutes: number | null;
  client_name: string | null;
}

/** "da barbearia" / "do salão" / "do estúdio" / "do negócio". */
export function businessOfLabel(remainder: Pick<BusinessRemainderNoun, 'article' | 'noun'>): string {
  return `${remainder.article === 'a' ? 'da' : 'do'} ${remainder.noun}`;
}

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

export function openAppointmentsCopy(
  count: number,
  memberName: string,
  remainder: Pick<BusinessRemainderNoun, 'article' | 'noun'>,
): { title: string; lead: string; action: string } {
  const name = memberName.trim() || 'Este profissional';
  const n = Math.max(1, count);
  return {
    title: 'Ainda há atendimentos em aberto',
    lead: `${name} ainda tem ${n} ${plural(n, 'atendimento em aberto', 'atendimentos em aberto')}.`,
    action: `Para excluir, ${plural(n, 'finalize o atendimento', 'finalize cada um')} ou passe para outro profissional ${businessOfLabel(remainder)}.`,
  };
}

export function moreAppointmentsLabel(rest: number): string {
  return `e mais ${rest} ${plural(rest, 'atendimento', 'atendimentos')}`;
}

/** Atrasado = mesma regra da Agenda (horário + duração + tolerância, sem finalizar). */
export function isOpenAppointmentLate(apt: Pick<OpenAppointment, 'status' | 'appointment_time' | 'duration_minutes'>, now: Date = new Date()): boolean {
  return getVisualStatus(apt, now) === 'overdue';
}

const WEEKDAY_FMT_CACHE = new Map<string, Intl.DateTimeFormat>();
function weekdayDate(iso: string, timeZone: string): string {
  let fmt = WEEKDAY_FMT_CACHE.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('pt-BR', { timeZone, weekday: 'short', day: '2-digit', month: '2-digit' });
    WEEKDAY_FMT_CACHE.set(timeZone, fmt);
  }
  // "Dom., 05/07" (maiúscula como Hoje/Ontem/Amanhã)
  const label = fmt.format(new Date(iso));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** "Hoje · 14:30", "Ontem · 09:00", "Amanhã · 10:15" ou "Dom., 05/07 · 11:00" (fuso do negócio). */
export function formatOpenAppointmentWhen(iso: string, timeZone: string, now: Date = new Date()): string {
  const day = getDateStringInTimeZone(iso, timeZone);
  const today = getTodayInTimeZone(timeZone, now);
  const time = formatTimeInTimeZone(iso, timeZone);
  let label: string;
  if (day === today) label = 'Hoje';
  else if (day === addDaysToDateString(today, -1)) label = 'Ontem';
  else if (day === addDaysToDateString(today, 1)) label = 'Amanhã';
  else label = weekdayDate(iso, timeZone);
  return `${label} · ${time}`;
}

/** Deep link da Agenda: dia certo (fuso do negócio) + abre o atendimento. */
export function agendaAppointmentLink(apt: Pick<OpenAppointment, 'id' | 'appointment_time'>, timeZone: string): string {
  const date = getDateStringInTimeZone(apt.appointment_time, timeZone);
  return `/agenda?date=${date}&appointment=${encodeURIComponent(apt.id)}`;
}
