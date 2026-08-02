import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  DollarSign,
  Package,
  Scissors,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Card, EmptyState, PageHeader, SkeletonCard } from '../components/ui';
import { MonthYearSelector } from '../components/MonthYearSelector';
import { useAuth } from '../contexts/AuthContext';
import { useBrutalTheme } from '../hooks/useBrutalTheme';
import { useStaffInsights } from '../hooks/useStaffInsights';
import { formatCurrency, formatDate, formatDateTime, formatTime } from '../utils/formatters';
import type { StaffPeriod } from '../types/insights';

const PERIODS: { id: StaffPeriod; label: string }[] = [
  { id: 'day', label: 'Hoje' },
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mês' },
];

export const StaffInsights: React.FC = () => {
  const { role, fullName, teamMemberId, region } = useAuth();
  const { accent, colors, font, isBeauty } = useBrutalTheme();
  const currencyRegion = region === 'PT' ? 'PT' : 'BR';

  const now = new Date();
  const [period, setPeriod] = useState<StaffPeriod>('month');
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const { data, loading, refreshing, periodLabel } = useStaffInsights(period, selectedMonth, selectedYear);

  if (role === 'owner') return <Navigate to="/insights" replace />;

  const firstName = fullName?.split(' ')[0];
  const isCurrentMonth =
    selectedMonth === now.getMonth() && selectedYear === now.getFullYear();

  const handlePeriodChange = (next: StaffPeriod) => {
    setPeriod(next);
    if (next === 'day' || next === 'week') {
      setSelectedMonth(now.getMonth());
      setSelectedYear(now.getFullYear());
    }
  };

  const handleMonthChange = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
    setPeriod('month');
  };

  const hasPeriodData =
    data.summary.appointmentsCount > 0 ||
    data.summary.productsUnits > 0 ||
    data.todayUpcoming.length > 0;

  if (!teamMemberId) {
    return (
      <div className="space-y-6 pb-24">
        <PageHeader
          title="Meus Resultados"
          subtitle="Seus atendimentos, produtos e comissões"
        />
        <Card>
          <EmptyState
            icon={TrendingUp}
            title="Perfil ainda não vinculado"
            description="Peça ao responsável para te adicionar na equipe. Assim que estiver vinculado, seus resultados aparecem aqui."
            bordered
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 pb-24">
      <PageHeader
        title={firstName ? `Meus Resultados — ${firstName}` : 'Meus Resultados'}
        subtitle={
          <>
            <span className="block">Seus serviços, produtos e comissões</span>
            <span className="block mt-0.5 first-letter:uppercase">{periodLabel}</span>
          </>
        }
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
                  onClick={() => handlePeriodChange(item.id)}
                  className={`px-3.5 py-2 min-h-[44px] min-w-[72px] text-xs ${font.mono} uppercase tracking-wider border-2 rounded-xl transition-all shrink-0 ${
                    active
                      ? `${accent.bg} text-[var(--color-on-accent)] ${accent.border}`
                      : `border-[var(--color-border)] ${colors.textMuted} hover:border-[var(--color-border)] hover:text-[var(--color-text)]`
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
            <MonthYearSelector
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              onChange={handleMonthChange}
              accentColor={isBeauty ? 'beauty-neon' : 'accent-gold'}
            />
          ) : undefined
        }
      />

      {loading && !hasPeriodData ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <SkeletonCard className="min-h-[110px]" />
            <SkeletonCard className="min-h-[110px]" />
            <SkeletonCard className="min-h-[110px]" />
            <SkeletonCard className="min-h-[110px]" />
          </div>
          <SkeletonCard className="min-h-[220px]" />
          <SkeletonCard className="min-h-[220px]" />
        </div>
      ) : !hasPeriodData ? (
        <div className="flex flex-col items-center justify-center my-12 text-center px-4 fade-in">
          <div className={`w-16 h-16 rounded-2xl ${accent.bgDim} ${accent.text} flex items-center justify-center mb-4`}>
            <TrendingUp className="w-8 h-8" aria-hidden="true" />
          </div>
          <h2 className={`text-xl font-heading ${colors.text} uppercase mb-2`}>
            Sem resultados em {periodLabel.toLowerCase()}
          </h2>
          <p className={`${colors.textSecondary} max-w-md text-sm leading-relaxed`}>
            Conclua atendimentos e registre vendas de produtos para ver sua análise aqui.
            {period === 'month'
              ? ' Use as setas para consultar meses anteriores.'
              : ' Troque para Mês para ver o histórico completo.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6 md:space-y-8 fade-in">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="p-3.5 md:p-4" variant="elevated">
              <p className={`text-xs ${colors.textMuted} uppercase ${font.mono} mb-1 flex items-center gap-1.5`}>
                <Scissors className="w-3.5 h-3.5" aria-hidden="true" /> Atendimentos
              </p>
              <p className={`text-2xl md:text-3xl font-heading ${accent.text} font-bold tabular-nums`}>
                {loading ? '—' : data.summary.appointmentsCount}
              </p>
              <p className={`text-xs ${colors.textMuted} mt-1`}>concluídos no período</p>
            </Card>

            <Card className="p-3.5 md:p-4">
              <p className={`text-xs ${colors.textMuted} uppercase ${font.mono} mb-1 flex items-center gap-1.5`}>
                <Users className="w-3.5 h-3.5" aria-hidden="true" /> Clientes
              </p>
              <p className={`text-2xl md:text-3xl font-heading ${colors.text} font-bold tabular-nums`}>
                {loading ? '—' : data.summary.uniqueClients}
              </p>
              <p className={`text-xs ${colors.textMuted} mt-1`}>únicos no período</p>
            </Card>

            <Card className="p-3.5 md:p-4" variant="elevated">
              <p className={`text-xs ${colors.textMuted} uppercase ${font.mono} mb-1 flex items-center gap-1.5`}>
                <DollarSign className="w-3.5 h-3.5" aria-hidden="true" /> Comissões
              </p>
              <p className={`text-xl md:text-2xl font-heading ${accent.text} font-bold tabular-nums`}>
                {loading ? '—' : formatCurrency(data.summary.commissionsTotal, currencyRegion)}
              </p>
              <p className={`text-xs ${colors.textMuted} mt-1`}>só a sua comissão</p>
            </Card>

            <Card className="p-3.5 md:p-4">
              <p className={`text-xs ${colors.textMuted} uppercase ${font.mono} mb-1 flex items-center gap-1.5`}>
                <Package className="w-3.5 h-3.5" aria-hidden="true" /> Produtos
              </p>
              <p className={`text-2xl md:text-3xl font-heading ${colors.text} font-bold tabular-nums`}>
                {loading ? '—' : data.summary.productsUnits}
                <span className={`text-sm font-sans font-normal ${colors.textMuted} ml-1`}>un.</span>
              </p>
              <p className={`text-xs ${colors.textMuted} mt-1`}>vendidas no período</p>
            </Card>
          </div>

          <section className="space-y-3">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className={`text-lg font-heading ${colors.text} uppercase tracking-wide`}>
                  Meus serviços
                </h2>
                <p className={`text-xs ${colors.textMuted}`}>
                  Todos os serviços que você realizou no período
                </p>
              </div>
              {refreshing && (
                <span className={`text-xs ${colors.textMuted} ${font.mono} uppercase shrink-0`}>
                  Atualizando…
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="h-full">
                <div className="flex items-center gap-2 mb-4">
                  <div className={`p-2 rounded-xl ${accent.bgDim} ${accent.text}`}>
                    <Scissors className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className={`text-sm font-heading ${colors.text} uppercase`}>Por tipo</h3>
                    <p className={`text-xs ${colors.textMuted}`}>Quantidade e comissão</p>
                  </div>
                </div>

                {data.services.length === 0 ? (
                  <EmptyState
                    icon={Scissors}
                    title="Nenhum serviço no período"
                    description="Atendimentos concluídos aparecem aqui."
                    bordered
                    className="!py-8"
                  />
                ) : (
                  <ol className="space-y-4">
                    {data.services.map((item, index) => (
                      <li key={item.id} className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center text-xs font-bold ${font.mono} ${
                                index === 0
                                  ? `${accent.bg} text-[var(--color-bg)]`
                                  : `${colors.surface} ${colors.textSecondary} border border-[var(--color-border)]`
                              }`}
                            >
                              {index + 1}
                            </span>
                            <div className="min-w-0">
                              <p className={`${colors.text} font-semibold truncate`}>{item.name}</p>
                              <p className={`text-xs ${colors.textMuted} ${font.mono}`}>
                                {item.count}×
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`${accent.text} font-bold ${font.mono} text-sm`}>
                              {formatCurrency(item.commission, currencyRegion)}
                            </p>
                            <p className={`text-xs ${colors.textMuted}`}>comissão</p>
                          </div>
                        </div>
                        <div className={`h-1.5 rounded-full ${colors.surface} overflow-hidden`}>
                          <div
                            className={`h-full rounded-full ${accent.bg}`}
                            style={{ width: `${Math.max(item.share, item.share > 0 ? 4 : 0)}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </Card>

              <Card className="h-full">
                <div className="flex items-center gap-2 mb-4">
                  <div className={`p-2 rounded-xl ${accent.bgDim} ${accent.text}`}>
                    <Calendar className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className={`text-sm font-heading ${colors.text} uppercase`}>Últimos atendimentos</h3>
                    <p className={`text-xs ${colors.textMuted}`}>Cliente, serviço e comissão</p>
                  </div>
                </div>

                {data.recentServices.length === 0 ? (
                  <EmptyState
                    icon={Calendar}
                    title="Sem atendimentos"
                    description="Seus serviços concluídos listam aqui."
                    bordered
                    className="!py-8"
                  />
                ) : (
                  <ul className="divide-y divide-[var(--color-border)]">
                    {data.recentServices.map((line) => (
                      <li key={line.id} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className={`${colors.text} text-sm font-medium truncate`}>{line.clientName}</p>
                          <p className={`${colors.textMuted} text-xs truncate`}>{line.service}</p>
                          <p className={`${colors.textMuted} ${font.mono} text-xs mt-0.5`}>
                            {formatDateTime(line.appointmentTime, currencyRegion)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`${accent.text} text-sm font-semibold tabular-nums ${font.mono}`}>
                            {formatCurrency(line.commissionValue, currencyRegion)}
                          </p>
                          <p className={`text-xs ${colors.textMuted}`}>comissão</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </section>

          <section className="space-y-3">
            <div>
              <h2 className={`text-lg font-heading ${colors.text} uppercase tracking-wide`}>
                Produtos vendidos
              </h2>
              <p className={`text-xs ${colors.textMuted}`}>
                Vendas no checkout ou avulsas atribuídas a você
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="h-full">
                <div className="flex items-center gap-2 mb-4">
                  <div className={`p-2 rounded-xl ${accent.bgDim} ${accent.text}`}>
                    <Package className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className={`text-sm font-heading ${colors.text} uppercase`}>Por produto</h3>
                    <p className={`text-xs ${colors.textMuted}`}>Unidades e comissão</p>
                  </div>
                </div>

                {data.products.length === 0 ? (
                  <EmptyState
                    icon={Package}
                    title="Nenhuma venda de produto"
                    description="Quando você vender um produto, ele entra aqui."
                    bordered
                    className="!py-8"
                  />
                ) : (
                  <ol className="space-y-4">
                    {data.products.map((item, index) => (
                      <li key={item.id} className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center text-xs font-bold ${font.mono} ${
                                index === 0
                                  ? `${accent.bg} text-[var(--color-bg)]`
                                  : `${colors.surface} ${colors.textSecondary} border border-[var(--color-border)]`
                              }`}
                            >
                              {index + 1}
                            </span>
                            <div className="min-w-0">
                              <p className={`${colors.text} font-semibold truncate`}>{item.name}</p>
                              <p className={`text-xs ${colors.textMuted} ${font.mono}`}>
                                {item.count} un.
                                {item.stockQuantity !== null ? ` · estoque ${item.stockQuantity}` : ''}
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`${accent.text} font-bold ${font.mono} text-sm`}>
                              {formatCurrency(item.commission, currencyRegion)}
                            </p>
                            <p className={`text-xs ${colors.textMuted}`}>comissão</p>
                          </div>
                        </div>
                        <div className={`h-1.5 rounded-full ${colors.surface} overflow-hidden`}>
                          <div
                            className={`h-full rounded-full ${accent.bg}`}
                            style={{ width: `${Math.max(item.share, item.share > 0 ? 4 : 0)}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </Card>

              <Card className="h-full">
                <div className="flex items-center gap-2 mb-4">
                  <div className={`p-2 rounded-xl ${accent.bgDim} ${accent.text}`}>
                    <DollarSign className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className={`text-sm font-heading ${colors.text} uppercase`}>Últimas vendas</h3>
                    <p className={`text-xs ${colors.textMuted}`}>Produto, qtd e comissão</p>
                  </div>
                </div>

                {data.recentProducts.length === 0 ? (
                  <EmptyState
                    icon={Package}
                    title="Sem vendas recentes"
                    description="As vendas de produto atribuídas a você listam aqui."
                    bordered
                    className="!py-8"
                  />
                ) : (
                  <ul className="divide-y divide-[var(--color-border)]">
                    {data.recentProducts.map((line) => (
                      <li key={line.id} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className={`${colors.text} text-sm font-medium truncate`}>{line.productName}</p>
                          <p className={`${colors.textMuted} text-xs`}>
                            {line.quantity} un.
                            {line.clientName ? ` · ${line.clientName}` : ''}
                          </p>
                          <p className={`${colors.textMuted} ${font.mono} text-xs mt-0.5`}>
                            {formatDate(line.createdAt, currencyRegion)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`${accent.text} text-sm font-semibold tabular-nums ${font.mono}`}>
                            {formatCurrency(line.commissionValue, currencyRegion)}
                          </p>
                          <p className={`text-xs ${colors.textMuted}`}>comissão</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </section>

          <section>
            <Card title="Próximos hoje">
              {data.todayUpcoming.length === 0 ? (
                <div className="text-center py-6">
                  <Clock className={`w-8 h-8 ${colors.textMuted} mx-auto mb-2`} aria-hidden="true" />
                  <p className={`${colors.textMuted} ${font.mono} text-sm`}>Nenhum agendamento para hoje</p>
                </div>
              ) : (
                <ul className="space-y-0 divide-y divide-[var(--color-border)]">
                  {data.todayUpcoming.map((apt) => (
                    <li key={apt.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className={`${colors.text} text-sm font-medium truncate`}>{apt.clientName}</p>
                        <p className={`${colors.textMuted} text-xs truncate`}>{apt.service}</p>
                      </div>
                      <span className={`${accent.text} ${font.mono} text-xs font-bold shrink-0`}>
                        {formatTime(apt.appointmentTime)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>
        </div>
      )}
    </div>
  );
};
