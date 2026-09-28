/**
 * Janela de horários da Agenda (grade e wizard) a partir do horário de
 * funcionamento do dia.
 *
 * Regras:
 * - Primeira linha = min(abertura, início do primeiro agendamento do dia);
 *   fim = max(fechamento, término do último agendamento). Linhas de 30 min.
 * - Linhas fora do expediente (antes/depois, intervalo entre blocos) continuam
 *   na grade para encaixe, só marcadas como "fora do expediente".
 * - Dia fechado: estado "fechado" com a janela habitual da semana (menor
 *   abertura e maior fechamento dos dias abertos), toda fora do expediente.
 * - Sem horário configurado: grade antiga 06:00–24:00.
 *
 * O horário de funcionamento é hora de parede do negócio (`shopTimeZone`);
 * a Agenda exibe no fuso do dispositivo (`viewTimeZone`, mesma regra do
 * resto da grade). Os blocos são convertidos para o fuso de exibição.
 */
import type { BusinessHours } from '../types/settings';
import { formatTimeInTimeZone, getDateStringInTimeZone, zonedDateTimeToDate } from './businessTimezone';

const STEP = 30;
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
const LEGACY_START = 6 * 60;
const LEGACY_END = 24 * 60;
const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

export interface AgendaDayAppointment {
  appointment_time: string;
  duration_minutes?: number | null;
}

export interface AgendaDayWindowInput {
  /** Dia exibido (YYYY-MM-DD, calendário local). */
  dateStr: string;
  businessHours?: BusinessHours | null;
  /** Fuso do negócio (IANA). Sem valor: blocos lidos no fuso de exibição. */
  shopTimeZone?: string | null;
  /** Fuso de exibição (padrão: dispositivo). */
  viewTimeZone?: string;
  appointments?: AgendaDayAppointment[];
}

export interface AgendaDayWindow {
  /** Linhas da grade (HH:MM). */
  slots: string[];
  /** Linhas fora do expediente (subconjunto de `slots`). */
  offHours: string[];
  /** Horário final da grade (rótulo de fechamento, ex.: "18:00"). */
  endLabel: string;
  /** Negócio fechado neste dia (ou sem bloco válido). */
  closed: boolean;
  /** Existe horário de funcionamento configurado. */
  hasBusinessHours: boolean;
}

type Range = [number, number];

const pad = (n: number) => String(n).padStart(2, '0');
export const minutesToHHMM = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
};

function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function weekdayKey(dateStr: string): (typeof DAY_KEYS)[number] {
  const [y, m, d] = dateStr.split('-').map(Number);
  return DAY_KEYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

function hasAnyHours(hours: BusinessHours | null | undefined): hours is BusinessHours {
  return !!hours && typeof hours === 'object' && Object.keys(hours).length > 0;
}

/** Converte hora de parede do negócio para minutos do dia no fuso de exibição (0–1440). */
function shopWallToView(dateStr: string, hhmm: string, shopTz: string, viewTz: string, isEnd: boolean): number {
  if (shopTz === viewTz) return isEnd && hhmm === '00:00' ? LEGACY_END : toMinutes(hhmm);
  const instant = zonedDateTimeToDate(dateStr, hhmm, shopTz);
  const viewDate = getDateStringInTimeZone(instant, viewTz);
  if (viewDate > dateStr) return LEGACY_END;
  if (viewDate < dateStr) return 0;
  const mins = toMinutes(formatTimeInTimeZone(instant, viewTz));
  return isEnd && mins === 0 ? LEGACY_END : mins;
}

function dayRanges(hours: BusinessHours, dateStr: string, key: string, shopTz: string, viewTz: string): Range[] {
  const day = hours[key];
  if (!day?.isOpen || !Array.isArray(day.blocks)) return [];
  const out: Range[] = [];
  for (const b of day.blocks) {
    if (!b || !HHMM.test(b.start ?? '') || !(HHMM.test(b.end ?? '') || b.end === '24:00')) continue;
    const end = b.end === '24:00' ? '00:00' : b.end;
    if (b.end !== '24:00' && b.end !== '00:00' && toMinutes(end) <= toMinutes(b.start)) continue;
    const s = shopWallToView(dateStr, b.start, shopTz, viewTz, false);
    const e = shopWallToView(dateStr, end, shopTz, viewTz, true);
    if (e > s) out.push([s, e]);
  }
  return out.sort((a, b) => a[0] - b[0]);
}

/** Janela habitual da semana (para dia fechado): menor abertura e maior fechamento. */
function typicalRange(hours: BusinessHours, dateStr: string, shopTz: string, viewTz: string): Range | null {
  let lo = Infinity;
  let hi = -Infinity;
  for (const key of DAY_KEYS) {
    for (const [s, e] of dayRanges(hours, dateStr, key, shopTz, viewTz)) {
      lo = Math.min(lo, s);
      hi = Math.max(hi, e);
    }
  }
  return Number.isFinite(lo) && Number.isFinite(hi) ? [lo, hi] : null;
}

function appointmentRanges(apts: AgendaDayAppointment[], dateStr: string, viewTz: string): { ranges: Range[]; offStep: number[] } {
  const ranges: Range[] = [];
  const offStep: number[] = [];
  for (const a of apts) {
    const t = new Date(a.appointment_time);
    if (Number.isNaN(t.getTime()) || getDateStringInTimeZone(t, viewTz) !== dateStr) continue;
    const s = toMinutes(formatTimeInTimeZone(t, viewTz));
    const dur = a.duration_minutes && a.duration_minutes > 0 ? a.duration_minutes : STEP;
    ranges.push([s, Math.min(LEGACY_END, s + dur)]);
    if (s % STEP !== 0) offStep.push(s);
  }
  return { ranges, offStep };
}

const inRanges = (m: number, ranges: Range[]) => ranges.some(([s, e]) => m >= s && m < e);

export function buildAgendaDayWindow(input: AgendaDayWindowInput): AgendaDayWindow {
  const viewTz = input.viewTimeZone || deviceTimeZone();
  const shopTz = input.shopTimeZone || viewTz;
  const hours = input.businessHours;
  const hasBusinessHours = hasAnyHours(hours);
  const open = hasBusinessHours ? dayRanges(hours, input.dateStr, weekdayKey(input.dateStr), shopTz, viewTz) : [];
  const closed = hasBusinessHours && open.length === 0;

  let lo: number;
  let hi: number;
  if (!hasBusinessHours) {
    [lo, hi] = [LEGACY_START, LEGACY_END];
  } else if (!closed) {
    lo = open[0][0];
    hi = Math.max(...open.map((r) => r[1]));
  } else {
    [lo, hi] = typicalRange(hours, input.dateStr, shopTz, viewTz) ?? [LEGACY_START, LEGACY_END];
  }

  const { ranges, offStep } = appointmentRanges(input.appointments ?? [], input.dateStr, viewTz);
  for (const [s, e] of ranges) {
    lo = Math.min(lo, s);
    hi = Math.max(hi, e);
  }
  lo = Math.floor(lo / STEP) * STEP;
  hi = Math.min(LEGACY_END, Math.ceil(hi / STEP) * STEP);

  const mins: number[] = [];
  for (let m = lo; m < hi; m += STEP) mins.push(m);
  for (const m of offStep) if (!mins.includes(m)) mins.push(m);
  mins.sort((a, b) => a - b);

  const slots = mins.map(minutesToHHMM);
  const offHours = hasBusinessHours ? mins.filter((m) => closed || !inRanges(m, open)).map(minutesToHHMM) : [];
  return { slots, offHours, endLabel: minutesToHHMM(hi), closed, hasBusinessHours };
}

export interface WizardTimeSlotsInput extends Omit<AgendaDayWindowInput, 'appointments'> {
  /** Horários fora do passo de 30 min que precisam aparecer (ex.: prefill 14:15). */
  extraTimes?: string[];
}

export interface WizardTimeSlots {
  /** Dentro do expediente (ou o dia inteiro, sem horário configurado). */
  inHours: string[];
  /** Fora do expediente — encaixe (dia fechado: todos). */
  outOfHours: string[];
  closed: boolean;
  hasBusinessHours: boolean;
}

/** Horários do wizard: o dia inteiro, separado em dentro/fora do expediente. */
export function splitWizardTimeSlots(input: WizardTimeSlotsInput): WizardTimeSlots {
  const viewTz = input.viewTimeZone || deviceTimeZone();
  const shopTz = input.shopTimeZone || viewTz;
  const hours = input.businessHours;
  const hasBusinessHours = hasAnyHours(hours);
  const open = hasBusinessHours ? dayRanges(hours, input.dateStr, weekdayKey(input.dateStr), shopTz, viewTz) : [];
  const closed = hasBusinessHours && open.length === 0;

  const mins = new Set<number>();
  for (let m = 0; m < LEGACY_END; m += STEP) mins.add(m);
  for (const t of input.extraTimes ?? []) if (HHMM.test(t)) mins.add(toMinutes(t));
  const all = [...mins].sort((a, b) => a - b);

  if (!hasBusinessHours) return { inHours: all.map(minutesToHHMM), outOfHours: [], closed: false, hasBusinessHours };
  const inHours = closed ? [] : all.filter((m) => inRanges(m, open));
  const outOfHours = closed ? all : all.filter((m) => !inRanges(m, open));
  return { inHours: inHours.map(minutesToHHMM), outOfHours: outOfHours.map(minutesToHHMM), closed, hasBusinessHours };
}
