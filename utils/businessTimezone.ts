/**
 * Fuso horário fixo por estabelecimento.
 *
 * Regra de produto: cada negócio tem UM fuso (IANA). O agendamento online
 * mostra e grava horários nesse fuso, independentemente do fuso do navegador
 * do cliente. Default pela região do negócio (BR -> America/Sao_Paulo,
 * PT -> Europe/Lisbon); o dono pode trocar em Ajustes > Geral.
 *
 * Tudo aqui é Intl puro (sem dependências) e não usa o fuso do navegador,
 * a não ser em `dateStringToLocalDate`, que só serve para alimentar
 * componentes que trabalham com `Date` "de calendário" (ano/mês/dia locais).
 */

export const DEFAULT_TIMEZONE_BR = 'America/Sao_Paulo';
export const DEFAULT_TIMEZONE_PT = 'Europe/Lisbon';
/**
 * Fallback quando a região é desconhecida: America/Sao_Paulo.
 * - preserva o comportamento histórico (todo negócio não-PT já gravava -03:00);
 * - o Brasil é o mercado majoritário da base;
 * - o dono pode corrigir em Ajustes.
 */
export const FALLBACK_TIMEZONE = DEFAULT_TIMEZONE_BR;

export interface TimezoneOption {
  value: string;
  label: string;
  region: 'BR' | 'PT';
}

export const TIMEZONE_OPTIONS: TimezoneOption[] = [
  { value: 'America/Sao_Paulo', label: 'Brasília (SP, RJ, MG, Sul, Nordeste, GO, DF)', region: 'BR' },
  { value: 'America/Manaus', label: 'Amazonas (Manaus)', region: 'BR' },
  { value: 'America/Cuiaba', label: 'Mato Grosso (Cuiabá)', region: 'BR' },
  { value: 'America/Campo_Grande', label: 'Mato Grosso do Sul (Campo Grande)', region: 'BR' },
  { value: 'America/Porto_Velho', label: 'Rondônia (Porto Velho)', region: 'BR' },
  { value: 'America/Boa_Vista', label: 'Roraima (Boa Vista)', region: 'BR' },
  { value: 'America/Rio_Branco', label: 'Acre (Rio Branco)', region: 'BR' },
  { value: 'America/Noronha', label: 'Fernando de Noronha', region: 'BR' },
  { value: 'Europe/Lisbon', label: 'Portugal continental (Lisboa)', region: 'PT' },
  { value: 'Atlantic/Madeira', label: 'Madeira (Funchal)', region: 'PT' },
  { value: 'Atlantic/Azores', label: 'Açores (Ponta Delgada)', region: 'PT' },
];

const SELECTABLE_TIMEZONES = new Set(TIMEZONE_OPTIONS.map((o) => o.value));

/**
 * Só os fusos IANA oferecidos no seletor podem ser gravados pelo app.
 * (null = "seguir o padrão da região" é tratado por quem chama.)
 */
export function isSelectableTimeZone(tz: unknown): tz is string {
  return typeof tz === 'string' && SELECTABLE_TIMEZONES.has(tz);
}

const validityCache = new Map<string, boolean>();

export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== 'string' || tz.trim() === '') return false;
  const cached = validityCache.get(tz);
  if (cached !== undefined) return cached;
  let ok = false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    ok = true;
  } catch {
    ok = false;
  }
  validityCache.set(tz, ok);
  return ok;
}

export function defaultTimezoneForRegion(region: string | null | undefined): string {
  const r = (region ?? '').trim().toUpperCase();
  if (r === 'PT') return DEFAULT_TIMEZONE_PT;
  if (r === 'BR') return DEFAULT_TIMEZONE_BR;
  return FALLBACK_TIMEZONE;
}

/**
 * Fuso efetivo do negócio. Funciona antes e depois da migration
 * `business_settings.timezone`: sem coluna/valor (ou valor inválido) cai para
 * a região e, por fim, para America/Sao_Paulo.
 */
export function resolveBusinessTimezone(input: {
  timezone?: string | null;
  region?: string | null;
}): string {
  const tz = input.timezone?.trim();
  if (tz && isValidTimeZone(tz)) return tz;
  return defaultTimezoneForRegion(input.region);
}

export interface ZonedParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number; // 0-23
  minute: number;
  second: number;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(tz: string): Intl.DateTimeFormat {
  let f = formatterCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatterCache.set(tz, f);
  }
  return f;
}

/** Componentes de parede (ano…segundo) de um instante no fuso `tz`. */
export function getZonedParts(instant: Date | number | string, tz: string): ZonedParts {
  const date = instant instanceof Date ? instant : new Date(instant);
  const out: Record<string, number> = {};
  for (const p of partsFormatter(tz).formatToParts(date)) {
    if (p.type !== 'literal') out[p.type] = Number(p.value);
  }
  return {
    year: out.year,
    month: out.month,
    day: out.day,
    hour: out.hour === 24 ? 0 : out.hour,
    minute: out.minute,
    second: out.second,
  };
}

/** Offset (minutos, leste positivo) do fuso `tz` no instante dado. Ex.: São Paulo = -180. */
export function getTimeZoneOffsetMinutes(instant: Date | number | string, tz: string): number {
  const date = instant instanceof Date ? instant : new Date(instant);
  const p = getZonedParts(date, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  const truncated = Math.floor(date.getTime() / 1000) * 1000;
  return Math.round((asUtc - truncated) / 60000);
}

const pad = (n: number, len = 2) => String(Math.abs(n)).padStart(len, '0');

function formatOffset(minutes: number): string {
  const sign = minutes >= 0 ? '+' : '-';
  return `${sign}${pad(Math.floor(Math.abs(minutes) / 60))}:${pad(Math.abs(minutes) % 60)}`;
}

/** YYYY-MM-DD do instante no fuso `tz`. */
export function getDateStringInTimeZone(instant: Date | number | string, tz: string): string {
  const p = getZonedParts(instant, tz);
  return `${pad(p.year, 4)}-${pad(p.month)}-${pad(p.day)}`;
}

/** "Hoje" (YYYY-MM-DD) no fuso do negócio. */
export function getTodayInTimeZone(tz: string, now: Date | number = Date.now()): string {
  return getDateStringInTimeZone(now, tz);
}

/** HH:mm do instante no fuso `tz`. */
export function formatTimeInTimeZone(instant: Date | number | string, tz: string): string {
  const p = getZonedParts(instant, tz);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

/** Soma dias a um YYYY-MM-DD (aritmética de calendário, sem fuso). */
export function addDaysToDateString(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return `${pad(dt.getUTCFullYear(), 4)}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

/**
 * Converte data + hora de parede do negócio em ISO com o offset correto
 * daquele dia (respeita horário de verão). Ex.:
 *   zonedDateTimeToIso('2026-09-28', '10:00', 'Europe/Lisbon')   -> '2026-09-28T10:00:00+01:00'
 *   zonedDateTimeToIso('2026-12-28', '10:00', 'Europe/Lisbon')   -> '2026-12-28T10:00:00+00:00'
 *   zonedDateTimeToIso('2026-09-28', '23:30', 'America/Sao_Paulo') -> '2026-09-28T23:30:00-03:00'
 * Horário inexistente (salto do horário de verão) é empurrado para frente.
 */
export function zonedDateTimeToIso(dateStr: string, time: string, tz: string): string {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  const wallAsUtc = Date.UTC(y, mo - 1, d, h, mi || 0, 0);
  // Duas passadas: estima com o offset do "instante ingênuo" e refina.
  let offset = getTimeZoneOffsetMinutes(wallAsUtc, tz);
  const second = getTimeZoneOffsetMinutes(wallAsUtc - offset * 60000, tz);
  if (second !== offset) offset = second;
  const instant = wallAsUtc - offset * 60000;
  const p = getZonedParts(instant, tz);
  const finalOffset = getTimeZoneOffsetMinutes(instant, tz);
  return `${pad(p.year, 4)}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}:00${formatOffset(finalOffset)}`;
}

/** Instante (Date) de data + hora de parede no fuso `tz`. */
export function zonedDateTimeToDate(dateStr: string, time: string, tz: string): Date {
  return new Date(zonedDateTimeToIso(dateStr, time, tz));
}

/**
 * Date "de calendário" (meia-noite local do navegador) para um YYYY-MM-DD.
 * Só para componentes que usam getFullYear/getMonth/getDate (CalendarPicker).
 */
export function dateStringToLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

/** True se data+hora (parede do negócio) já passou (ou é agora). */
export function isZonedSlotInPast(
  dateStr: string,
  time: string,
  tz: string,
  now: Date | number = Date.now(),
): boolean {
  const nowMs = now instanceof Date ? now.getTime() : now;
  return zonedDateTimeToDate(dateStr, time, tz).getTime() <= nowMs;
}

/** Abreviação legível do fuso (ex.: "BRT", "GMT-3", "WEST"). */
export function getTimeZoneShortName(tz: string, instant: Date | number = Date.now()): string {
  try {
    const parts = new Intl.DateTimeFormat('pt-BR', { timeZone: tz, timeZoneName: 'short' }).formatToParts(
      instant instanceof Date ? instant : new Date(instant),
    );
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? tz;
  } catch {
    return tz;
  }
}
