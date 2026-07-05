import React, { useState, useMemo } from 'react';
import { Eye, EyeOff, Users, Clock, TrendingUp } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from './ui/Card';
import { useBrutalTheme } from '../hooks/useBrutalTheme';
import { formatCurrency } from '../utils/formatters';
import type { Region } from '../utils/formatters';

interface FinanceInsightsProps {
  summary: {
    revenue: number;
    expenses: number;
    profit: number;
    growth: number;
    previousMonthRevenue: number;
    revenueByMethod: { pix: number; mbway: number; dinheiro: number; cartao: number };
  };
  monthlyHistory: Array<{
    month: string;
    year: number;
    revenue: number;
    expenses: number;
    profit: number;
  }>;
  transactions: Array<{
    type: 'revenue' | 'expense';
    serviceName: string;
    professionalName?: string;
    clientName?: string;
    time?: string;
    amount: number;
    date?: string;
  }>;
  currencyRegion: Region;
}

const DONUT_COLORS_BARBER = ['#d4a843', '#c49333', '#b48323', '#a47313', '#946303'];
const DONUT_COLORS_BEAUTY = ['#a78bfa', '#9270e5', '#7d55d0', '#683abb', '#531fa6'];
const METHOD_OPACITIES = [1, 0.75, 0.5];

export const FinanceInsights: React.FC<FinanceInsightsProps> = ({
  summary,
  monthlyHistory,
  transactions,
  currencyRegion,
}) => {
  const { colors, accent, status, isBeauty } = useBrutalTheme();
  const [showExpenses, setShowExpenses] = useState(false);

  const COLORS = isBeauty ? DONUT_COLORS_BEAUTY : DONUT_COLORS_BARBER;
  const accentBarColor = isBeauty ? '#a78bfa' : '#d4a843';

  const currentDay = new Date().getDate();
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const isAfter15 = currentDay > 15;
  const currentMonthProjection = isAfter15 && summary.revenue > 0
    ? (summary.revenue / currentDay) * daysInMonth
    : null;

  const returningRate = useMemo(() => {
    const clients = transactions.filter((t) => t.type === 'revenue' && t.clientName && t.clientName.trim() !== '');
    if (clients.length === 0) return 0;
    const clientCounts: Record<string, number> = {};
    clients.forEach((c) => {
      clientCounts[c.clientName!] = (clientCounts[c.clientName!] || 0) + 1;
    });
    const returningClients = Object.values(clientCounts).filter((count) => count > 1).length;
    const totalUnique = Object.keys(clientCounts).length;
    return totalUnique > 0 ? Math.round((returningClients / totalUnique) * 100) : 0;
  }, [transactions]);

  const peakHour = useMemo(() => {
    const hours: Record<string, number> = {};
    transactions.forEach((t) => {
      if (t.type === 'revenue' && t.time) {
        const hour = t.time.split(':')[0];
        hours[hour] = (hours[hour] || 0) + 1;
      }
    });
    const sorted = Object.entries(hours).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) return null;
    const peak = sorted[0][0];
    return `${peak}h - ${parseInt(peak, 10) + 1}h`;
  }, [transactions]);

  const professionalRanking = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.forEach((t) => {
      if (t.type === 'revenue' && t.professionalName) {
        map[t.professionalName] = (map[t.professionalName] || 0) + t.amount;
      }
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));
  }, [transactions]);

  const topServices = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.forEach((t) => {
      if (t.type === 'revenue' && t.serviceName) {
        map[t.serviceName] = (map[t.serviceName] || 0) + t.amount;
      }
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));
  }, [transactions]);

  const bestMonth = monthlyHistory.length > 0
    ? monthlyHistory.reduce((a, b) => (b.revenue > a.revenue ? b : a))
    : null;
  const worstMonth = monthlyHistory.length > 0
    ? monthlyHistory.reduce((a, b) => (b.revenue < a.revenue ? b : a))
    : null;
  const avgRevenue = monthlyHistory.length > 0
    ? monthlyHistory.reduce((s, m) => s + m.revenue, 0) / monthlyHistory.length
    : 0;

  const totalRevenue = summary.revenue || 1;
  const methods = currencyRegion === 'PT'
    ? [
        { label: 'MBWay', value: summary.revenueByMethod.mbway || 0 },
        { label: 'Dinheiro', value: summary.revenueByMethod.dinheiro || 0 },
        { label: 'Cartão', value: summary.revenueByMethod.cartao || 0 },
      ]
    : [
        { label: 'PIX', value: summary.revenueByMethod.pix || 0 },
        { label: 'Dinheiro', value: summary.revenueByMethod.dinheiro || 0 },
        { label: 'Cartão', value: summary.revenueByMethod.cartao || 0 },
      ];

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <Card variant="outlined">
          <p className={`text-sm font-semibold ${colors.textSecondary}`}>Receita</p>
          <p className={`mt-2 font-mono text-2xl font-black tabular-nums ${colors.text}`}>
            {formatCurrency(summary.revenue || 0, currencyRegion)}
          </p>
          <p className={`mt-1.5 text-xs ${summary.growth >= 0 ? status.success : status.danger}`}>
            {summary.growth > 0 ? '+' : ''}{summary.growth.toFixed(1)}% vs anterior
          </p>
        </Card>
        <Card variant="outlined">
          <p className={`text-sm font-semibold ${colors.textSecondary}`}>Despesas</p>
          <p className={`mt-2 font-mono text-2xl font-black tabular-nums ${colors.text}`}>
            {formatCurrency(summary.expenses || 0, currencyRegion)}
          </p>
        </Card>
        <Card variant="outlined">
          <p className={`text-sm font-semibold ${colors.textSecondary}`}>Lucro</p>
          <p className={`mt-2 font-mono text-2xl font-black tabular-nums ${colors.text}`}>
            {formatCurrency(summary.profit || 0, currencyRegion)}
          </p>
          {summary.revenue > 0 && (
            <p className={`mt-1.5 text-xs ${colors.textMuted}`}>
              {Math.round(((summary.profit || 0) / summary.revenue) * 100)}% margem
            </p>
          )}
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {currentMonthProjection && (
          <Card variant="outlined">
            <div className="flex items-start justify-between">
              <div>
                <p className={`text-sm font-semibold ${colors.textSecondary}`}>Projeção do mês</p>
                <p className={`mt-2 font-mono text-xl font-bold tabular-nums ${colors.text}`}>
                  {formatCurrency(currentMonthProjection, currencyRegion)}
                </p>
              </div>
              <TrendingUp className={`h-4 w-4 ${colors.textMuted}`} aria-hidden="true" />
            </div>
            <p className={`mt-2 text-xs ${colors.textMuted}`}>Estimativa baseada no ritmo atual</p>
          </Card>
        )}

        <Card variant="outlined">
          <div className="flex items-start justify-between">
            <div>
              <p className={`text-sm font-semibold ${colors.textSecondary}`}>Taxa de retorno</p>
              <p className={`mt-2 font-mono text-xl font-bold tabular-nums ${returningRate > 50 ? status.success : colors.text}`}>
                {returningRate}%
              </p>
            </div>
            <Users className={`h-4 w-4 ${colors.textMuted}`} aria-hidden="true" />
          </div>
          <p className={`mt-2 text-xs ${colors.textMuted}`}>Clientes recorrentes no mês</p>
        </Card>

        <Card variant="outlined">
          <div className="flex items-start justify-between">
            <div>
              <p className={`text-sm font-semibold ${colors.textSecondary}`}>Horário de pico</p>
              <p className={`mt-2 font-mono text-xl font-bold ${colors.text}`}>{peakHour || '—'}</p>
            </div>
            <Clock className={`h-4 w-4 ${colors.textMuted}`} aria-hidden="true" />
          </div>
          <p className={`mt-2 text-xs ${colors.textMuted}`}>Maior volume de transações</p>
        </Card>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card variant="outlined" className="space-y-3">
          <p className={`text-sm font-semibold ${colors.textSecondary}`}>Forma de pagamento</p>
          {methods.map((m, i) => {
            const pct = summary.revenue > 0 ? (m.value / totalRevenue) * 100 : 0;
            return (
              <div key={m.label} className="flex items-center gap-3">
                <span className={`w-16 text-xs ${colors.textSecondary}`}>{m.label}</span>
                <div className={`h-2 flex-1 overflow-hidden rounded-full ${colors.surface}`}>
                  <div
                    className={`h-full rounded-full ${accent.bg}`}
                    style={{ width: `${pct}%`, opacity: METHOD_OPACITIES[i] ?? 0.4 }}
                  />
                </div>
                <span className={`w-14 text-right text-xs tabular-nums ${colors.text}`}>
                  {formatCurrency(m.value, currencyRegion)}
                </span>
                <span className={`w-8 text-right text-xs ${colors.textMuted}`}>{pct.toFixed(0)}%</span>
              </div>
            );
          })}
        </Card>

        <Card variant="outlined" className="space-y-3">
          <p className={`text-sm font-semibold ${colors.textSecondary}`}>Top profissionais (receita)</p>
          {professionalRanking.length === 0 ? (
            <p className={`py-8 text-center text-sm ${colors.textMuted}`}>Nenhuma receita associada a profissionais</p>
          ) : (
            <div className="space-y-3">
              {professionalRanking.slice(0, 5).map((p, i) => {
                const pct = totalRevenue > 0 ? (p.value / totalRevenue) * 100 : 0;
                return (
                  <div key={p.name} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className={`font-medium ${colors.textSecondary}`}>{p.name}</span>
                      <span className={`font-mono tabular-nums ${colors.text}`}>{formatCurrency(p.value, currencyRegion)}</span>
                    </div>
                    <div className={`h-1.5 overflow-hidden rounded-full ${colors.surface}`}>
                      <div
                        className={`h-full rounded-full ${accent.bg}`}
                        style={{ width: `${pct}%`, opacity: METHOD_OPACITIES[i] ?? 0.4 }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <Card variant="outlined">
        <p className={`mb-4 text-sm font-semibold ${colors.textSecondary}`}>Top 5 serviços</p>
        {topServices.length === 0 ? (
          <p className={`py-8 text-center text-sm ${colors.textMuted}`}>Nenhum serviço registrado este mês</p>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-[140px] w-full flex-shrink-0 items-center justify-center sm:w-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={topServices}
                    cx="50%"
                    cy="50%"
                    innerRadius="56%"
                    outerRadius="88%"
                    dataKey="value"
                    stroke="none"
                  >
                    {topServices.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} style={{ outline: 'none' }} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="min-w-0 flex-1 space-y-2.5">
              {topServices.map((s, i) => (
                <div key={s.name} className="flex min-w-0 items-center gap-2">
                  <div className="h-2 w-2 flex-shrink-0 rounded-sm" style={{ backgroundColor: COLORS[i] }} />
                  <span className={`flex-1 truncate text-xs ${colors.textSecondary}`}>{s.name}</span>
                  <span className={`flex-shrink-0 text-xs tabular-nums ${colors.text}`}>
                    {formatCurrency(s.value, currencyRegion)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Card variant="outlined">
        <div className="mb-4 flex items-center justify-between">
          <p className={`text-sm font-semibold ${colors.textSecondary}`}>Visão anual</p>
          <button
            type="button"
            onClick={() => setShowExpenses((v) => !v)}
            className={[
              'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors min-h-[44px]',
              showExpenses ? `${status.dangerBg} ${status.dangerBorder} ${status.danger}` : `${colors.border} ${colors.textMuted} hover:text-theme-text`,
            ].join(' ')}
          >
            {showExpenses
              ? <><EyeOff className="h-3 w-3" aria-hidden="true" /> Esconder despesas</>
              : <><Eye className="h-3 w-3" aria-hidden="true" /> Mostrar despesas</>}
          </button>
        </div>
        {monthlyHistory.length === 0 ? (
          <p className={`py-8 text-center text-sm ${colors.textMuted}`}>Sem dados históricos ainda</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={180} className="focus:outline-none [&_*:focus]:outline-none">
              <BarChart data={monthlyHistory} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-divider)" />
                <XAxis dataKey="month" tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={false}
                  contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-divider)', borderRadius: 8, color: 'var(--color-text)' }}
                  labelStyle={{ color: 'var(--color-text-muted)', fontSize: 11 }}
                  itemStyle={{ color: 'var(--color-text)', fontSize: 11 }}
                  formatter={(v: number) => formatCurrency(v, currencyRegion)}
                />
                <Bar dataKey="revenue" fill={accentBarColor} radius={[4, 4, 0, 0]} name="Receita" isAnimationActive={false} />
                {showExpenses && (
                  <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} opacity={0.6} name="Despesas" isAnimationActive={false} />
                )}
              </BarChart>
            </ResponsiveContainer>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { label: 'Melhor mês', value: bestMonth ? formatCurrency(bestMonth.revenue, currencyRegion) : '—', sub: bestMonth ? `${bestMonth.month} ${bestMonth.year}` : '' },
                { label: 'Pior mês', value: worstMonth ? formatCurrency(worstMonth.revenue, currencyRegion) : '—', sub: worstMonth ? `${worstMonth.month} ${worstMonth.year}` : '' },
                { label: 'Média', value: formatCurrency(avgRevenue, currencyRegion), sub: 'mensal' },
              ].map((pill) => (
                <div key={pill.label} className={`rounded-xl border p-3 text-center ${colors.border} ${colors.surface}`}>
                  <p className={`text-xs ${colors.textMuted}`}>{pill.label}</p>
                  <p className={`mt-1 text-sm font-bold tabular-nums ${accent.text}`}>{pill.value}</p>
                  {pill.sub && <p className={`mt-0.5 text-xs ${colors.textMuted}`}>{pill.sub}</p>}
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
};
