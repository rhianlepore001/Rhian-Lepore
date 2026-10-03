import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { BarChart3, CalendarX, TrendingUp } from 'lucide-react';
import { EmptyState, ErrorState, PageHeader, Skeleton } from '../components/ui';
import { MonthYearSelector } from '../components/MonthYearSelector';
import { DeltaText } from '../components/performance/DeltaText';
import { MetricInfo } from '../components/performance/MetricInfo';
import { useAuth } from '../contexts/AuthContext';
import { useBrutalTheme } from '../hooks/useBrutalTheme';
import { useStaffInsights } from '../hooks/useStaffInsights';
import { useTenantLocale } from '../hooks/useTenantLocale';
import type { StaffPeriod } from '../types/insights';
import {
  formatHours,
  formatPercent,
  moneyDelta,
  monthShortLabel,
  rateDelta,
} from '../utils/staffPerformanceView';

const PERIODS: { id: StaffPeriod; label: string }[] = [
  { id: 'day', label: 'Hoje' },
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mês' },
];

export const StaffInsights: React.FC = () => {
  const { role, fullName, teamMemberId } = useAuth();
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
  const prev = me?.previous;
  const prevSample = prev?.atendimentos ?? 0;
  const empty = !!x && x.atendimentos === 0 && x.vendas_produtos === 0;

  if (!teamMemberId) {
    return (
      <div className="space-y-6 pb-28">
        <PageHeader title="Meus resultados" subtitle="Seus atendimentos, produtos e comissões" />
        <EmptyState icon={TrendingUp} bordered title="Perfil ainda não vinculado" description="Peça ao responsável para te adicionar na equipe. Assim que estiver vinculado, seus resultados aparecem aqui." />
      </div>
    );
  }

  const card = (label: string, info: React.ComponentProps<typeof MetricInfo>['id'], value: string, hint?: string | null, delta?: ReturnType<typeof moneyDelta>) => (
    <div className={`p-4 border ${colors.border} ${radius.card} ${colors.card} min-w-0`}>
      <div className="flex items-center justify-between gap-1">
        <span className={`text-xs uppercase tracking-wide ${font.label} ${colors.textMuted}`}>{label}</span>
        <MetricInfo id={info} />
      </div>
      <p className={`mt-2 ${font.mono} tabular-nums font-bold text-xl ${colors.text} whitespace-nowrap`}>{value}</p>
      {hint && <p className={`mt-0.5 text-xs ${colors.textMuted} tabular-nums`}>{hint}</p>}
      <DeltaText delta={delta ?? null} className="mt-1.5" />
    </div>
  );

  return (
    <div className="space-y-6 md:space-y-8 pb-28">
      <PageHeader
        title={firstName ? `Meus resultados — ${firstName}` : 'Meus resultados'}
        subtitle={<span className="first-letter:uppercase">{periodLabel}</span>}
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
                  className={`px-3.5 min-h-[44px] min-w-[72px] text-xs ${font.mono} uppercase tracking-wider border ${radius.button} shrink-0 ${
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
        <div aria-busy="true" className="space-y-3">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
          <Skeleton className="h-40 w-full" />
        </div>
      )}

      {status === 'error' && (
        <ErrorState title="Não foi possível carregar seus resultados." message="Confira a conexão e tente de novo." retryLabel="Tentar de novo" onRetry={retry} />
      )}

      {status === 'unavailable' && (
        <EmptyState icon={BarChart3} bordered title="A análise ainda não foi ativada." description="Seus números aparecem aqui assim que a atualização do banco for publicada. Nenhum valor é estimado." />
      )}

      {status === 'ready' && empty && (
        <EmptyState icon={CalendarX} bordered title={`Sem resultados em ${periodLabel.toLowerCase()}`} description="Conclua atendimentos para ver ticket, hora de cadeira e o quanto o cliente voltou a agendar." />
      )}

      {status === 'ready' && x && !empty && (
        <div className="space-y-5">
          <section aria-label="Números do período" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {card('Atendimentos', 'atendimentos', String(x.atendimentos), x.atendimentos_clube ? `${x.atendimentos_clube} do Clube` : 'concluídos', moneyDelta(x.atendimentos, prev?.atendimentos, { prevSample, formatMoney: (n) => String(n) }))}
            {card('Faturamento por hora', 'faturamento_por_hora', x.faturamento_por_hora == null ? '—' : `${formatMoney(x.faturamento_por_hora)}/h`, x.tempo_pago_min ? `${formatHours(x.tempo_pago_min)} de cadeira paga` : 'sem tempo pago', moneyDelta(x.faturamento_por_hora, prev?.faturamento_por_hora, { prevSample, formatMoney }))}
            {card('Ticket médio', 'ticket_medio', x.ticket_medio == null ? '—' : formatMoney(x.ticket_medio), x.atendimentos_pagos ? `${x.atendimentos_pagos} pagos` : 'nenhum atendimento pago', moneyDelta(x.ticket_medio, prev?.ticket_medio, { prevSample, formatMoney }))}
            {card('Voltou a agendar', 'voltou', formatPercent(x.voltou_taxa), x.maduros ? `${x.voltou} de ${x.maduros}` : null, rateDelta(x.voltou_taxa, prev?.voltou_taxa, { prevSample }))}
          </section>

          <section className={`border ${colors.border} ${radius.card} ${colors.card} grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 ${colors.divider}`}>
            <div className="p-4">
              <div className="flex items-center justify-between"><span className={`text-xs uppercase tracking-wide ${font.label} ${colors.textMuted}`}>Tempo de cadeira (agendado)</span><MetricInfo id="tempo" /></div>
              <p className={`mt-2 text-sm ${colors.text}`}>{`${formatHours(x.tempo_total_min)}${x.tempo_clube_min ? ` (${formatHours(x.tempo_clube_min)} do Clube)` : ''}`}</p>
            </div>
            <div className={`p-4 sm:border-l ${colors.divider}`}>
              <div className="flex items-center justify-between"><span className={`text-xs uppercase tracking-wide ${font.label} ${colors.textMuted}`}>Faltas e cancelamentos</span><MetricInfo id="faltas" /></div>
              <p className={`mt-2 text-sm ${colors.text}`}>{x.desfechos ? `Faltas ${formatPercent(x.taxa_faltas)} (${x.faltas} de ${x.desfechos}) · Cancelamentos ${formatPercent(x.taxa_cancelamentos)} (${x.cancelamentos} de ${x.desfechos})` : 'Nenhum desfecho'}</p>
              {x.sem_desfecho > 0 && <p className={`mt-1 text-xs ${colors.textMuted}`}>{x.sem_desfecho} sem desfecho</p>}
            </div>
            <div className={`p-4 lg:border-l ${colors.divider}`}>
              <div className="flex items-center justify-between"><span className={`text-xs uppercase tracking-wide ${font.label} ${colors.textMuted}`}>Produtos</span><MetricInfo id="produtos" /></div>
              <p className={`mt-2 text-sm ${colors.text}`}>{x.vendas_produtos ? `${x.visitas_com_produto} de ${x.atendimentos} com produto (${formatPercent(x.attach)})` : 'Nenhuma venda no período'}</p>
              {x.vendas_produtos > 0 && <p className={`mt-1 text-xs ${colors.textMuted}`}>{formatMoney(x.receita_produtos)} em produtos</p>}
            </div>
          </section>

          <section className={`p-4 border ${colors.border} ${radius.card} ${colors.card}`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs uppercase tracking-wide ${font.label} ${colors.textMuted}`}>Sua comissão no período</span>
              <MetricInfo id="comissao_periodo" />
            </div>
            <p className={`mt-2 ${font.mono} tabular-nums font-bold text-2xl ${accent.text}`}>{formatMoney(x.comissao_periodo)}</p>
            <DeltaText delta={moneyDelta(x.comissao_periodo, prev?.comissao_periodo, { prevSample, formatMoney })} className="mt-1.5" />
            {x.sem_registro_financeiro > 0 && (
              <p className={`mt-2 text-sm ${colors.textMuted}`}>{x.sem_registro_financeiro} atendimentos sem registro financeiro: comissão não calculada. Conclua pelo botão Concluir e cobrar.</p>
            )}
          </section>

          {data && data.trend.length > 0 && (
            <section className={`p-4 border ${colors.border} ${radius.card} ${colors.card}`}>
              <h2 className={`text-sm font-semibold ${colors.text}`}>Ticket nos últimos 6 meses</h2>
              <ol className="mt-3 grid grid-cols-6 gap-2 items-end h-28">
                {data.trend.map((t) => {
                  const max = Math.max(0, ...data.trend.map((p) => p.ticket_medio ?? 0));
                  const h = t.ticket_medio == null || max === 0 ? 0 : Math.max(4, Math.round((t.ticket_medio / max) * 100));
                  return (
                    <li key={t.month} className="flex flex-col items-center justify-end h-full gap-1">
                      <span aria-hidden="true" className={`w-full max-w-[2rem] ${t.low_sample ? `border border-dashed ${accent.border}` : accent.bg}`} style={{ height: `${h}%` }} />
                      <span className={`text-xs ${colors.textMuted}`}>{monthShortLabel(t.month)}</span>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}

          {data && data.top_services.length > 0 && (
            <section className={`p-4 border ${colors.border} ${radius.card} ${colors.card}`}>
              <h2 className={`text-sm font-semibold ${colors.text}`}>Serviços mais feitos</h2>
              <ol className="mt-3 space-y-2">
                {data.top_services.slice(0, 5).map((s, i) => (
                  <li key={s.service} className="flex items-baseline gap-3 text-sm">
                    <span className={`${font.mono} tabular-nums ${colors.textMuted} w-5`}>{i + 1}</span>
                    <span className={`flex-1 first-letter:uppercase ${colors.text}`}>{s.service}</span>
                    <span className={`${font.mono} tabular-nums ${colors.textSecondary}`}>{s.count}×</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <p className={`text-xs ${colors.textMuted}`}>Só os seus números. Sem comparação com colegas e sem o retorno da casa. Aluguel de cadeira ainda não é suportado.</p>
        </div>
      )}
    </div>
  );
};
