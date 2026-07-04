import { Card } from '../components/ui';
import React, { useState, useMemo, lazy, Suspense } from 'react';

import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/Toast';
import { useBrutalTheme } from '../hooks/useBrutalTheme';
import { useReportsData } from '../hooks/useReports';
import { useDashboardData } from '../hooks/useDashboardData';
import { useInsightsFinance } from '../hooks/useInsightsFinance';

const GoalSettingsModal = lazy(() => import('../components/dashboard/modals/GoalSettingsModal').then(m => ({ default: m.GoalSettingsModal })));
const GoalHistoryModal = lazy(() => import('../components/dashboard/modals/GoalHistoryModal').then(m => ({ default: m.GoalHistoryModal })));
import { ExportButton } from '../components/ExportButton';
import { exportToCsv, exportToPdf } from '../utils/exporters';
import {
    TrendingUp,
    DollarSign,
    Target,
    AlertCircle,
    Brain,
    Calendar,
    BarChart2,
    Users,
} from 'lucide-react';
import { MonthYearSelector } from '../components/MonthYearSelector';
import { TabNav } from '../components/TabNav';
import { OccupancyRateCard } from '../components/dashboard/OccupancyRateCard';
import { CancellationRateCard } from '../components/dashboard/CancellationRateCard';
import { CriticalEmptySlotsCard } from '../components/dashboard/CriticalEmptySlotsCard';
import { FinanceInsights } from '../components/FinanceInsights';
import { ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area } from 'recharts';
import { formatCurrency } from '../utils/formatters';

type InsightsTab = 'agenda' | 'clientes' | 'servicos';

export const Reports: React.FC = () => {
    const { user, companyId, region } = useAuth();
    const { showToast } = useToast();
    const effectiveUserId = companyId ?? user?.id;
    const { accent, isBeauty } = useBrutalTheme();
    const currentDate = new Date();
    const [activeTab, setActiveTab] = useState<InsightsTab>('agenda');
    const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

    const { stats, clientInsights, loading } = useReportsData(effectiveUserId);
    const financeInsights = useInsightsFinance();
    const { monthlyGoal, currentMonthRevenue, goalHistory, updateGoal } = useDashboardData();
    const [isEditingGoal, setIsEditingGoal] = useState(false);
    const [showGoalHistory, setShowGoalHistory] = useState(false);
    const goalProgress = monthlyGoal > 0 ? Math.round((currentMonthRevenue / monthlyGoal) * 100) : 0;

    const currencyRegion = region === 'PT' ? 'PT' : 'BR';

    const handleMonthChange = (month: number, year: number) => {
        setSelectedMonth(month);
        setSelectedYear(year);
    };

    const hasSufficientData = stats && (stats.appointments_total > 5 || stats.total_profit > 0 || clientInsights.top_clients.length > 0);

    const monthLabel = useMemo(() => {
        const date = new Date(selectedYear, selectedMonth, 1);
        return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    }, [selectedMonth, selectedYear]);

    const handleExportCsv = () => {
        if (!stats || !hasSufficientData) {
            showToast('Ainda não há dados suficientes para exportar.', 'warning');
            return;
        }
        const rows = clientInsights.top_clients.map(c => ({
            cliente: c.name,
            visitas: c.visits,
            total_gasto: formatCurrency(c.revenue, currencyRegion),
            ultima_visita: c.last_visit,
        }));
        const summary = [
            { metrica: 'Média por atendimento', valor: formatCurrency(stats.avg_ticket || 0, currencyRegion) },
            { metrica: 'Crescimento semanal', valor: `${stats.weekly_growth || 0}%` },
            { metrica: 'Recorrência', valor: `${stats.repeat_client_rate || 0}%` },
            { metrica: 'Clientes em risco', valor: String(stats.churn_risk_count || 0) },
            { metrica: 'Atendimentos no mês', valor: String(stats.appointments_total || 0) },
        ];
        exportToCsv({
            filename: `relatorio-agendix-${monthLabel.replace(/\s/g, '-')}`,
            data: [...summary, ...rows],
            columns: [
                { key: 'metrica', label: 'Métrica / Cliente', format: r => (r as { metrica?: string }).metrica ?? (r as { cliente?: string }).cliente ?? '' },
                { key: 'valor', label: 'Valor', format: r => (r as { valor?: string }).valor ?? '' },
                { key: 'visitas', label: 'Visitas', format: r => (r as { visitas?: number }).visitas ?? '' },
                { key: 'total_gasto', label: 'Total Gasto', format: r => (r as { total_gasto?: string }).total_gasto ?? '' },
                { key: 'ultima_visita', label: 'Última Visita', format: r => (r as { ultima_visita?: string }).ultima_visita ?? '' },
            ],
        });
        showToast('Relatório CSV exportado. Abra no Excel ou Google Sheets.', 'success');
    };

    const handleExportPdf = () => {
        if (!stats || !hasSufficientData) {
            showToast('Ainda não há dados suficientes para exportar.', 'warning');
            return;
        }
        const rows = clientInsights.top_clients.map(c => ({
            cliente: c.name,
            visitas: c.visits,
            total_gasto: formatCurrency(c.revenue, currencyRegion),
            ultima_visita: c.last_visit,
        }));
        const summary = [
            { metrica: 'Média por atendimento', valor: formatCurrency(stats.avg_ticket || 0, currencyRegion) },
            { metrica: 'Crescimento semanal', valor: `${stats.weekly_growth || 0}%` },
            { metrica: 'Recorrência', valor: `${stats.repeat_client_rate || 0}%` },
            { metrica: 'Clientes em risco', valor: String(stats.churn_risk_count || 0) },
        ];
        exportToPdf({
            filename: `Relatório AgendiX · ${monthLabel}`,
            data: [...summary, ...rows],
            columns: [
                { key: 'metrica', label: 'Métrica / Cliente', format: r => (r as { metrica?: string }).metrica ?? (r as { cliente?: string }).cliente ?? '' },
                { key: 'valor', label: 'Valor', format: r => (r as { valor?: string }).valor ?? '' },
                { key: 'visitas', label: 'Visitas', format: r => (r as { visitas?: number }).visitas ?? '' },
                { key: 'total_gasto', label: 'Total Gasto', format: r => (r as { total_gasto?: string }).total_gasto ?? '' },
                { key: 'ultima_visita', label: 'Última Visita', format: r => (r as { ultima_visita?: string }).ultima_visita ?? '' },
            ],
        });
    };

    return (
        <div className="space-y-6 md:space-y-8 pb-24">
            <div className="flex flex-col gap-2 border-b-2 border-white/5 pb-6">
                <h1 className="text-3xl md:text-5xl font-heading text-white uppercase tracking-tighter">Insights do Negócio</h1>
                <p className="text-text-secondary font-mono text-sm md:text-base flex items-center gap-2">
                    <Brain className={`w-4 h-4 ${accent.text}`} />
                    O que os seus números estão dizendo — sem complicação.
                </p>
            </div>

            <TabNav
                tabs={[
                    { id: 'agenda', label: 'Agenda', icon: <Calendar className="w-3.5 h-3.5" /> },
                    { id: 'clientes', label: 'Clientes', icon: <Users className="w-3.5 h-3.5" /> },
                    { id: 'servicos', label: 'Serviços', icon: <BarChart2 className="w-3.5 h-3.5" /> },
                ]}
                activeTab={activeTab}
                onChange={(id) => setActiveTab(id as InsightsTab)}
                accentBg={accent.bg}
            />

            {activeTab === 'agenda' && (
                <div className="space-y-4 fade-in">
                    <OccupancyRateCard />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <CancellationRateCard />
                        <CriticalEmptySlotsCard />
                    </div>
                </div>
            )}

            {activeTab === 'servicos' && (
                <div className="fade-in">
                    <FinanceInsights
                        summary={financeInsights.summary}
                        monthlyHistory={financeInsights.monthlyHistory}
                        transactions={financeInsights.transactions}
                        currencyRegion={currencyRegion}
                    />
                </div>
            )}

            {activeTab === 'clientes' && (
                <div className="space-y-6 md:space-y-8 fade-in">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <MonthYearSelector
                            selectedMonth={selectedMonth}
                            selectedYear={selectedYear}
                            onChange={handleMonthChange}
                            accentColor={isBeauty ? 'beauty-neon' : 'accent-gold'}
                        />
                        <ExportButton
                            onExportCsv={handleExportCsv}
                            onExportPdf={handleExportPdf}
                        />
                    </div>

                    <Card>
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl ${accent.bgDim} ${accent.text}`}>
                                    <Target className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-white font-heading uppercase tracking-wider">Meta mensal</h3>
                                    <p className="text-neutral-400 text-sm">
                                        Você já fez {formatCurrency(currentMonthRevenue, currencyRegion)} de {formatCurrency(monthlyGoal, currencyRegion)}.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsEditingGoal(true)}
                                className={`shrink-0 min-h-[44px] text-sm font-bold ${accent.text} hover:opacity-70 transition-opacity`}
                            >
                                Ajustar
                            </button>
                        </div>
                        <div className="mt-4 h-3 rounded-full bg-white/5 overflow-hidden">
                            <div className={`h-full ${accent.bg} transition-all duration-1000`} style={{ width: `${Math.min(goalProgress, 100)}%` }} />
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                            <span className="font-mono text-xs text-neutral-400">{goalProgress}% atingido</span>
                            <button
                                type="button"
                                onClick={() => setShowGoalHistory(true)}
                                className={`min-h-[44px] text-sm font-bold ${accent.text} hover:opacity-70 transition-opacity`}
                            >
                                Ver histórico
                            </button>
                        </div>
                    </Card>

                    {loading && !stats ? (
                        <div className="flex items-center justify-center h-[40vh]">
                            <div className={`animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 ${accent.border}`}></div>
                        </div>
                    ) : !hasSufficientData ? (
                        <div className="flex flex-col items-center justify-center my-16 text-center px-4 fade-in">
                            <div className={`w-24 h-24 rounded-full ${accent.bgDim} ${accent.text} flex items-center justify-center mb-6`}>
                                <TrendingUp className={`w-12 h-12 ${accent.text}`} />
                            </div>
                            <h2 className="text-3xl font-heading text-white uppercase mb-4">Coletando Dados...</h2>
                            <p className="text-neutral-400 max-w-xl mx-auto leading-relaxed">
                                Continue registrando seus atendimentos por aqui. Assim que houver histórico suficiente, mostramos aqui seus clientes fiéis, os serviços que mais atraem retorno e quem está prestes a sumir.
                            </p>
                            <div className="mt-8 p-6 bg-white/5 rounded-xl border border-white/10 max-w-md w-full text-left">
                                <p className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                                    <Brain className={`w-4 h-4 ${accent.text}`} /> O que você verá aqui em breve:
                                </p>
                                <ul className="text-sm text-neutral-400 space-y-3">
                                    <li className="flex gap-2"><DollarSign className="w-4 h-4 text-neutral-500" /> Faturamento médio real por atendimento</li>
                                    <li className="flex gap-2"><AlertCircle className="w-4 h-4 text-neutral-500" /> Alertas de clientes prestes a sumir</li>
                                    <li className="flex gap-2"><Target className="w-4 h-4 text-neutral-500" /> Quais serviços atraem os clientes mais fiéis</li>
                                </ul>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8 fade-in">
                            <div>
                                <h2 className="text-xl font-heading text-white uppercase mb-4 tracking-wider">Visão Geral</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                                    <Card>
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className={`p-2 rounded-xl ${accent.bgDim} ${accent.text}`}>
                                                <DollarSign className="w-5 h-5" />
                                            </div>
                                            <span className="text-neutral-400 font-mono text-xs uppercase tracking-widest">Média por atendimento</span>
                                        </div>
                                        <h3 className="text-3xl font-heading text-white">{formatCurrency(stats?.avg_ticket || 0, currencyRegion)}</h3>
                                        <p className="text-xs text-neutral-500 mt-2">Últimos 90 dias</p>
                                    </Card>

                                    <Card>
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="p-2 rounded-xl bg-green-500/10 text-green-400">
                                                <TrendingUp className="w-5 h-5" />
                                            </div>
                                            <span className="text-neutral-400 font-mono text-xs uppercase tracking-widest">Crescimento</span>
                                        </div>
                                        <h3 className="text-3xl font-heading text-white">{stats?.weekly_growth || 0}%</h3>
                                        <p className="text-xs text-neutral-500 mt-2">Vs. semana anterior</p>
                                    </Card>

                                    <Card>
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                                                <Target className="w-5 h-5" />
                                            </div>
                                            <span className="text-neutral-400 font-mono text-xs uppercase tracking-widest">Recorrência</span>
                                        </div>
                                        <h3 className="text-3xl font-heading text-white">{stats?.repeat_client_rate || 0}%</h3>
                                        <p className="text-xs text-neutral-500 mt-2">Clientes que voltaram</p>
                                    </Card>

                                    <Card>
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="p-2 rounded-xl bg-red-500/10 text-red-400">
                                                <AlertCircle className="w-5 h-5" />
                                            </div>
                                            <span className="text-neutral-400 font-mono text-xs uppercase tracking-widest">Clientes em Risco</span>
                                        </div>
                                        <h3 className="text-3xl font-heading text-white">{stats?.churn_risk_count || 0}</h3>
                                        <p className="text-xs text-neutral-500 mt-2">Há mais de 45 dias sem vir</p>
                                    </Card>
                                </div>
                            </div>

                            <div>
                                <h2 className="text-xl font-heading text-white uppercase mb-4 tracking-wider">Performance e Crescimento</h2>
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <Card title="Evolução de Clientes (6 Meses)" className="lg:col-span-2">
                                        <div className="h-[250px] w-full mt-4">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={clientInsights.client_growth_by_month}>
                                                    <defs>
                                                        <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor={accent.hex} stopOpacity={0.3} />
                                                            <stop offset="95%" stopColor={accent.hex} stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                                                    <XAxis dataKey="month" stroke="#555" fontSize={11} tickLine={false} axisLine={false} />
                                                    <YAxis stroke="#555" fontSize={11} tickLine={false} axisLine={false} />
                                                    <Tooltip
                                                        contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #222', borderRadius: '12px' }}
                                                        itemStyle={{ color: '#fff' }}
                                                    />
                                                    <Area
                                                        type="monotone"
                                                        dataKey="new_clients"
                                                        stroke={accent.hex}
                                                        fillOpacity={1}
                                                        fill="url(#colorGrowth)"
                                                        strokeWidth={3}
                                                    />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </Card>

                                    <Card title="Serviço Campeão" className="flex flex-col justify-center items-center text-center">
                                        <div className={`w-16 h-16 rounded-full ${accent.bgDim} ${accent.text} flex items-center justify-center mb-4`}>
                                            <TrendingUp className={`w-8 h-8 ${accent.text}`} />
                                        </div>
                                        <h2 className={`text-3xl md:text-4xl font-heading ${accent.text} uppercase mb-2`}>{stats?.top_service || 'N/A'}</h2>
                                        <p className="text-neutral-500 text-sm">Serviço mais vendido do período recente</p>
                                    </Card>
                                </div>
                            </div>

                            <Card title="Nossos Melhores Clientes">
                                <div className="overflow-x-auto -mx-4 md:mx-0">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-white/5">
                                                <th className="px-4 py-4 text-xs font-mono text-neutral-500 uppercase">Cliente</th>
                                                <th className="px-4 py-4 text-xs font-mono text-neutral-500 uppercase text-center">Visitas</th>
                                                <th className="px-4 py-4 text-xs font-mono text-neutral-500 uppercase text-right">Total Gasto</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {clientInsights.top_clients.length === 0 ? (
                                                <tr>
                                                    <td colSpan={3} className="px-4 py-8 text-center text-neutral-600">Ainda gerando histórico...</td>
                                                </tr>
                                            ) : (
                                                clientInsights.top_clients.map((client, idx) => (
                                                    <tr key={idx} className="hover:bg-white/5 transition-colors group">
                                                        <td className="px-4 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${accent.bgDim} ${accent.text}`}>
                                                                    {client.name.charAt(0)}
                                                                </div>
                                                                <div>
                                                                    <p className="text-white font-bold group-hover:text-white transition-colors">{client.name}</p>
                                                                    <p className="text-xs text-neutral-500 mt-0.5">Última em {client.last_visit}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4 text-center font-mono text-white text-lg">{client.visits}</td>
                                                        <td className={`px-4 py-4 text-right font-bold text-lg ${accent.text}`}>{formatCurrency(client.revenue, currencyRegion)}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </div>
                    )}
                </div>
            )}

            <Suspense fallback={null}>
                <GoalSettingsModal
                    isOpen={isEditingGoal}
                    onClose={() => setIsEditingGoal(false)}
                    currentGoal={monthlyGoal}
                    onSave={updateGoal}
                    isBeauty={isBeauty}
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
