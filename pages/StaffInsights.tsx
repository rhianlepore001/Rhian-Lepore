import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { BarChart3, CalendarX, ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';
import { EmptyState, ErrorState, PageHeader, Skeleton } from '../components/ui';
import { MetricCluster, MetricGrid, PerformanceSection } from '../components/performance/PerformanceSection';
import { TrendBars } from '../components/performance/TrendBars';
import { useAuth } from '../contexts/AuthContext';
import { useBrutalTheme } from '../hooks/useBrutalTheme';
import { useBusinessCopy } from '../hooks/useBusinessCopy';
import { useStaffInsights } from '../hooks/useStaffInsights';
import { useTenantLocale } from '../hooks/useTenantLocale';
import type { StaffPeriod } from '../types/insights';
import { buildMetricAccount, STAFF_METRIC_IDS } from '../utils/staffPerformanceAccount';
import { compactPeriodLine, previousMonthName } from '../utils/staffPerformanceView';

const PERIODS: { id: StaffPeriod; label: string }[] = [
  { id: 'day', label: 'Hoje' },
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mês' },
];

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

const PAGE_PB = 'pb-[calc(8rem+var(--safe-bottom))] md:pb-16';

export const StaffInsights: React.FC = () => {
  const { role, fullName, teamMemberId } = useAuth();
  const { remainder } = useBusinessCopy();
  const { accent, colors, font, radius } = useBrutalTheme();
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
  const subtitle = firstName ? `${firstName} · ${comparing}` : comparing;

  const goMonth = (delta: number) => {
    const d = new Date(selectedYear, selectedMonth + delta, 1);
    const nextM = d.getMonth();
    const nextY = d.getFullYear();
    if (nextY > now.getFullYear() || (nextY === now.getFullYear() && nextM > now.getMonth())) return;
    setSelectedMonth(nextM);
    setSelectedYear(nextY);
    setPeriod('month');
  };
  const canGoNext = !(selectedYear === now.getFullYear() && selectedMonth === now.getMonth());

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
    <div className={`flex flex-col gap-3 lg:gap-8 ${PAGE_PB} max-w-[1120px]`}>
      <PageHeader
        title="Meus resultados"
        subtitle={<span>{subtitle}</span>}
        className="!pb-0 !gap-1"
      />

      <div className="flex items-center gap-2 min-w-0">
        <div
          role="group"
          aria-label="Período"
          className={`flex p-0.5 min-w-0 ${colors.surface} ${radius.button}`}
        >
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
                className={`px-2.5 min-h-[36px] min-w-[52px] text-sm shrink-0 ${radius.button} ${
                  active ? `${accent.bg} text-[var(--color-on-accent)]` : colors.textMuted
                } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
        {period === 'month' && (
          <div className="ml-auto inline-flex items-center shrink-0">
            <button
              type="button"
              onClick={() => goMonth(-1)}
              className={`h-11 w-11 inline-flex items-center justify-center ${colors.textSecondary} hover:text-theme-text`}
              aria-label="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className={`text-sm whitespace-nowrap tabular-nums ${colors.text}`}>
              {MONTHS[selectedMonth]} {selectedYear}
            </span>
            <button
              type="button"
              onClick={() => goMonth(1)}
              disabled={!canGoNext}
              className={`h-11 w-11 inline-flex items-center justify-center ${colors.textSecondary} hover:text-theme-text disabled:opacity-30`}
              aria-label="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {status === 'loading' && (
        <div aria-busy="true">
          <MetricGrid>
            <Skeleton className="h-[136px]" />
            <Skeleton className="h-[136px]" />
            <Skeleton className="h-[136px]" />
            <Skeleton className="h-[136px]" />
          </MetricGrid>
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
            <MetricCluster accounts={accounts} />
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
