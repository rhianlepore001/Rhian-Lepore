import { Card, PageHeader, Button } from '../components/ui';
import { SkeletonCard } from '../components/ui/Skeleton';
import React, { useMemo, useState, lazy, Suspense } from 'react';
import { CriticalEmptySlotsCard } from '../components/dashboard/CriticalEmptySlotsCard';
import { CancellationRateCard } from '../components/dashboard/CancellationRateCard';
import { RankingList } from '../components/insights/RankingList';

import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/Toast';
import { useBrutalTheme } from '../hooks/useBrutalTheme';
import { useReportsData } from '../hooks/useReports';
import { useDashboardData } from '../hooks/useDashboardData';
import { ExportButton } from '../components/ExportButton';
import { exportToCsv, exportToPdf } from '../utils/exporters';
import {
  TrendingUp,
  Target,
  AlertCircle,
  Scissors,
  Package,
  Users,
  ShoppingBag,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import { MonthYearSelector } from '../components/MonthYearSelector';
import { ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area } from 'recharts';
import { formatCurrency } from '../utils/formatters';
import { useTenantLocale } from '../hooks/useTenantLocale';

const GoalSettingsModal = lazy(() =>
  import('../components/dashboard/modals/GoalSettingsModal').then((m) => ({
    default: m.GoalSettingsModal,
  })),
);
const GoalHistoryModal = lazy(() =>
  import('../components/dashboard/modals/GoalHistoryModal').then((m) => ({
    default: m.GoalHistoryModal,
  })),
);

const MONTH_EN_TO_PT: Record<string, string> = {
  Jan: 'Jan',
  Feb: 'Fev',
  Mar: 'Mar',
  Apr: 'Abr',
  May: 'Mai',
  Jun: 'Jun',
  Jul: 'Jul',
  Aug: 'Ago',
  Sep: 'Set',
  Oct: 'Out',
  Nov: 'Nov',
  Dec: 'Dez',
};

export const Reports: React.FC = () => {
  const { user, companyId } = useAuth();
  const { showToast } = useToast();
  const effectiveUserId = companyId ?? user?.id;
  const { accent, isBeauty, colors, status, font } = useBrutalTheme();
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  const { stats, clientInsights, performance, loading, performanceLoading } = useReportsData(
    effectiveUserId,
    selectedMonth,
    selectedYear,
  );
  const {
    monthlyGoal,
    currentMonthRevenue,
    goalHistory,
    updateGoal,
    financialDoctor,
  } = useDashboardData();
  const [isEditingMonthlyGoal, setIsEditingMonthlyGoal] = useState(false);
  const [showGoalHistory, setShowGoalHistory] = useState(false);

  const { region: currencyRegion } = useTenantLocale();

  const monthlyGoalProgress =
    monthlyGoal > 0 ? Math.min(100, Math.round((currentMonthRevenue / monthlyGoal) * 100)) : 0;

  const healthScore = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        (financialDoctor.repeatClientRate || 0) +
          (financialDoctor.avgTicket > 0 ? 25 : 0) +
          (financialDoctor.topService ? 25 : 0) -
          Math.min(financialDoctor.churnRiskCount || 0, 25),
      ),
    ),
  );
  const healthSummary =
    financialDoctor.avgTicket ||
    financialDoctor.topService ||
    financialDoctor.repeatClientRate
      ? [
          financialDoctor.avgTicket > 0
            ? `Ticket médio ${formatCurrency(financialDoctor.avgTicket, currencyRegion)}`
            : null,
          financialDoctor.topService
            ? `Mais pedido: ${financialDoctor.topService}`
            : null,
          financialDoctor.repeatClientRate > 0
            ? `${Math.round(financialDoctor.repeatClientRate)}% dos clientes voltam`
            : null,
          financialDoctor.churnRiskCount > 0
            ? `${financialDoctor.churnRiskCount} cliente(s) em risco de não voltar`
            : null,
        ].filter(Boolean)
      : [
          'Indicadores aparecem após o primeiro mês com atendimentos.',
          'Continue registrando para liberar a saúde do negócio.',
        ];

  const iconClass = `flex h-11 w-11 items-center justify-center rounded-2xl ${accent.bgDim} ${accent.text}`;

  const handleMonthChange = (month: number, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
  };

  const monthLabel = useMemo(() => {
    const date = new Date(selectedYear, selectedMonth, 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }, [selectedMonth, selectedYear]);

  const monthRevenue = performance.summary.servicesRevenue + performance.summary.productsRevenue;
  const monthTicket =
    performance.summary.appointmentsCount > 0
      ? performance.summary.servicesRevenue / performance.summary.appointmentsCount
      : 0;

  const growthChartData = useMemo(
    () =>
      (clientInsights.client_growth_by_month || []).map((row) => ({
        ...row,
        month: MONTH_EN_TO_PT[row.month] || row.month,
        novos_clientes: row.new_clients,
      })),
    [clientInsights.client_growth_by_month],
  );

  const hasMonthData =
    performance.summary.appointmentsCount > 0 ||
    performance.summary.productsUnits > 0 ||
    clientInsights.top_clients.length > 0 ||
    (stats?.appointments_total || 0) > 0;

  const topServices = performance.services.slice(0, 5);
  const topProducts = performance.products.slice(0, 5);
  const topPros = performance.professionals.slice(0, 5);

  const handleExportCsv = () => {
    if (!hasMonthData) {
      showToast('Ainda não há dados suficientes para exportar.', 'warning');
      return;
    }

    const rows = [
      ...topServices.map((s, idx) => ({
        ranking: idx + 1,
        tipo: 'Serviço',
        nome: s.name,
        quantidade: s.count,
        receita: formatCurrency(s.revenue, currencyRegion),
        participacao: `${s.share}%`,
      })),
      ...topProducts.map((p, idx) => ({
        ranking: idx + 1,
        tipo: 'Produto',
        nome: p.name,
        quantidade: p.count,
        receita: formatCurrency(p.revenue, currencyRegion),
        participacao: `${p.share}%`,
      })),
    ];

    exportToCsv({
      filename: `insights-agendix-${monthLabel.replace(/\s/g, '-')}`,
      data: rows,
      columns: [
        { key: 'ranking', label: '#', format: (r) => String((r as { ranking: number }).ranking) },
        { key: 'tipo', label: 'Tipo', format: (r) => String((r as { tipo: string }).tipo) },
        { key: 'nome', label: 'Nome', format: (r) => String((r as { nome: string }).nome) },
        { key: 'quantidade', label: 'Qtd', format: (r) => String((r as { quantidade: number }).quantidade) },
        { key: 'receita', label: 'Receita', format: (r) => String((r as { receita: string }).receita) },
        { key: 'participacao', label: '%', format: (r) => String((r as { participacao: string }).participacao) },
      ],
    });
    showToast('Ranking exportado em CSV.', 'success');
  };

  const handleExportPdf = () => {
    if (!hasMonthData) {
      showToast('Ainda não há dados suficientes para exportar.', 'warning');
      return;
    }
    const rows = [
      ...topServices.map((s) => ({
        tipo: 'Serviço',
        nome: s.name,
        qtd: s.count,
        receita: formatCurrency(s.revenue, currencyRegion),
      })),
      ...topProducts.map((p) => ({
        tipo: 'Produto',
        nome: p.name,
        qtd: p.count,
        receita: formatCurrency(p.revenue, currencyRegion),
      })),
    ];
    exportToPdf({
      filename: `Insights AgendiX · ${monthLabel}`,
      data: rows,
      columns: [
        { key: 'tipo', label: 'Tipo', format: (r) => String((r as { tipo: string }).tipo) },
        { key: 'nome', label: 'Nome', format: (r) => String((r as { nome: string }).nome) },
        { key: 'qtd', label: 'Qtd', format: (r) => String((r as { qtd: number }).qtd) },
        { key: 'receita', label: 'Receita', format: (r) => String((r as { receita: string }).receita) },
      ],
    });
  };

  if (loading && !stats) {
    return (
      <div className="space-y-6 pb-24">
        <SkeletonCard className="min-h-[88px]" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SkeletonCard className="min-h-[120px]" />
          <SkeletonCard className="min-h-[120px]" />
          <SkeletonCard className="min-h-[120px]" />
          <SkeletonCard className="min-h-[120px]" />
        </div>
        <SkeletonCard className="min-h-[280px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8 pb-24">
      <PageHeader
        title="Insights"
        subtitle={
          <>
            <span className="block">O que vende, quem performa e quem volta</span>
            <span className="block mt-0.5 first-letter:uppercase">{monthLabel}</span>
          </>
        }
        action={
          <div className="flex flex-col sm:flex-row gap-2">
            <MonthYearSelector
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              onChange={handleMonthChange}
              accentColor={isBeauty ? 'beauty-neon' : 'accent-gold'}
            />
            <ExportButton onExportCsv={handleExportCsv} onExportPdf={handleExportPdf} />
          </div>
        }
      />

      {!loading && (
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card variant="outlined">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className={iconClass}>
                  <Target className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className={`font-heading text-base font-bold ${colors.text}`}>Meta do mês</h2>
                  <p className={`mt-1 text-sm ${colors.textSecondary} text-pretty`}>
                    {formatCurrency(currentMonthRevenue, currencyRegion)} de{' '}
                    {formatCurrency(monthlyGoal, currencyRegion)}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setIsEditingMonthlyGoal(true)}>
                Ajustar
              </Button>
            </div>
            <div className={`mt-4 h-2 overflow-hidden rounded-full ${colors.surface}`}>
              <div
                className={`h-full ${accent.bg} transition-all duration-700`}
                style={{ width: `${monthlyGoalProgress}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className={`font-mono text-xs ${colors.textSecondary}`}>
                {monthlyGoalProgress}% no mês
              </span>
              <button
                type="button"
                onClick={() => setShowGoalHistory(true)}
                className={`min-h-[44px] text-sm font-semibold ${accent.text}`}
              >
                Histórico
              </button>
            </div>
          </Card>

          <Card variant="outlined">
            <div className="flex items-start justify-between gap-3 min-w-0">
              <div className="flex items-start gap-3 min-w-0">
                <div className={iconClass}>
                  <Activity className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className={`font-heading text-base font-bold ${colors.text}`}>
                    Saúde do negócio
                  </h2>
                  <p className={`text-sm ${colors.textSecondary} text-pretty`}>
                    Retorno, ticket e risco de perda.
                  </p>
                </div>
              </div>
              <span className={`font-mono text-2xl font-black tabular-nums ${accent.text}`}>
                {healthScore}
              </span>
            </div>
            <div className="mt-4 space-y-2">
              {healthSummary.slice(0, 3).map((item) => (
                <div
                  key={String(item)}
                  className={`flex items-start gap-3 rounded-2xl p-3 ${colors.surface}`}
                >
                  <CheckCircle2
                    className={`mt-0.5 h-4 w-4 shrink-0 ${accent.text}`}
                    aria-hidden="true"
                  />
                  <p className={`text-sm leading-relaxed ${colors.textSecondary}`}>{item}</p>
                </div>
              ))}
            </div>
          </Card>
        </section>
      )}

      {!hasMonthData ? (
        <div className="flex flex-col items-center justify-center my-16 text-center px-4 fade-in">
          <div className={`w-20 h-20 rounded-full ${accent.bgDim} ${accent.text} flex items-center justify-center mb-5`}>
            <TrendingUp className="w-10 h-10" />
          </div>
          <h2 className={`text-2xl font-heading ${colors.text} uppercase mb-3`}>Sem dados neste período</h2>
          <p className={`${colors.textSecondary} max-w-md mx-auto leading-relaxed text-sm`}>
            Conclua atendimentos e registre vendas de produtos para ver rankings e indicadores do mês.
          </p>
        </div>
      ) : (
        <div className="space-y-6 md:space-y-8 fade-in">
          {/* 4 KPIs — sem blocos repetidos de ticket/crescimento */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-3.5 md:p-4">
              <p className={`text-xs ${colors.textMuted} uppercase ${font.mono} mb-1 flex items-center gap-1`}>
                <ShoppingBag className="w-3.5 h-3.5" /> Receita
              </p>
              <p className={`text-lg md:text-xl font-heading ${colors.text}`}>{formatCurrency(monthRevenue, currencyRegion)}</p>
              <p className={`text-xs ${colors.textMuted} mt-1`}>
                serv. {formatCurrency(performance.summary.servicesRevenue, currencyRegion)}
              </p>
            </Card>
            <Card className="p-3.5 md:p-4">
              <p className={`text-xs ${colors.textMuted} uppercase ${font.mono} mb-1 flex items-center gap-1`}>
                <Scissors className="w-3.5 h-3.5" /> Atendimentos
              </p>
              <p className={`text-lg md:text-xl font-heading ${colors.text}`}>{performance.summary.appointmentsCount}</p>
              <p className={`text-xs ${colors.textMuted} mt-1`}>ticket {formatCurrency(monthTicket, currencyRegion)}</p>
            </Card>
            <Card className="p-3.5 md:p-4">
              <p className={`text-xs ${colors.textMuted} uppercase ${font.mono} mb-1 flex items-center gap-1`}>
                <Package className="w-3.5 h-3.5" /> Produtos
              </p>
              <p className={`text-lg md:text-xl font-heading ${colors.text}`}>{performance.summary.productsUnits} un.</p>
              <p className={`text-xs ${colors.textMuted} mt-1`}>
                {formatCurrency(performance.summary.productsRevenue, currencyRegion)}
              </p>
            </Card>
            <Card className="p-3.5 md:p-4">
              <p className={`text-xs ${colors.textMuted} uppercase ${font.mono} mb-1 flex items-center gap-1`}>
                <Target className="w-3.5 h-3.5" /> Saúde
              </p>
              <p className={`text-lg md:text-xl font-heading ${colors.text}`}>
                {stats?.repeat_client_rate || 0}%
                <span className={`text-xs ${colors.textMuted} font-sans font-normal ml-1`}>recorr.</span>
              </p>
              <p className={`text-xs ${colors.textMuted} mt-1 flex flex-wrap items-center gap-x-1 gap-y-0.5`}>
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>
                  {(stats?.weekly_growth || 0) > 0 ? '+' : ''}
                  {stats?.weekly_growth || 0}% sem. · {stats?.churn_risk_count || 0} risco
                </span>
              </p>
            </Card>
          </div>

          {/* Rankings principais */}
          <section>
            <div className="flex items-end justify-between gap-3 mb-3 min-w-0">
              <div className="min-w-0">
                <h2 className={`text-lg font-heading ${colors.text} uppercase tracking-wide md:tracking-wider text-pretty`}>
                  O que mais vende
                </h2>
                <p className={`text-xs ${colors.textMuted}`}>Top 5 por receita no mês</p>
              </div>
              {performanceLoading && (
                <span className={`text-xs ${colors.textMuted} ${font.mono} uppercase`}>Atualizando…</span>
              )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <RankingList
                title="Serviços"
                subtitle="Atendimentos concluídos"
                icon={Scissors}
                items={topServices}
                currencyRegion={currencyRegion}
                emptyTitle="Nenhum serviço no mês"
                emptyDescription="Conclua atendimentos para ver o ranking."
                countLabel={(item) => `${item.count}×`}
              />
              <RankingList
                title="Produtos"
                subtitle="Vendas no checkout ou avulso"
                icon={Package}
                items={topProducts}
                currencyRegion={currencyRegion}
                emptyTitle="Nenhuma venda de produto"
                emptyDescription="Venda produtos para ranquear."
                countLabel={(item) => `${item.count} un.`}
                showMargin
              />
            </div>
          </section>

          {/* Equipe + clientes + gráfico — uma faixa, sem campeões duplicados */}
          <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <Card className="xl:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className={`p-2 rounded-xl ${accent.bgDim} ${accent.text}`}>
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`text-base font-heading ${colors.text} uppercase`}>Equipe</h3>
                  <p className={`text-xs ${colors.textMuted}`}>Receita de serviços no mês</p>
                </div>
              </div>
              {topPros.length === 0 ? (
                <p className={`text-sm ${colors.textMuted}`}>Sem atendimentos atribuídos neste mês.</p>
              ) : (
                <ol className="space-y-3">
                  {topPros.map((pro, idx) => (
                    <li key={pro.id} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`w-6 h-6 rounded-md text-xs font-bold ${font.mono} flex items-center justify-center ${
                            idx === 0 ? `${accent.bg} text-[var(--color-bg)]` : `${colors.surface} ${colors.textSecondary}`
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className={`${colors.text} font-semibold truncate`}>{pro.name}</p>
                          <p className={`text-xs ${colors.textMuted}`}>{pro.count} serviços</p>
                        </div>
                      </div>
                      <p className={`${accent.text} ${font.mono} text-sm font-bold shrink-0`}>
                        {formatCurrency(pro.revenue, currencyRegion)}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </Card>

            <Card className="xl:col-span-2">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div>
                  <h3 className={`text-base font-heading ${colors.text} uppercase`}>Novos clientes</h3>
                  <p className={`text-xs ${colors.textMuted}`}>Últimos 6 meses</p>
                </div>
              </div>
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={growthChartData}>
                    <defs>
                      <linearGradient id="colorGrowthPt" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={accent.hex} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={accent.hex} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-divider)" vertical={false} />
                    <XAxis dataKey="month" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--color-card)',
                        border: '1px solid var(--color-divider)',
                        borderRadius: '12px',
                      }}
                      labelStyle={{ color: 'var(--color-text-muted)' }}
                      formatter={(value) => [Number(value ?? 0), 'Novos clientes']}
                      labelFormatter={(label) => `Mês: ${label}`}
                    />
                    <Area
                      type="monotone"
                      dataKey="novos_clientes"
                      name="Novos clientes"
                      stroke={accent.hex}
                      fillOpacity={1}
                      fill="url(#colorGrowthPt)"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0, fill: accent.hex }}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <Card className="lg:col-span-3" title="Melhores clientes">
              <div className="overflow-x-auto -mx-2">
                <table className="w-full text-left">
                  <thead>
                    <tr className={`border-b ${colors.divider}`}>
                      <th className={`px-2 py-3 text-xs font-mono ${colors.textMuted} uppercase`}>Cliente</th>
                      <th className={`px-2 py-3 text-xs font-mono ${colors.textMuted} uppercase text-center`}>Visitas</th>
                      <th className={`px-2 py-3 text-xs font-mono ${colors.textMuted} uppercase text-right`}>Gasto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-divider)]">
                    {clientInsights.top_clients.length === 0 ? (
                      <tr>
                        <td colSpan={3} className={`px-2 py-8 text-center ${colors.textMuted}`}>
                          Ainda gerando histórico...
                        </td>
                      </tr>
                    ) : (
                      clientInsights.top_clients.slice(0, 6).map((client, idx) => (
                        <tr key={idx}>
                          <td className="px-2 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${accent.bgDim} ${accent.text}`}>
                                {client.name.charAt(0)}
                              </div>
                              <div>
                                <p className={`${colors.text} font-semibold text-sm`}>{client.name}</p>
                                <p className={`text-xs ${colors.textMuted}`}>Última em {client.last_visit}</p>
                              </div>
                            </div>
                          </td>
                          <td className={`px-2 py-3 text-center font-mono ${colors.text}`}>{client.visits}</td>
                          <td className={`px-2 py-3 text-right font-bold ${accent.text} text-sm`}>
                            {formatCurrency(client.revenue, currencyRegion)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            <div className="lg:col-span-2 space-y-4">
              <h2 className={`text-lg font-heading ${colors.text} uppercase tracking-wider`}>Agenda</h2>
              <CriticalEmptySlotsCard />
              <CancellationRateCard />
            </div>
          </section>
        </div>
      )}

      <Suspense fallback={null}>
        <GoalSettingsModal
          isOpen={isEditingMonthlyGoal}
          onClose={() => setIsEditingMonthlyGoal(false)}
          currentGoal={monthlyGoal}
          onSave={updateGoal}
          isBeauty={isBeauty}
          goalKind="monthly"
          currencyRegion={currencyRegion}
        />
        <GoalHistoryModal
          isOpen={showGoalHistory}
          onClose={() => setShowGoalHistory(false)}
          history={goalHistory}
          isBeauty={isBeauty}
          currencyRegion={currencyRegion}
        />
      </Suspense>
    </div>
  );
};
