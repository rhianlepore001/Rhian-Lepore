import React, { useMemo } from 'react';
import {
  Area,
  AreaChart,
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
}

interface TooltipPayloadItem {
  dataKey?: string | number;
  value?: number;
  color?: string;
  name?: string;
}

function CashflowTooltip({
  active,
  label,
  payload,
  currencyRegion,
  isDark,
}: {
  active?: boolean;
  label?: string;
  payload?: TooltipPayloadItem[];
  currencyRegion: Region;
  isDark: boolean;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div
      className="rounded-xl px-3.5 py-2.5"
      style={{
        background: 'var(--color-card)',
        border: isDark
          ? '1px solid rgba(255, 245, 230, 0.10)'
          : '1px solid rgba(0, 0, 0, 0.08)',
        color: 'var(--color-text)',
        boxShadow: isDark
          ? 'var(--elevation-2, 0 8px 24px rgba(0,0,0,0.45))'
          : 'var(--elevation-2, 0 8px 24px rgba(0,0,0,0.12))',
      }}
    >
      <p className="mb-1.5 text-xs font-semibold tabular-nums" style={{ color: 'var(--color-text)' }}>
        Dia {label}
      </p>
      <ul className="space-y-1">
        {payload.map((item) => (
          <li
            key={String(item.dataKey)}
            className="flex items-center gap-2 text-xs tabular-nums"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: item.color }}
              aria-hidden
            />
            <span className="min-w-[4.5rem]">{item.name}</span>
            <span className="font-mono font-semibold" style={{ color: 'var(--color-text)' }}>
              {formatCurrency(Number(item.value) || 0, currencyRegion)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Gráfico de fluxo de caixa diário.
 * - `monotone` evita overshoot abaixo de 0 (bug clássico do `natural` com picos esparsos).
 * - Sem dots; activeDot sem stroke preto/branco.
 * - Domínio Y ancorado em 0; outline/focus do SVG removidos.
 */
export const FinanceCashflowChart: React.FC<FinanceCashflowChartProps> = ({
  data,
  currencyRegion,
  height = 300,
}) => {
  const { isDark, status } = useBrutalTheme();

  const theme = useMemo(() => {
    const revenue = 'var(--color-success)';
    const expense = 'var(--color-danger)';
    return {
      grid: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
      axis: 'var(--color-text-muted)',
      cursor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.14)',
      revenue,
      expense,
      revenueFillId: 'cashflowRevenueFill',
      expenseFillId: 'cashflowExpenseFill',
    };
  }, [isDark]);

  const hasActivity = data.some((d) => d.receita > 0 || d.despesas > 0);
  const currencyPrefix = currencyRegion === 'PT' ? '€' : 'R$';

  if (!hasActivity) {
    return (
      <div
        className="flex h-[220px] w-full items-center justify-center rounded-xl border border-dashed px-4 text-center"
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
    <div
      className="finance-cashflow-chart w-full outline-none [&_svg]:outline-none [&_.recharts-surface]:outline-none [&_.recharts-wrapper]:outline-none"
      style={{ height }}
      data-testid="finance-cashflow-chart"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 12, right: 8, left: 0, bottom: 4 }}
        >
          <defs>
            <linearGradient id={theme.revenueFillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={theme.revenue} stopOpacity={0.28} />
              <stop offset="100%" stopColor={theme.revenue} stopOpacity={0} />
            </linearGradient>
            <linearGradient id={theme.expenseFillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={theme.expense} stopOpacity={0.22} />
              <stop offset="100%" stopColor={theme.expense} stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 6"
            stroke={theme.grid}
            vertical={false}
          />
          <XAxis
            dataKey="name"
            stroke={theme.axis}
            tick={{ fill: theme.axis, fontSize: 11, fontFamily: 'var(--font-mono, monospace)' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={28}
          />
          <YAxis
            stroke={theme.axis}
            tick={{ fill: theme.axis, fontSize: 11, fontFamily: 'var(--font-mono, monospace)' }}
            tickLine={false}
            axisLine={false}
            width={48}
            domain={[0, 'auto']}
            allowDataOverflow={false}
            tickFormatter={(v: number) =>
              v >= 1000 ? `${currencyPrefix}${(v / 1000).toFixed(0)}k` : `${currencyPrefix}${v}`
            }
          />
          <Tooltip
            cursor={{
              stroke: theme.cursor,
              strokeWidth: 1,
              strokeDasharray: '4 4',
            }}
            content={
              <CashflowTooltip currencyRegion={currencyRegion} isDark={isDark} />
            }
            wrapperStyle={{ outline: 'none', border: 'none' }}
          />
          <Area
            type="monotone"
            dataKey="receita"
            name="Entradas"
            stroke={theme.revenue}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={`url(#${theme.revenueFillId})`}
            fillOpacity={1}
            baseValue={0}
            dot={false}
            activeDot={{
              r: 5,
              stroke: 'var(--color-card)',
              strokeWidth: 2,
              fill: theme.revenue,
            }}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="despesas"
            name="Saídas"
            stroke={theme.expense}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={`url(#${theme.expenseFillId})`}
            fillOpacity={1}
            baseValue={0}
            dot={false}
            activeDot={{
              r: 5,
              stroke: 'var(--color-card)',
              strokeWidth: 2,
              fill: theme.expense,
            }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-xs">
        <span className="inline-flex items-center gap-1.5" style={{ color: 'var(--color-text-secondary)' }}>
          <span className={`h-2 w-2 rounded-full ${status.success.replace('text-', 'bg-')}`} style={{ background: 'var(--color-success)' }} />
          Entradas
        </span>
        <span className="inline-flex items-center gap-1.5" style={{ color: 'var(--color-text-secondary)' }}>
          <span className="h-2 w-2 rounded-full" style={{ background: 'var(--color-danger)' }} />
          Saídas
        </span>
      </div>
    </div>
  );
};
