import { describe, expect, it } from 'vitest';
import { zonedDateTimeToIso } from '@/utils/businessTimezone';
import {
  BAR_GAP_PX,
  MIN_BAR_HEIGHT,
  SMALL_PREV_MONTH_COPY,
  barHeight,
  bucketDaysByWeeks,
  bucketMonthByDays,
  calcSobrou,
  daysInCalendarMonth,
  formatCashflowSummary,
  formatMonthGrowth,
  formatSobrou,
  formatYTick,
  getZonedMonthRange,
  isInstantInRange,
  layoutCashflowBars,
  previousMonthIndex,
  showDayAxisLabel,
  weekdayMon0,
  yAxisTicks,
} from '@/utils/financeCashflow';

const LIS = 'Europe/Lisbon';
const SP = 'America/Sao_Paulo';

describe('getZonedMonthRange', () => {
  it('Setembro em Lisboa (DST) é [1 set 00:00, 1 out 00:00)', () => {
    const range = getZonedMonthRange(2026, 8, LIS);
    expect(range.startIso).toBe('2026-09-01T00:00:00+01:00');
    expect(range.endIso).toBe('2026-10-01T00:00:00+01:00');
  });

  it('inclui 30/09 23:30 e exclui 31/08 23:30 em Lisboa', () => {
    const { startIso, endIso } = getZonedMonthRange(2026, 8, LIS);
    const last = zonedDateTimeToIso('2026-09-30', '23:30', LIS);
    const before = zonedDateTimeToIso('2026-08-31', '23:30', LIS);
    const next = zonedDateTimeToIso('2026-10-01', '00:00', LIS);
    expect(isInstantInRange(last, startIso, endIso)).toBe(true);
    expect(isInstantInRange(before, startIso, endIso)).toBe(false);
    expect(isInstantInRange(next, startIso, endIso)).toBe(false);
  });

  it('Setembro em São Paulo é [1 set 00:00-03, 1 out 00:00-03)', () => {
    const range = getZonedMonthRange(2026, 8, SP);
    expect(range.startIso).toBe('2026-09-01T00:00:00-03:00');
    expect(range.endIso).toBe('2026-10-01T00:00:00-03:00');
    expect(isInstantInRange(zonedDateTimeToIso('2026-09-30', '23:30', SP), range.startIso, range.endIso)).toBe(true);
    expect(isInstantInRange(zonedDateTimeToIso('2026-08-31', '23:30', SP), range.startIso, range.endIso)).toBe(false);
  });

  it('borda de DST em Lisboa: março começa em WET e termina em WEST', () => {
    const range = getZonedMonthRange(2026, 2, LIS);
    expect(range.startIso).toBe('2026-03-01T00:00:00+00:00');
    expect(range.endIso).toBe('2026-04-01T00:00:00+01:00');
    expect(isInstantInRange(zonedDateTimeToIso('2026-03-29', '00:30', LIS), range.startIso, range.endIso)).toBe(true);
    expect(isInstantInRange(zonedDateTimeToIso('2026-03-29', '09:00', LIS), range.startIso, range.endIso)).toBe(true);
  });
});

describe('week bucketing', () => {
  it('mês que começa no meio da semana (set/2026, terça) gera S1 parcial 1–6', () => {
    expect(weekdayMon0(2026, 9, 1)).toBe(1);
    const days = Array.from({ length: daysInCalendarMonth(2026, 8) }, (_, i) => ({
      key: String(i + 1),
      label: String(i + 1),
      day: i + 1,
      receita: i + 1 === 1 ? 100 : 0,
      despesas: 0,
      sobrou: i + 1 === 1 ? 100 : 0,
    }));
    const weeks = bucketDaysByWeeks(days, 2026, 8);
    expect(weeks.map((w) => w.label)).toEqual(['S1', 'S2', 'S3', 'S4', 'S5']);
    expect(weeks[0]).toMatchObject({ startDay: 1, endDay: 6 });
    expect(weeks[1]).toMatchObject({ startDay: 7, endDay: 13 });
    expect(weeks[4]).toMatchObject({ startDay: 28, endDay: 30 });
    expect(weeks[0].receita).toBe(100);
  });

  it('mês com 5 semanas parciais (fev/2026, começa domingo)', () => {
    expect(weekdayMon0(2026, 2, 1)).toBe(6);
    const days = Array.from({ length: 28 }, (_, i) => ({
      key: String(i + 1),
      label: String(i + 1),
      day: i + 1,
      receita: 0,
      despesas: 0,
      sobrou: 0,
    }));
    const weeks = bucketDaysByWeeks(days, 2026, 1);
    expect(weeks).toHaveLength(5);
    expect(weeks[0]).toMatchObject({ startDay: 1, endDay: 1, label: 'S1' });
    expect(weeks[1]).toMatchObject({ startDay: 2, endDay: 8, label: 'S2' });
    expect(weeks[4]).toMatchObject({ startDay: 23, endDay: 28, label: 'S5' });
  });

  it('mês que começa segunda (jun/2026) tem S1 = 1–7', () => {
    expect(weekdayMon0(2026, 6, 1)).toBe(0);
    const days = Array.from({ length: 30 }, (_, i) => ({
      key: String(i + 1),
      label: String(i + 1),
      day: i + 1,
      receita: 0,
      despesas: 0,
      sobrou: 0,
    }));
    const weeks = bucketDaysByWeeks(days, 2026, 5);
    expect(weeks[0]).toMatchObject({ startDay: 1, endDay: 7 });
    expect(weeks[4]).toMatchObject({ startDay: 29, endDay: 30 });
  });
});

describe('bucketMonthByDays + fuso', () => {
  it('agrega no dia civil do negócio, não no UTC', () => {
    const days = bucketMonthByDays(
      [
        { instant: zonedDateTimeToIso('2026-09-30', '23:30', SP), type: 'revenue', amount: 80 },
        { instant: zonedDateTimeToIso('2026-08-31', '23:30', SP), type: 'revenue', amount: 40 },
      ],
      2026,
      8,
      SP,
    );
    expect(days[29].receita).toBe(80);
    expect(days.reduce((s, d) => s + d.receita, 0)).toBe(80);
  });
});

describe('percentuais e Sobrou', () => {
  it('formata com vírgula e sinal', () => {
    expect(formatMonthGrowth({
      currentRevenue: 114,
      previousRevenue: 100,
      previousRecords: 8,
    })).toBe('+14,0%');
  });

  it('mês anterior com pouco movimento (receita < 10% ou < 5 lançamentos)', () => {
    expect(formatMonthGrowth({
      currentRevenue: 2852,
      previousRevenue: 100,
      previousRecords: 12,
    })).toBe(SMALL_PREV_MONTH_COPY);
    expect(formatMonthGrowth({
      currentRevenue: 500,
      previousRevenue: 400,
      previousRecords: 4,
    })).toBe(SMALL_PREV_MONTH_COPY);
  });

  it('Sobrou é entradas − saídas e negativo usa menos tipográfico', () => {
    expect(calcSobrou(330, 30)).toBe(300);
    expect(calcSobrou(30, 330)).toBe(-300);
    expect(formatSobrou(-300, 'PT')).toMatch(/^−/);
    expect(formatSobrou(-300, 'BR')).toMatch(/^−/);
    expect(formatSobrou(300, 'BR')).toBe('R$ 300,00');
  });
});

describe('layout do gráfico', () => {
  it('value>0 gera altura ≥ 2 px e largura válida', () => {
    expect(barHeight(1, 500, 160)).toBeGreaterThanOrEqual(MIN_BAR_HEIGHT);
    const layout = layoutCashflowBars(
      [
        { key: 'S1', receita: 1, despesas: 0.5 },
        { key: 'S2', receita: 0, despesas: 0 },
        { key: 'S3', receita: 330, despesas: 30 },
      ],
      { plotWidth: 330, plotHeight: 160, maxBarWidth: 28 },
    );
    const small = layout.bars.filter((b) => b.dataIndex === 0);
    expect(small.length).toBe(2);
    for (const b of small) {
      expect(b.width).toBeGreaterThan(0);
      expect(b.height).toBeGreaterThanOrEqual(MIN_BAR_HEIGHT);
      expect(b.d.length).toBeGreaterThan(0);
    }
    expect(layout.bars.find((b) => b.dataIndex === 1)).toBeUndefined();
    expect(layout.ticks).toEqual(yAxisTicks(330));
    expect(formatYTick(0)).toBe('0');
    expect(formatYTick(250)).toBe('250');
    expect(formatYTick(500)).toBe('500');
  });

  it('duas barras do mesmo grupo ficam lado a lado com 2 px de vão', () => {
    const layout = layoutCashflowBars(
      [{ key: '01', receita: 100, despesas: 40 }],
      { plotWidth: 40, plotHeight: 100, maxBarWidth: 12 },
    );
    const inn = layout.bars.find((b) => b.series === 'income')!;
    const out = layout.bars.find((b) => b.series === 'expense')!;
    expect(out.x - (inn.x + inn.width)).toBe(BAR_GAP_PX);
    expect(inn.width).toBeLessThanOrEqual(12);
  });
});

describe('rótulos', () => {
  it('marca o eixo a cada 5 dias', () => {
    expect(showDayAxisLabel(1, 30)).toBe(true);
    expect(showDayAxisLabel(5, 30)).toBe(true);
    expect(showDayAxisLabel(6, 30)).toBe(false);
    expect(showDayAxisLabel(30, 30)).toBe(true);
  });

  it('resumo da semana no formato pedido', () => {
    const text = formatCashflowSummary(1, 7, 8, 330, 30, 'PT');
    expect(text).toContain('1–7 set');
    expect(text).toContain('Entradas');
    expect(text).toContain('Saídas');
    expect(text).toContain('Sobrou');
    expect(text).toContain('€');
  });

  it('previousMonthIndex atravessa o ano', () => {
    expect(previousMonthIndex(2026, 0)).toEqual({ year: 2025, monthIndex: 11 });
    expect(previousMonthIndex(2026, 8)).toEqual({ year: 2026, monthIndex: 7 });
  });
});
