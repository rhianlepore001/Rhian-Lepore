import { formatCurrency, type Region } from './formatters';
import { getZonedParts, zonedDateTimeToIso } from './businessTimezone';

export const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
] as const;

export const MONTH_ABBREV = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
] as const;

export const SMALL_PREV_REVENUE_RATIO = 0.1;
export const SMALL_PREV_RECORD_COUNT = 5;
export const SMALL_PREV_MONTH_COPY = 'Mês anterior com pouco movimento';
export const MIN_BAR_HEIGHT = 2;
export const BAR_GAP_PX = 2;
export const BAR_TOP_RADIUS = 3;
export const DESKTOP_MAX_BAR_WIDTH = 12;

const pad2 = (n: number) => String(n).padStart(2, '0');

export interface MonthRangeIso {
  startIso: string;
  endIso: string;
}

/** Intervalo [start, end) do mês civil no fuso do negócio, ISO com offset. */
export function getZonedMonthRange(
  year: number,
  monthIndex: number,
  timeZone: string,
): MonthRangeIso {
  const startDate = `${year}-${pad2(monthIndex + 1)}-01`;
  const nextMonthIndex = monthIndex === 11 ? 0 : monthIndex + 1;
  const nextYear = monthIndex === 11 ? year + 1 : year;
  const endDate = `${nextYear}-${pad2(nextMonthIndex + 1)}-01`;
  return {
    startIso: zonedDateTimeToIso(startDate, '00:00', timeZone),
    endIso: zonedDateTimeToIso(endDate, '00:00', timeZone),
  };
}

export function previousMonthIndex(year: number, monthIndex: number): { year: number; monthIndex: number } {
  if (monthIndex === 0) return { year: year - 1, monthIndex: 11 };
  return { year, monthIndex: monthIndex - 1 };
}

export function isInstantInRange(
  instant: Date | string | number,
  startIso: string,
  endIso: string,
): boolean {
  const t = instant instanceof Date ? instant.getTime() : Date.parse(String(instant));
  if (!Number.isFinite(t)) return false;
  return t >= Date.parse(startIso) && t < Date.parse(endIso);
}

export function daysInCalendarMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/** 0 = segunda … 6 = domingo, em calendário UTC (dia civil, sem fuso do browser). */
export function weekdayMon0(year: number, month1to12: number, day: number): number {
  const sun0 = new Date(Date.UTC(year, month1to12 - 1, day)).getUTCDay();
  return (sun0 + 6) % 7;
}

export interface CashflowTxn {
  instant: Date | string | number;
  type: 'revenue' | 'expense';
  amount: number;
}

export interface DayBucket {
  key: string;
  label: string;
  day: number;
  receita: number;
  despesas: number;
  sobrou: number;
}

export interface WeekBucket {
  key: string;
  label: string;
  weekIndex: number;
  startDay: number;
  endDay: number;
  receita: number;
  despesas: number;
  sobrou: number;
}

export function calcSobrou(entradas: number, saidas: number): number {
  return entradas - saidas;
}

export function formatSobrou(value: number, region: Region): string {
  const formatted = formatCurrency(Math.abs(value), region);
  return value < 0 ? `−${formatted}` : formatted;
}

export function formatMonthGrowth(input: {
  currentRevenue: number;
  previousRevenue: number;
  previousRecords: number;
}): string {
  const { currentRevenue, previousRevenue, previousRecords } = input;
  if (currentRevenue === 0 && previousRevenue === 0) return '0,0%';
  const previousTooSmall =
    previousRecords < SMALL_PREV_RECORD_COUNT
    || (currentRevenue > 0 && previousRevenue < currentRevenue * SMALL_PREV_REVENUE_RATIO)
    || previousRevenue <= 0;
  if (previousTooSmall) return SMALL_PREV_MONTH_COPY;
  const pct = ((currentRevenue - previousRevenue) / previousRevenue) * 100;
  const abs = Math.abs(pct).toFixed(1).replace('.', ',');
  if (pct > 0) return `+${abs}%`;
  if (pct < 0) return `−${abs}%`;
  return '0,0%';
}

export function bucketMonthByDays(
  transactions: CashflowTxn[],
  year: number,
  monthIndex: number,
  timeZone: string,
): DayBucket[] {
  const count = daysInCalendarMonth(year, monthIndex);
  const { startIso, endIso } = getZonedMonthRange(year, monthIndex, timeZone);
  const days: DayBucket[] = Array.from({ length: count }, (_, i) => ({
    key: pad2(i + 1),
    label: String(i + 1),
    day: i + 1,
    receita: 0,
    despesas: 0,
    sobrou: 0,
  }));

  for (const t of transactions) {
    if (!isInstantInRange(t.instant, startIso, endIso)) continue;
    const parts = getZonedParts(t.instant, timeZone);
    const idx = parts.day - 1;
    if (idx < 0 || idx >= count) continue;
    const amount = t.amount || 0;
    if (t.type === 'expense') days[idx].despesas += amount;
    else days[idx].receita += amount;
  }

  for (const d of days) d.sobrou = calcSobrou(d.receita, d.despesas);
  return days;
}

export function bucketDaysByWeeks(
  days: DayBucket[],
  year: number,
  monthIndex: number,
): WeekBucket[] {
  const firstWeekday = weekdayMon0(year, monthIndex + 1, 1);
  const weeks: WeekBucket[] = [];

  for (const d of days) {
    const weekIndex = Math.floor((d.day - 1 + firstWeekday) / 7);
    let week = weeks[weekIndex];
    if (!week) {
      week = {
        key: `S${weekIndex + 1}`,
        label: `S${weekIndex + 1}`,
        weekIndex,
        startDay: d.day,
        endDay: d.day,
        receita: 0,
        despesas: 0,
        sobrou: 0,
      };
      weeks[weekIndex] = week;
    }
    week.endDay = d.day;
    week.receita += d.receita;
    week.despesas += d.despesas;
  }

  return weeks.filter(Boolean).map((w) => ({
    ...w,
    sobrou: calcSobrou(w.receita, w.despesas),
  }));
}

export function showDayAxisLabel(day: number, daysInMonth: number): boolean {
  return day === 1 || day % 5 === 0 || day === daysInMonth;
}

export function formatCashflowSummary(
  startDay: number,
  endDay: number,
  monthIndex: number,
  receita: number,
  despesas: number,
  region: Region,
): string {
  const abbrev = MONTH_ABBREV[monthIndex] ?? '';
  const range = startDay === endDay
    ? `${startDay} ${abbrev}`
    : `${startDay}–${endDay} ${abbrev}`;
  return `${range} · Entradas ${formatCurrency(receita, region)} · Saídas ${formatCurrency(despesas, region)} · Sobrou ${formatSobrou(calcSobrou(receita, despesas), region)}`;
}

export function niceCeiling(value: number): number {
  if (value <= 0) return 1;
  const exp = Math.floor(Math.log10(value));
  const frac = value / 10 ** exp;
  let niceFrac: number;
  if (frac <= 1) niceFrac = 1;
  else if (frac <= 2) niceFrac = 2;
  else if (frac <= 2.5) niceFrac = 2.5;
  else if (frac <= 5) niceFrac = 5;
  else niceFrac = 10;
  return niceFrac * 10 ** exp;
}

export function yAxisTicks(maxValue: number): [number, number, number] {
  const top = niceCeiling(maxValue);
  return [0, top / 2, top];
}

export function formatYTick(value: number): string {
  if (value === 0) return '0';
  if (value >= 1000) {
    const k = value / 1000;
    return Number.isInteger(k) ? `${k}k` : `${k.toFixed(1).replace('.', ',')}k`;
  }
  if (Number.isInteger(value)) return String(value);
  return String(value).replace('.', ',');
}

export function barHeight(value: number, yMax: number, plotHeight: number, minHeight = MIN_BAR_HEIGHT): number {
  if (value <= 0 || yMax <= 0 || plotHeight <= 0) return 0;
  return Math.max((value / yMax) * plotHeight, minHeight);
}

export function roundedTopBarPath(x: number, y: number, w: number, h: number, r = BAR_TOP_RADIUS): string {
  if (w <= 0 || h <= 0) return '';
  const radius = Math.min(r, w / 2, h);
  if (radius <= 0) {
    return `M${x} ${y + h}H${x + w}V${y}H${x}Z`;
  }
  return [
    `M${x} ${y + h}`,
    `L${x} ${y + radius}`,
    `Q${x} ${y} ${x + radius} ${y}`,
    `L${x + w - radius} ${y}`,
    `Q${x + w} ${y} ${x + w} ${y + radius}`,
    `L${x + w} ${y + h}`,
    'Z',
  ].join(' ');
}

export interface BarGeom {
  key: string;
  dataIndex: number;
  series: 'income' | 'expense';
  x: number;
  y: number;
  width: number;
  height: number;
  d: string;
}

export interface CategoryHit {
  dataIndex: number;
  x: number;
  width: number;
}

export interface CashflowLayout {
  bars: BarGeom[];
  hits: CategoryHit[];
  yMax: number;
  ticks: [number, number, number];
}

export function layoutCashflowBars(
  points: Array<{ key: string; receita: number; despesas: number }>,
  opts: {
    plotWidth: number;
    plotHeight: number;
    maxBarWidth?: number;
    barGap?: number;
    minHeight?: number;
  },
): CashflowLayout {
  const plotWidth = Math.max(opts.plotWidth, 1);
  const plotHeight = Math.max(opts.plotHeight, 1);
  const maxBarWidth = opts.maxBarWidth ?? DESKTOP_MAX_BAR_WIDTH;
  const barGap = opts.barGap ?? BAR_GAP_PX;
  const minHeight = opts.minHeight ?? MIN_BAR_HEIGHT;
  const n = points.length;
  const rawMax = points.reduce((m, p) => Math.max(m, p.receita || 0, p.despesas || 0), 0);
  const ticks = yAxisTicks(rawMax);
  const yMax = ticks[2];

  if (n === 0) return { bars: [], hits: [], yMax, ticks };

  const slot = plotWidth / n;
  const pairBudget = Math.max(slot * 0.78, barGap + 4);
  const barW = Math.max(2, Math.min(maxBarWidth, (pairBudget - barGap) / 2));
  const pairW = barW * 2 + barGap;

  const bars: BarGeom[] = [];
  const hits: CategoryHit[] = [];

  for (let i = 0; i < n; i++) {
    const p = points[i];
    const slotX = i * slot;
    hits.push({ dataIndex: i, x: slotX, width: slot });

    const hIn = barHeight(p.receita, yMax, plotHeight, minHeight);
    const hOut = barHeight(p.despesas, yMax, plotHeight, minHeight);
    const hasIn = p.receita > 0;
    const hasOut = p.despesas > 0;
    const pairX = slotX + (slot - pairW) / 2;
    const singleX = slotX + (slot - barW) / 2;

    if (hasIn) {
      const x = hasOut ? pairX : singleX;
      const y = plotHeight - hIn;
      bars.push({
        key: `${p.key}-in`,
        dataIndex: i,
        series: 'income',
        x,
        y,
        width: barW,
        height: hIn,
        d: roundedTopBarPath(x, y, barW, hIn),
      });
    }
    if (hasOut) {
      const x = hasIn ? pairX + barW + barGap : singleX;
      const y = plotHeight - hOut;
      bars.push({
        key: `${p.key}-out`,
        dataIndex: i,
        series: 'expense',
        x,
        y,
        width: barW,
        height: hOut,
        d: roundedTopBarPath(x, y, barW, hOut),
      });
    }
  }

  return { bars, hits, yMax, ticks };
}

export function withAlpha(color: string, alpha: number): string {
  const hex = color.trim();
  const hexMatch = /^#?([0-9a-fA-F]{6})$/.exec(hex);
  if (hexMatch) {
    const n = parseInt(hexMatch[1], 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  }
  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(hex);
  if (rgb) return `rgba(${rgb[1]},${rgb[2]},${rgb[3]},${alpha})`;
  return `rgba(128,128,128,${alpha})`;
}

export function monthAriaLabel(
  periodLabel: string,
  receita: number,
  despesas: number,
  region: Region,
): string {
  const sobrou = calcSobrou(receita, despesas);
  return `${periodLabel}: entradas ${formatCurrency(receita, region)}, saídas ${formatCurrency(despesas, region)}, sobrou ${formatSobrou(sobrou, region)}`;
}
