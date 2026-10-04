import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { BarChart3, CalendarX, TrendingUp } from 'lucide-react';
import { EmptyState, ErrorState, PageHeader, Skeleton } from '../components/ui';
import { MonthYearSelector } from '../components/MonthYearSelector';
import { MetricCard } from '../components/performance/MetricCard';
import { MetricGrid, PerformanceSection } from '../components/performance/PerformanceSection';
import { TrendBars } from '../components/performance/TrendBars';
import { useAuth } from '../contexts/AuthContext';
import { useBrutalTheme } from '../hooks/useBrutalTheme';
import { useBusinessCopy } from '../hooks/useBusinessCopy';
import { useStaffInsights } from '../hooks/useStaffInsights';
import { useTenantLocale } from '../hooks/useTenantLocale';
import type { StaffPeriod } from '../types/insights';
import { buildMetricAccount, STAFF_METRIC_IDS, metricCellClass } from '../utils/staffPerformanceAccount';
import { compactPeriodLine, previousMonthName } from '../utils/staffPerformanceView';

const PERIODS: { id: StaffPeriod; label: string }[] = [
  { id: 'day', label: 'Hoje' },
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mês' },
];

const PAGE_PB = 'pb-[calc(8rem+var(--safe-bottom))] md:pb-16';

export const StaffInsights: React.FC = () => {
  const { role, fullName, teamMemberId } = useAuth();
  const { remainder } = useBusinessCopy();
  const { accent, colors, font, radius, isBeauty } = useBrutalTheme();
  const { formatMoney } = useTenantLocale();
  const now = new Date();
  const [period, setPeriod] = useState<StaffPeriod>('month');
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const { data, status, periodLabel, retry } = useStaffInsights(period, selectedMonth, selectedYear);

  if (role === 'owner') return <Navigate to="/insights" replace />;

  const firstName = fullName?.split(' ')[0];
  const isCurrentMonth = selectedMonth === now.getMonth() && selectedYear === now.getFullYear();
  const me = data?.me;
  const x = me?.metrics;
  const empty = !!x && x.atendimentos === 0 && x.vendas_produtos === 0;
  const previousRange = data?.period.previous ?? null;
  const previousName = previousRange ? previousMonthName(previousRange) : null;
  const comparing = !empty && period === 'month' && previousRange
    ? compactPeriodLine(data!.period.start, data!.period.end, previousRange, true)
    : periodLabel;

  if (!teamMemberId) {
    return (
      <div className={`flex flex-col gap-8 ${PAGE_PB}`}>
        <PageHeader title="Meus resultados" subtitle="Seus atendimentos, produtos e comissões" />
        <EmptyState icon={TrendingUp} bordered title="Perfil ainda não vinculado" description="Peça ao responsável para te adicionar na equipe. Assim que estiver vinculado, seus resultados aparecem aqui." />
      </div>
    );
  }

  const accounts = x
    ? STAFF_METRIC_IDS.map((id) =>
        buildMetricAccount(id, x, {
          formatMoney,
          remainder,
          personName: firstName || 'você',
          voice: 'self',
          previous: me?.previous,
          previousName,
          periodStart: data!.period.start,
          periodEnd: data!.period.end,
        }),
      )
    : [];

  return (
    <div className={`flex flex-col gap-6 lg:gap-8 ${PAGE_PB} max-w-[1120px]`}>
      <PageHeader
        title={firstName ? `Meus resultados — ${firstName}` : 'Meus resultados'}
        subtitle={<span>{comparing}</span>}
        meta={
          <div className="flex gap-2 w-full overflow-x-auto pb-1">
            {PERIODS.map((item) => {
              const disabled = item.id !== 'month' && !isCurrentMonth;
              const active = period === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    setPeriod(item.id);
                    if (item.id !== 'month') {
                      setSelectedMonth(now.getMonth());
                      setSelectedYear(now.getFullYear());
                    }
                  }}
                  className={`px-3.5 min-h-[44px] min-w-[72px] text-sm shrink-0 border ${radius.button} ${
                    active ? `${accent.bg} text-[var(--color-on-accent)] ${accent.border}` : `${colors.border} ${colors.textMuted}`
                  } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        }
        action={
          period === 'month' ? (
            <MonthYearSelector selectedMonth={selectedMonth} selectedYear={selectedYear} onChange={(m, y) => { setSelectedMonth(m); setSelectedYear(y); setPeriod('month'); }} accentColor={isBeauty ? 'beauty-neon' : 'accent-gold'} />
          ) : undefined
        }
      />

      {status === 'loading' && (
        <div aria-busy="true" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Skeleton className="h-[136px]" />
          <Skeleton className="h-[136px]" />
          <Skeleton className="h-[136px]" />
          <Skeleton className="h-[136px]" />
        </div>
      )}

      {status === 'error' && (
        <ErrorState title="Não foi possível carregar seus resultados." message="Confira a conexão e tente de novo." retryLabel="Tentar de novo" onRetry={retry} />
      )}

      {status === 'unavailable' && (
        <EmptyState icon={BarChart3} bordered title="A análise ainda não foi ativada." description="Seus números aparecem aqui assim que a atualização do banco for publicada." />
      )}

      {status === 'ready' && empty && (
        <EmptyState icon={CalendarX} bordered title={`Sem resultados em ${periodLabel.toLowerCase()}`} description="Conclua atendimentos para ver quanto cada cliente gastou e quantos saíram com horário marcado." />
      )}

      {status === 'ready' && x && !empty && (
        <>
          <section aria-label="Números do período">
            <MetricGrid>
              {accounts.map((account) => (
                <div key={account.id} className={metricCellClass(account.span)}>
                  <MetricCard account={account} />
                </div>
              ))}
            </MetricGrid>
          </section>

          {data && data.trend.length > 0 && (
            <PerformanceSection title="Ticket nos últimos 6 meses">
              <TrendBars
                title="Cada cliente gastou, em média"
                points={data.trend.map((t) => ({ month: t.month, value: t.ticket_medio, low_sample: t.low_sample, atendimentos: t.atendimentos }))}
                formatValue={formatMoney}
              />
            </PerformanceSection>
          )}

          {data && data.top_services.length > 0 && (
            <PerformanceSection title="Serviços mais feitos">
              <ol className="space-y-2">
                {data.top_services.slice(0, 5).map((s, i) => (
                  <li key={s.service} className="flex items-baseline gap-3 text-sm">
                    <span className={`${font.mono} tabular-nums ${colors.textMuted} w-5`}>{i + 1}</span>
                    <span className={`flex-1 first-letter:uppercase ${colors.text}`}>{s.service}</span>
                    <span className={`${font.mono} tabular-nums ${colors.textSecondary}`}>{s.count}×</span>
                  </li>
                ))}
              </ol>
            </PerformanceSection>
          )}

          <p className={`text-[13px] ${colors.textMuted}`}>
            Só os seus números, sem comparação com colegas. Aluguel, luz e outras contas fixas não entram nestes números.
          </p>
        </>
      )}
    </div>
  );
};
