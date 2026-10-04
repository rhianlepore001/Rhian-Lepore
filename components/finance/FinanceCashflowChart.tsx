import React, { memo, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useThemeTokens } from '../../hooks/useThemeTokens';
import { formatCurrency, type Region } from '../../utils/formatters';
import {
  DESKTOP_MAX_BAR_WIDTH,
  formatCashflowSummary,
  formatSobrou,
  formatYTick,
  layoutCashflowBars,
  monthAriaLabel,
  showDayAxisLabel,
  withAlpha,
  type DayBucket,
  type WeekBucket,
} from '../../utils/financeCashflow';

export type CashflowVariant = 'week' | 'day';

export interface CashflowTotals {
  receita: number;
  despesas: number;
  sobrou: number;
}

interface FinanceCashflowChartProps {
  days: DayBucket[];
  weeks: WeekBucket[];
  totals: CashflowTotals;
  currencyRegion: Region;
  periodLabel: string;
  monthIndex: number;
  variant?: CashflowVariant;
  height?: number;
}

const PLOT_HEIGHT = 168;
const Y_AXIS = 32;
const X_AXIS = 24;
const TOP_PAD = 8;
const RIGHT_PAD = 8;
const CHART_RESERVE = 288;
const FALLBACK_SUCCESS = '#10B981';
const FALLBACK_DANGER = '#EF4444';
const FALLBACK_TEXT = '#6B6252';

function subscribeDesktop(cb: () => void) {
  const mql = window.matchMedia('(min-width: 768px)');
  mql.addEventListener('change', cb);
  return () => mql.removeEventListener('change', cb);
}

function useIsDesktop() {
  return useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia('(min-width: 768px)').matches,
    () => false,
  );
}

function subscribeReducedMotion(cb: () => void) {
  const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
  mql.addEventListener('change', cb);
  return () => mql.removeEventListener('change', cb);
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => true,
  );
}

type Point = DayBucket | WeekBucket;

function isWeek(p: Point): p is WeekBucket {
  return 'startDay' in p && 'weekIndex' in p;
}

export const FinanceCashflowChart = memo(function FinanceCashflowChart({
  days,
  weeks,
  totals,
  currencyRegion,
  periodLabel,
  monthIndex,
  variant,
  height = PLOT_HEIGHT,
}: FinanceCashflowChartProps) {
  const isDesktop = useIsDesktop();
  const reduceMotion = usePrefersReducedMotion();
  const mode: CashflowVariant = variant ?? (isDesktop ? 'day' : 'week');
  const points: Point[] = mode === 'week' ? weeks : days;
  const tokens = useThemeTokens();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(330);
  const [active, setActive] = useState<number | null>(null);

  const income = tokens.success || FALLBACK_SUCCESS;
  const expense = tokens.danger || FALLBACK_DANGER;
  const axis = tokens.textMuted || FALLBACK_TEXT;
  const grid = withAlpha(tokens.text || FALLBACK_TEXT, 0.06);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setWidth(Math.max(el.clientWidth || 0, 280));
    update();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const plotWidth = Math.max(width - Y_AXIS - RIGHT_PAD, 80);
  const plotHeight = height;
  const svgH = plotHeight + TOP_PAD + X_AXIS;
  const svgW = width;

  const maxBarWidth = mode === 'day' ? DESKTOP_MAX_BAR_WIDTH : 36;
  const layout = useMemo(
    () => layoutCashflowBars(points, { plotWidth, plotHeight, maxBarWidth }),
    [points, plotWidth, plotHeight, maxBarWidth],
  );

  const summaries = useMemo(
    () => points.map((p) => (
      isWeek(p)
        ? formatCashflowSummary(p.startDay, p.endDay, monthIndex, p.receita, p.despesas, currencyRegion)
        : formatCashflowSummary(p.day, p.day, monthIndex, p.receita, p.despesas, currencyRegion)
    )),
    [points, monthIndex, currencyRegion],
  );

  const hasActivity = totals.receita > 0 || totals.despesas > 0;

  const onActivate = useCallback((index: number) => {
    setActive(index);
  }, []);

  const activateFromTarget = useCallback((event: { currentTarget: EventTarget & { dataset: DOMStringMap } }) => {
    const idx = Number(event.currentTarget.dataset.idx);
    if (Number.isFinite(idx)) onActivate(idx);
  }, [onActivate]);

  const onKey = useCallback((event: React.KeyboardEvent<SVGRectElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      activateFromTarget(event);
    } else if (event.key === 'Escape') {
      setActive(null);
    }
  }, [activateFromTarget]);

  const activeHit = active != null ? layout.hits[active] : null;
  const tooltip = active != null ? summaries[active] : null;

  const aria = monthAriaLabel(periodLabel, totals.receita, totals.despesas, currencyRegion);

  if (!hasActivity) {
    return (
      <div
        className="flex w-full items-center justify-center rounded-xl border border-dashed px-4 text-center"
        style={{ minHeight: CHART_RESERVE, borderColor: tokens.border || 'rgba(128,128,128,0.2)', color: axis }}
        data-testid="finance-cashflow-empty"
      >
        <p className="text-sm leading-relaxed">
          Sem movimentação neste mês ainda.
          <br />
          As entradas e saídas aparecem aqui conforme você registra.
        </p>
      </div>
    );
  }

  return (
    <div
      className="finance-cashflow-chart w-full"
      data-testid="finance-cashflow-chart"
      style={{ minHeight: CHART_RESERVE }}
    >
      <div
        className="grid grid-cols-3 gap-2 pb-4"
        data-testid="finance-cashflow-totals"
        style={{ minHeight: 72 }}
      >
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: axis }}>
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: income }} aria-hidden />
            Entradas
          </p>
          <p className="mt-1 truncate font-mono text-xl font-black tabular-nums tracking-tight md:text-2xl" style={{ color: tokens.text || '#111' }}>
            {formatCurrency(totals.receita, currencyRegion)}
          </p>
        </div>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: axis }}>
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: expense }} aria-hidden />
            Saídas
          </p>
          <p className="mt-1 truncate font-mono text-xl font-black tabular-nums tracking-tight md:text-2xl" style={{ color: tokens.text || '#111' }}>
            {formatCurrency(totals.despesas, currencyRegion)}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: axis }}>Sobrou</p>
          <p
            className="mt-1 truncate font-mono text-xl font-black tabular-nums tracking-tight md:text-2xl"
            style={{ color: totals.sobrou < 0 ? expense : (tokens.text || '#111') }}
            data-testid="finance-cashflow-sobrou"
          >
            {formatSobrou(totals.sobrou, currencyRegion)}
          </p>
        </div>
      </div>

      <div ref={wrapRef} className="relative w-full" style={{ height: svgH }}>
        <svg
          width="100%"
          height={svgH}
          viewBox={`0 0 ${svgW} ${svgH}`}
          role="img"
          aria-label={aria}
          data-testid="finance-cashflow-svg"
          style={{ display: 'block' }}
        >
          {layout.ticks.map((tick) => {
            const y = TOP_PAD + plotHeight - (tick / layout.yMax) * plotHeight;
            return (
              <g key={`tick-${tick}`}>
                <line
                  x1={Y_AXIS}
                  x2={svgW - RIGHT_PAD}
                  y1={y}
                  y2={y}
                  stroke={grid}
                  strokeWidth={1}
                />
                <text
                  x={Y_AXIS - 6}
                  y={y + 3}
                  textAnchor="end"
                  fill={axis}
                  fontSize={12}
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                >
                  {formatYTick(tick)}
                </text>
              </g>
            );
          })}

          {layout.bars.map((bar) => (
            <path
              key={bar.key}
              d={bar.d}
              transform={`translate(${Y_AXIS}, ${TOP_PAD})`}
              fill={bar.series === 'income' ? income : expense}
              data-testid={`cashflow-bar-${bar.series}`}
              data-width={bar.width}
              data-height={bar.height}
              style={{ transition: reduceMotion ? 'none' : undefined }}
            />
          ))}

          {points.map((p, i) => {
            const show = mode === 'week' || showDayAxisLabel(isWeek(p) ? p.startDay : p.day, days.length);
            if (!show) return null;
            const hit = layout.hits[i];
            return (
              <text
                key={`x-${p.key}`}
                x={Y_AXIS + hit.x + hit.width / 2}
                y={TOP_PAD + plotHeight + 16}
                textAnchor="middle"
                fill={axis}
                fontSize={12}
                fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
              >
                {p.label}
              </text>
            );
          })}

          {layout.hits.map((hit) => (
            <rect
              key={`hit-${hit.dataIndex}`}
              x={Y_AXIS + hit.x}
              y={TOP_PAD}
              width={hit.width}
              height={plotHeight}
              fill={active === hit.dataIndex ? withAlpha(tokens.accent || '#7c3aed', 0.08) : 'transparent'}
              data-idx={hit.dataIndex}
              data-testid={`cashflow-hit-${hit.dataIndex}`}
              tabIndex={0}
              role="button"
              aria-label={summaries[hit.dataIndex]}
              onPointerDown={activateFromTarget}
              onPointerEnter={activateFromTarget}
              onFocus={activateFromTarget}
              onKeyDown={onKey}
              style={{ outline: 'none', cursor: 'pointer' }}
            />
          ))}
        </svg>

        {tooltip && activeHit && (
          <div
            data-testid="finance-cashflow-tooltip"
            className="pointer-events-none absolute z-10 max-w-[260px] rounded-xl px-3 py-2 text-xs leading-relaxed"
            style={{
              left: Math.min(Math.max(Y_AXIS + activeHit.x + activeHit.width / 2 - 110, 0), Math.max(width - 220, 0)),
              top: 4,
              background: tokens.card || '#1A1816',
              border: `1px solid ${tokens.divider || 'rgba(255,255,255,0.08)'}`,
              color: tokens.text || '#F0EBE0',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            }}
          >
            {tooltip}
          </div>
        )}
      </div>

      <table className="sr-only">
        <caption>{`Entradas e saídas — ${periodLabel}`}</caption>
        <thead>
          <tr>
            <th>Período</th>
            <th>Entradas</th>
            <th>Saídas</th>
            <th>Sobrou</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p, i) => (
            <tr key={p.key}>
              <td>{summaries[i]}</td>
              <td>{formatCurrency(p.receita, currencyRegion)}</td>
              <td>{formatCurrency(p.despesas, currencyRegion)}</td>
              <td>{formatSobrou(p.sobrou, currencyRegion)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});
