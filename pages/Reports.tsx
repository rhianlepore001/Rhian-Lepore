import { Card, PageHeader } from '../components/ui';
import { SkeletonCard } from '../components/ui/Skeleton';
import React, { useState, useMemo } from 'react';
import { CriticalEmptySlotsCard } from '../components/dashboard/CriticalEmptySlotsCard';
import { CancellationRateCard } from '../components/dashboard/CancellationRateCard';

import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/Toast';
import { useBrutalTheme } from '../hooks/useBrutalTheme';
import { useReportsData } from '../hooks/useReports';
import { ExportButton } from '../components/ExportButton';
import { exportToCsv, exportToPdf } from '../utils/exporters';
import {
    TrendingUp,
    DollarSign,
    Target,
    AlertCircle,
    Brain,
    Zap
} from 'lucide-react';
import { MonthYearSelector } from '../components/MonthYearSelector';
import { ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area } from 'recharts';
import { formatCurrency } from '../utils/formatters';
import { useTenantLocale } from '../hooks/useTenantLocale';

export const Reports: React.FC = () => {
    const { user, companyId, region } = useAuth();
    const { showToast } = useToast();
    const effectiveUserId = companyId ?? user?.id;
    const { accent, isBeauty, colors, status } = useBrutalTheme();
    const currentDate = new Date();
    const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

    const { stats, clientInsights, loading } = useReportsData(effectiveUserId);

    const { region: currencyRegion } = useTenantLocale();

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

    if (loading && !stats) {
        return (
            <div className="space-y-6 pb-24">
                <SkeletonCard className="min-h-[88px]" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    <SkeletonCard className="min-h-[140px]" />
                    <SkeletonCard className="min-h-[140px]" />
                    <SkeletonCard className="min-h-[140px]" />
                    <SkeletonCard className="min-h-[140px]" />
                </div>
                <SkeletonCard className="min-h-[280px]" />
            </div>
        );
    }

    return (
        <div className="space-y-6 md:space-y-10 pb-24">
            <PageHeader
                title="Insights do negócio"
                subtitle="Assistente de negócios: analisando seus resultados"
                action={
                    <div className="flex flex-col sm:flex-row gap-2">
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
                }
            />

            {!hasSufficientData ? (
                <div className="flex flex-col items-center justify-center my-16 text-center px-4 fade-in">
                    <div className={`w-24 h-24 rounded-full ${accent.bgDim} ${accent.text} flex items-center justify-center mb-6`}>
                        <TrendingUp className={`w-12 h-12 ${accent.text}`} />
                    </div>
                    <h2 className={`text-3xl font-heading ${colors.text} uppercase mb-4`}>Coletando dados...</h2>
                    <p className={`${colors.textSecondary} max-w-xl mx-auto leading-relaxed`}>
                        Nossa IA está acompanhando seus agendamentos diários. Para que o Assistente de Negócios gere relatórios precisos sobre clientes fiéis, serviços campeões e receitas recuperadas, precisamos de mais histórico do seu negócio.
                    </p>
                    <p className={`${colors.textMuted} text-sm mt-4`}>
                        Continue controlando sua agenda por aqui e logo seus insights estarão disponíveis.
                    </p>
                    <div className={`mt-8 p-6 ${colors.surface} rounded-xl border ${colors.border} max-w-md w-full text-left`}>
                        <p className={`text-sm font-bold ${colors.text} mb-4 flex items-center gap-2`}>
                            <Brain className={`w-4 h-4 ${accent.text}`} /> O que você verá aqui em breve:
                        </p>
                        <ul className={`text-sm ${colors.textSecondary} space-y-3`}>
                            <li className="flex gap-2"><DollarSign className="w-4 h-4 text-[var(--color-text-muted)]" /> Faturamento médio real por atendimento</li>
                            <li className="flex gap-2"><AlertCircle className="w-4 h-4 text-[var(--color-text-muted)]" /> Alertas de clientes prestes a sumir</li>
                            <li className="flex gap-2"><Zap className="w-4 h-4 text-[var(--color-text-muted)]" /> Receita salva pelas campanhas automáticas</li>
                            <li className="flex gap-2"><Target className="w-4 h-4 text-[var(--color-text-muted)]" /> Quais serviços atraem os clientes mais fiéis</li>
                        </ul>
                    </div>
                </div>
            ) : (
                <div className="space-y-8 fade-in">
                    <div>
                        <h2 className={`text-xl font-heading ${colors.text} uppercase mb-4 tracking-wider`}>Visão geral</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                            <Card>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className={`p-2 rounded-xl ${accent.bgDim} ${accent.text}`}>
                                        <DollarSign className="w-5 h-5" />
                                    </div>
                                    <span className={`${colors.textSecondary} font-mono text-xs uppercase tracking-widest`}>Média por atendimento</span>
                                </div>
                                <h3 className={`text-3xl font-heading ${colors.text}`}>{formatCurrency(stats?.avg_ticket || 0, currencyRegion)}</h3>
                                <p className={`text-xs ${colors.textMuted} mt-2`}>Últimos 90 dias</p>
                            </Card>

                            <Card>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className={`p-2 rounded-xl ${status.successBg} ${status.success}`}>
                                        <TrendingUp className="w-5 h-5" />
                                    </div>
                                    <span className={`${colors.textSecondary} font-mono text-xs uppercase tracking-widest`}>Crescimento</span>
                                </div>
                                <h3 className={`text-3xl font-heading ${(stats?.weekly_growth || 0) > 0 ? status.success : (stats?.weekly_growth || 0) < 0 ? status.danger : colors.text}`}>
                                    {(stats?.weekly_growth || 0) > 0 ? '+' : ''}{stats?.weekly_growth || 0}%
                                </h3>
                                <p className={`text-xs ${colors.textMuted} mt-2`}>Vs. semana anterior</p>
                            </Card>

                            <Card>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className={`p-2 rounded-xl ${status.infoBg} ${status.info}`}>
                                        <Target className="w-5 h-5" />
                                    </div>
                                    <span className={`${colors.textSecondary} font-mono text-xs uppercase tracking-widest`}>Recorrência</span>
                                </div>
                                <h3 className={`text-3xl font-heading ${colors.text}`}>{stats?.repeat_client_rate || 0}%</h3>
                                <p className={`text-xs ${colors.textMuted} mt-2`}>Clientes que voltaram</p>
                            </Card>

                            <Card>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className={`p-2 rounded-xl ${status.dangerBg} ${status.danger}`}>
                                        <AlertCircle className="w-5 h-5" />
                                    </div>
                                    <span className={`${colors.textSecondary} font-mono text-xs uppercase tracking-widest`}>Clientes em Risco</span>
                                </div>
                                <h3 className={`text-3xl font-heading ${colors.text}`}>{stats?.churn_risk_count || 0}</h3>
                                <p className={`text-xs ${colors.textMuted} mt-2`}>Há mais de 45 dias sem vir</p>
                            </Card>
                        </div>
                    </div>

                    <div>
                        <h2 className={`text-xl font-heading ${colors.text} uppercase mb-4 tracking-wider`}>Ocupação e cancelamentos</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                            <CriticalEmptySlotsCard />
                            <CancellationRateCard />
                        </div>
                    </div>


                    <div>
                        <h2 className={`text-xl font-heading ${colors.text} uppercase mb-4 tracking-wider`}>Performance e crescimento</h2>
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
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-divider)" vertical={false} />
                                            <XAxis dataKey="month" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                                            <YAxis stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-divider)', borderRadius: '12px' }}
                                                itemStyle={{ color: 'var(--color-text)' }}
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
                                <p className={`${colors.textMuted} text-sm`}>Serviço mais vendido do período recente</p>
                            </Card>
                        </div>
                    </div>

                    <Card title="Nossos Melhores Clientes">
                        <div className="overflow-x-auto -mx-4 md:mx-0">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className={`border-b ${colors.divider}`}>
                                        <th scope="col" className={`px-4 py-4 text-xs font-mono ${colors.textMuted} uppercase`}>Cliente</th>
                                        <th scope="col" className={`px-4 py-4 text-xs font-mono ${colors.textMuted} uppercase text-center`}>Visitas</th>
                                        <th scope="col" className={`px-4 py-4 text-xs font-mono ${colors.textMuted} uppercase text-right`}>Total gasto</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--color-divider)]">
                                    {clientInsights.top_clients.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className={`px-4 py-8 text-center ${colors.textMuted}`}>Ainda gerando histórico...</td>
                                        </tr>
                                    ) : (
                                        clientInsights.top_clients.map((client, idx) => (
                                            <tr key={idx} className="hover:bg-[var(--color-card-hover)] transition-colors group">
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${accent.bgDim} ${accent.text}`}>
                                                            {client.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className={`${colors.text} font-bold transition-colors`}>{client.name}</p>
                                                            <p className={`text-xs ${colors.textMuted} mt-0.5`}>Última em {client.last_visit}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className={`px-4 py-4 text-center font-mono ${colors.text} text-lg`}>{client.visits}</td>
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
    );
};
