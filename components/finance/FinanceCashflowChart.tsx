import React, { useId, useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import { formatCurrency, type Region } from '../../utils/formatters';

export interface CashflowDayPoint {
  name: string;
  receita: number;
  despesas: number;
}

interface FinanceCashflowChartProps {
  data: CashflowDayPoint[];
  currencyRegion: Region;
  height?: number;
  periodLabel?: string;
}

interface TooltipPayloadItem {
  dataKey?: string | number;
  value?: number;
  color?: string;
  name?: string;
  payload?: CashflowDayPoint;
}

function compactAxisTick(value: number): string {
  if (value === 0) return '0';
  const abs = Math.abs(value);
  if (abs >= 1000) {
    const k = value / 1000;
    return Number.isInteger(k) ? `${k}k` : `${k.toFixed(1).replace('.', ',')}k`;
  }
  return String(Math.round(value));
}

function dayLabel(name: string): string {
  const n = Number(name);
  return Number.isFinite(n) ? String(n) : name;
}

function xAxisTicks(data: CashflowDayPoint[]): string[] {
  const n = data.length;
  if (n <= 8) return data.map((d) => d.name);
  const step = n <= 16 ? 2 : n <= 24 ? 3 : 5;
  const ticks: string[] = [];
  data.forEach((d, i) => {
    if (i === 0 || i === n - 1 || (i + 1) % step === 0) ticks.push(d.name);
  });
  return Array.from(new Set(ticks));
}

function CashflowTooltip({
  active,
  label,
  payload,
  currencyRegion,
  periodLabel,
}: {
  active?: boolean;
  label?: string;
  payload?: TooltipPayloadItem[];
  currencyRegion: Region;
  periodLabel?: string;
}) {
  if (!active || !payload?.length) return null;

  const point = payload[0]?.payload;
  const receita = Number(point?.receita ?? 0);
  const despesas = Number(point?.despesas ?? 0);
  const net = receita - despesas;
  const empty = receita === 0 && despesas === 0;

  return (
    <div
      className="min-w-[168px] rounded-xl px-3 py-2.5"
      style={{
        background: 'var(--color-card)',
        border: '1px solid var(--color-divider)',
        color: 'var(--color-text)',
        boxShadow: 'var(--elevation-2, 0 8px 24px rgba(0,0,0,0.12))',
      }}
    >
      <p className="text-xs font-semibold tabular-nums" style={{ color: 'var(--color-text)' }}>
        Dia {dayLabel(String(label ?? ''))}
        {periodLabel ? (
          <span className="font-normal" style={{ color: 'var(--color-text-muted)' }}>
            {' '}
            · {periodLabel}
          </span>
        ) : null}
      </p>
      {empty ? (
        <p className="mt-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Sem movimento
        </p>
      ) : (
        <ul className="mt-2 space-y-1">
          <li className="flex items-center justify-between gap-6 text-xs tabular-nums">
            <span className="inline-flex items-center gap-1.5" style={{ color: 'var(--color-text-secondary)' }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--color-success)' }} aria-hidden />
              Entradas
            </span>
            <span className="font-mono font-semibold" style={{ color: 'var(--color-text)' }}>
              {formatCurrency(receita, currencyRegion)}
            </span>
          </li>
          <li className="flex items-center justify-between gap-6 text-xs tabular-nums">
            <span className="inline-flex items-center gap-1.5" style={{ color: 'var(--color-text-secondary)' }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--color-danger)' }} aria-hidden />
              Saídas
            </span>
            <span className="font-mono font-semibold" style={{ color: 'var(--color-text)' }}>
              {formatCurrency(despesas, currencyRegion)}
            </span>
          </li>
          <li
            className="mt-1 flex items-center justify-between gap-6 border-t pt-1.5 text-xs tabular-nums"
            style={{ borderColor: 'var(--color-divider)' }}
          >
            <span style={{ color: 'var(--color-text-muted)' }}>Líquido</span>
            <span
              className="font-mono font-semibold"
              style={{ color: net < 0 ? 'var(--color-danger)' : 'var(--color-success)' }}
            >
              {formatCurrency(net, currencyRegion)}
            </span>
          </li>
        </ul>
      )}
    </div>
  );
}

/**
 * Fluxo diário em barras agrupadas (padrão Stripe / Nubank).
 * Área interpolada distorce meses esparsos — típico de barbearia/salão.
 */
export const FinanceCashflowChart: React.FC<FinanceCashflowChartProps> = ({
  data,
  currencyRegion,
  height = 240,
  periodLabel,
}) => {
  const { isDark } = useBrutalTheme();
  const rawId = useId().replace(/:/g, '');
  const revenueFillId = `cashflow-in-${rawId}`;
  const expenseFillId = `cashflow-out-${rawId}`;

  const totals = useMemo(
    () =>
      data.reduce(
        (acc, d) => {
          acc.receita += d.receita || 0;
          acc.despesas += d.despesas || 0;
          return acc;
        },
        { receita: 0, despesas: 0 },
      ),
    [data],
  );

  const ticks = useMemo(() => xAxisTicks(data), [data]);

  const theme = useMemo(
    () => ({
      grid: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,10,30,0.06)',
      axis: 'var(--color-text-muted)',
      cursor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(124, 58, 237, 0.08)',
      revenue: 'var(--color-success)',
      expense: 'var(--color-danger)',
    }),
    [isDark],
  );

  const hasActivity = totals.receita > 0 || totals.despesas > 0;

  if (!hasActivity) {
    return (
      <div
        className="flex h-[200px] w-full items-center justify-center rounded-xl border border-dashed px-4 text-center"
        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
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
    <div className="finance-cashflow-chart w-full" data-testid="finance-cashflow-chart">
      <div
        className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5"
        data-testid="finance-cashflow-totals"
      >
        <span className="inline-flex items-baseline gap-1.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          <span className="h-1.5 w-1.5 translate-y-[-1px] rounded-full" style={{ background: theme.revenue }} aria-hidden />
          Entradas
          <span className="font-mono text-sm font-semibold tabular-nums" style={{ color: 'var(--color-text)' }}>
            {formatCurrency(totals.receita, currencyRegion)}
          </span>
        </span>
        <span className="inline-flex items-baseline gap-1.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          <span className="h-1.5 w-1.5 translate-y-[-1px] rounded-full" style={{ background: theme.expense }} aria-hidden />
          Saídas
          <span className="font-mono text-sm font-semibold tabular-nums" style={{ color: 'var(--color-text)' }}>
            {formatCurrency(totals.despesas, currencyRegion)}
          </span>
        </span>
      </div>

      <div
        className="w-full outline-none [&_svg]:outline-none [&_.recharts-surface]:outline-none [&_.recharts-wrapper]:outline-none [&_.recharts-tooltip-wrapper]:outline-none"
        style={{ height }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 4, left: 0, bottom: 0 }}
            barCategoryGap="22%"
            barGap={2}
            accessibilityLayer
          >
            <defs>
              <linearGradient id={revenueFillId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={theme.revenue} stopOpacity={0.95} />
                <stop offset="100%" stopColor={theme.revenue} stopOpacity={0.55} />
              </linearGradient>
              <linearGradient id={expenseFillId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={theme.expense} stopOpacity={0.95} />
                <stop offset="100%" stopColor={theme.expense} stopOpacity={0.5} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="0" stroke={theme.grid} vertical={false} />
            <XAxis
              dataKey="name"
              ticks={ticks}
              tickFormatter={dayLabel}
              stroke={theme.axis}
              tick={{ fill: theme.axis, fontSize: 12, fontFamily: 'var(--font-mono, ui-monospace, monospace)' }}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              interval={0}
            />
            <YAxis
              stroke={theme.axis}
              tick={{ fill: theme.axis, fontSize: 12, fontFamily: 'var(--font-mono, ui-monospace, monospace)' }}
              tickLine={false}
              axisLine={false}
              width={40}
              domain={[0, 'auto']}
              allowDecimals={false}
              tickCount={4}
              tickFormatter={compactAxisTick}
            />
            <Tooltip
              cursor={{ fill: theme.cursor, radius: 6 }}
              content={<CashflowTooltip currencyRegion={currencyRegion} periodLabel={periodLabel} />}
              wrapperStyle={{ outline: 'none', zIndex: 20 }}
              offset={12}
              allowEscapeViewBox={{ x: true, y: false }}
            />
            <Bar
              dataKey="receita"
              name="Entradas"
              fill={`url(#${revenueFillId})`}
              radius={[4, 4, 0, 0]}
              maxBarSize={14}
              isAnimationActive={false}
            />
            <Bar
              dataKey="despesas"
              name="Saídas"
              fill={`url(#${expenseFillId})`}
              radius={[4, 4, 0, 0]}
              maxBarSize={14}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
