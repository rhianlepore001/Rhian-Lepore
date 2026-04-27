import React, { useState, useMemo } from 'react';
import { Eye, EyeOff, Users, Clock, TrendingUp } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BrutalCard } from './BrutalCard';
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
  isBeauty: boolean;
  accentBg: string;
  accentText: string;
}

const DONUT_COLORS_BARBER = ['#d4a843', '#c49333', '#b48323', '#a47313', '#946303'];
const DONUT_COLORS_BEAUTY = ['#a78bfa', '#9270e5', '#7d55d0', '#683abb', '#531fa6'];
const METHOD_OPACITIES = [1, 0.75, 0.5];

export const FinanceInsights: React.FC<FinanceInsightsProps> = ({
  summary,
  monthlyHistory,
  transactions,
  currencyRegion,
  isBeauty,
  accentBg,
  accentText,
}) => {
  const [showExpenses, setShowExpenses] = useState(false);

  const COLORS = isBeauty ? DONUT_COLORS_BEAUTY : DONUT_COLORS_BARBER;
  const accentBarColor = isBeauty ? '#a78bfa' : '#d4a843';

  // Métricas Avancadas
  const currentDay = new Date().getDate();
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const isAfter15 = currentDay > 15;
  const currentMonthProjection = isAfter15 && summary.revenue > 0 
    ? (summary.revenue / currentDay) * daysInMonth 
    : null;

  const returningRate = useMemo(() => {
    const clients = transactions.filter(t => t.type === 'revenue' && t.clientName && t.clientName.trim() !== '');
    if (clients.length === 0) return 0;
    const clientCounts: Record<string, number> = {};
    clients.forEach(c => {
      clientCounts[c.clientName!] = (clientCounts[c.clientName!] || 0) + 1;
    });
    const returningClients = Object.values(clientCounts).filter(count => count > 1).length;
    const totalUnique = Object.keys(clientCounts).length;
    return totalUnique > 0 ? Math.round((returningClients / totalUnique) * 100) : 0;
  }, [transactions]);

  const peakHour = useMemo(() => {
    const hours: Record<string, number> = {};
    transactions.forEach(t => {
      if (t.type === 'revenue' && t.time) {
        const hour = t.time.split(':')[0];
        hours[hour] = (hours[hour] || 0) + 1;
      }
    });
    const sorted = Object.entries(hours).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) return null;
    const peak = sorted[0][0];
    return `${peak}h - ${parseInt(peak) + 1}h`;
  }, [transactions]);

  const professionalRanking = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.forEach(t => {
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
    transactions.forEach(t => {
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
    ? monthlyHistory.reduce((a, b) => b.revenue > a.revenue ? b : a)
    : null;
  const worstMonth = monthlyHistory.length > 0
    ? monthlyHistory.reduce((a, b) => b.revenue < a.revenue ? b : a)
    : null;
  const avgRevenue = monthlyHistory.length > 0
    ? monthlyHistory.reduce((s, m) => s + m.revenue, 0) / monthlyHistory.length
    : 0;

  const totalRevenue = summary.revenue || 1;
  const methods = currencyRegion === 'PT'
    ? [
        { label: 'MBway',    value: summary.revenueByMethod.mbway   || 0 },
        { label: 'Dinheiro', value: summary.revenueByMethod.dinheiro || 0 },
        { label: 'Cartão',   value: summary.revenueByMethod.cartao   || 0 },
      ]
    : [
        { label: 'PIX',      value: summary.revenueByMethod.pix      || 0 },
        { label: 'Dinheiro', value: summary.revenueByMethod.dinheiro || 0 },
        { label: 'Cartão',   value: summary.revenueByMethod.cartao   || 0 },
      ];

  return (
    <div className="space-y-6">

      {/* KPI Strip Original (Mantida como o usuário pediu) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className={`sm:col-span-1 bg-white/[0.05] border ${isBeauty ? 'border-beauty-neon/20' : 'border-accent-gold/20'} rounded-2xl p-4 sm:p-5`}>
          <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">Receita</p>
          <p className={`text-2xl font-heading ${accentText} mt-1`}>{formatCurrency(summary.revenue || 0, currencyRegion)}</p>
          <p className={`text-xs font-mono mt-1.5 ${summary.growth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {summary.growth > 0 ? '+' : ''}{summary.growth.toFixed(1)}% vs anterior
          </p>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 sm:p-5">
          <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">Despesas</p>
          <p className="text-xl font-heading text-white mt-1">{formatCurrency(summary.expenses || 0, currencyRegion)}</p>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4 sm:p-5">
          <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">Lucro</p>
          <p className="text-xl font-heading text-white mt-1">{formatCurrency(summary.profit || 0, currencyRegion)}</p>
          {summary.revenue > 0 && (
            <p className="text-[10px] font-mono text-neutral-500 mt-1.5">
              {Math.round(((summary.profit || 0) / summary.revenue) * 100)}% margem
            </p>
          )}
        </div>
      </div>

      {/* Novos Insights Avançados */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {currentMonthProjection && (
          <BrutalCard>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">Projeção do Mês</p>
                <p className="text-xl font-heading text-white mt-1">{formatCurrency(currentMonthProjection, currencyRegion)}</p>
              </div>
              <TrendingUp className="w-4 h-4 text-neutral-500" />
            </div>
            <p className="text-[10px] text-neutral-500 mt-2">Estimativa baseada no ritmo atual</p>
          </BrutalCard>
        )}
        
        <BrutalCard>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">Taxa de Retorno</p>
              <p className={`text-xl font-heading mt-1 ${returningRate > 50 ? 'text-green-400' : 'text-neutral-300'}`}>
                {returningRate}%
              </p>
            </div>
            <Users className="w-4 h-4 text-neutral-500" />
          </div>
          <p className="text-[10px] text-neutral-500 mt-2">Clientes recorrentes no mês</p>
        </BrutalCard>

        <BrutalCard>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">Horário de Pico</p>
              <p className="text-xl font-heading text-white mt-1">{peakHour || '—'}</p>
            </div>
            <Clock className="w-4 h-4 text-neutral-500" />
          </div>
          <p className="text-[10px] text-neutral-500 mt-2">Maior volume de transações</p>
        </BrutalCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Breakdown Forma de Pagamento */}
        <BrutalCard className="space-y-3">
          <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-3">Forma de Pagamento</p>
          {methods.map((m, i) => {
            const pct = summary.revenue > 0 ? (m.value / totalRevenue) * 100 : 0;
            return (
              <div key={m.label} className="flex items-center gap-3">
                <span className="text-xs font-mono text-neutral-400 w-16">{m.label}</span>
                <div className="flex-1 h-2 bg-white/[0.08] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${accentBg} transition-all duration-500`}
                    style={{ width: `${pct}%`, opacity: METHOD_OPACITIES[i] ?? 0.4 }}
                  />
                </div>
                <span className="text-xs font-mono text-white w-14 text-right">{formatCurrency(m.value, currencyRegion)}</span>
                <span className="text-[10px] font-mono text-neutral-500 w-8 text-right">{pct.toFixed(0)}%</span>
              </div>
            );
          })}
        </BrutalCard>

        {/* Ranking de Profissionais */}
        <BrutalCard className="space-y-3">
          <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-3">Top Profissionais (Receita)</p>
          {professionalRanking.length === 0 ? (
            <p className="text-center text-neutral-500 text-sm py-8">Nenhuma receita associada a profissionais</p>
          ) : (
            <div className="space-y-3">
              {professionalRanking.slice(0, 5).map((p, i) => {
                const pct = totalRevenue > 0 ? (p.value / totalRevenue) * 100 : 0;
                return (
                  <div key={p.name} className="flex flex-col gap-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-neutral-300 font-medium">{p.name}</span>
                      <span className="text-white font-mono">{formatCurrency(p.value, currencyRegion)}</span>
                    </div>
                    <div className="flex-1 h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${accentBg} transition-all duration-500`}
                        style={{ width: `${pct}%`, opacity: METHOD_OPACITIES[i] ?? 0.4 }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </BrutalCard>
      </div>

      {/* Top 5 Serviços */}
      <BrutalCard>
        <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-4">Top 5 Serviços</p>
        {topServices.length === 0 ? (
          <p className="text-center text-neutral-500 text-sm py-8">Nenhum serviço registrado este mês</p>
        ) : (
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
            <div className="w-full sm:w-[140px] h-[140px] flex-shrink-0 flex items-center justify-center">
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
                    activeShape={undefined} 
                  >
                    {topServices.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} style={{ outline: 'none' }} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2.5 min-w-0">
              {topServices.map((s, i) => (
                <div key={s.name} className="flex items-center gap-2 min-w-0">
                  <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: COLORS[i] }} />
                  <span className="text-xs text-neutral-300 truncate flex-1">{s.name}</span>
                  <span className="text-xs font-mono text-white flex-shrink-0">{formatCurrency(s.value, currencyRegion)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </BrutalCard>

      {/* Visão Anual */}
      <BrutalCard>
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">Visão Anual</p>
          <button
            onClick={() => setShowExpenses(v => !v)}
            className={`flex items-center gap-1.5 text-[10px] font-mono uppercase px-3 py-1 rounded-full border transition-colors ${
              showExpenses
                ? 'bg-red-500/20 border-red-500/40 text-red-400'
                : 'border-white/10 text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {showExpenses
              ? <><EyeOff className="w-3 h-3" /> Esconder Despesas</>
              : <><Eye className="w-3 h-3" /> Mostrar Despesas</>
            }
          </button>
        </div>
        {monthlyHistory.length === 0 ? (
          <p className="text-center text-neutral-500 text-sm py-8">Sem dados históricos ainda</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={180} className="focus:outline-none [&_*:focus]:outline-none [&_rect:focus]:outline-none">
              <BarChart data={monthlyHistory} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} style={{ outline: 'none' }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: '#737373', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#737373', fontSize: 10 }} axisLine={false} tickLine={false} />
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

            {/* Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
              {[
                { label: 'Melhor Mês', value: bestMonth ? formatCurrency(bestMonth.revenue, currencyRegion) : '—', sub: bestMonth ? `${bestMonth.month} ${bestMonth.year}` : '' },
                { label: 'Pior Mês',   value: worstMonth ? formatCurrency(worstMonth.revenue, currencyRegion) : '—', sub: worstMonth ? `${worstMonth.month} ${worstMonth.year}` : '' },
                { label: 'Média',      value: formatCurrency(avgRevenue, currencyRegion), sub: 'mensal' },
              ].map(pill => (
                <div key={pill.label} className="bg-black/20 border border-white/5 rounded-xl p-3 text-center">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">{pill.label}</p>
                  <p className={`text-sm font-mono font-bold mt-1 ${accentText}`}>{pill.value}</p>
                  {pill.sub && <p className="text-[10px] text-neutral-600 mt-0.5">{pill.sub}</p>}
                </div>
              ))}
            </div>
          </>
        )}
      </BrutalCard>
    </div>
  );
};
