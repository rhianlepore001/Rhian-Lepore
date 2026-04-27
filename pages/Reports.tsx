import React, { useState, useEffect } from 'react';
import { BrutalCard } from '../components/BrutalCard';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/UIContext';
import { supabase } from '../lib/supabase';
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
import { logger } from '../utils/Logger';

interface DashboardStats {
    total_profit: number;
    current_month_revenue: number;
    month_scheduled_value: number;
    weekly_growth: number;
    monthly_goal: number;
    recovered_revenue: number;
    avoided_no_shows: number;
    filled_slots: number;
    campaigns_sent: number;
    appointments_total: number;
    appointments_this_month: number;
    completed_this_month: number;
    has_public_bookings: boolean;
    account_days_old: number;
    data_maturity_score: number;
    avg_ticket: number;
    churn_risk_count: number;
    top_service: string;
    repeat_client_rate: number;
}

interface ClientGrowthEntry {
    month: string;
    new_clients: number;
}

interface TopClient {
    name: string;
    visits: number;
    revenue: number;
    last_visit: string;
}

interface ClientInsights {
    client_growth_by_month: ClientGrowthEntry[];
    top_clients: TopClient[];
    retention_rate: number;
}

export const Reports: React.FC = () => {
    const { user, userType, region } = useAuth();
    const { isMobile } = useUI();
    const [loading, setLoading] = useState(true);
    const currentDate = new Date();
    const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [clientInsights, setClientInsights] = useState<ClientInsights>({
        client_growth_by_month: [],
        top_clients: [],
        retention_rate: 0
    });

    const isBeauty = userType === 'beauty';
    const accentColor = isBeauty ? 'beauty-neon' : 'accent-gold';
    const accentText = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';
    const accentBg = isBeauty ? 'bg-beauty-neon/20 text-beauty-neon' : 'bg-accent-gold/20 text-accent-gold';
    const currencyRegion = region === 'PT' ? 'PT' : 'BR';

    useEffect(() => {
        fetchData();
    }, [selectedMonth, selectedYear, user]);

    const fetchData = async () => {
        try {
            setLoading(true);

            const [statsResult, clientResult] = await Promise.all([
                supabase.rpc('get_dashboard_stats', { p_user_id: user.id }),
                supabase.rpc('get_client_insights', { p_user_id: user.id, p_months: 6 })
            ]);

            if (statsResult.error) logger.error('Error fetching dashboard stats', statsResult.error);
            if (clientResult.error) logger.error('Error fetching client insights', clientResult.error);

            if (statsResult.data) setStats(statsResult.data);
            if (clientResult.data) setClientInsights(clientResult.data);
        } catch (error) {
            logger.error('Unexpected error fetching report data', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMonthChange = (month: number, year: number) => {
        setSelectedMonth(month);
        setSelectedYear(year);
    };

    const hasSufficientData = stats && (stats.appointments_total > 5 || stats.total_profit > 0 || clientInsights.top_clients.length > 0);

    if (loading && !stats) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className={`animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 ${isBeauty ? 'border-beauty-neon' : 'border-accent-gold'}`}></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 md:space-y-10 pb-24">
            {/* Header Strategist */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b-2 border-white/5 pb-6">
                <div>
                    <h1 className="text-3xl md:text-5xl font-heading text-white uppercase tracking-tighter">Insights do Negócio</h1>
                    <p className="text-text-secondary font-mono mt-2 text-sm md:text-base flex items-center gap-2">
                        <Brain className={`w-4 h-4 ${accentText}`} />
                        Assistente de Negócios: analisando seus resultados
                    </p>
                </div>

                <MonthYearSelector
                    selectedMonth={selectedMonth}
                    selectedYear={selectedYear}
                    onChange={handleMonthChange}
                    accentColor={accentColor}
                />
            </div>

            {!hasSufficientData ? (
                <div className="flex flex-col items-center justify-center my-16 text-center px-4 fade-in">
                    <div className={`w-24 h-24 rounded-full ${accentBg} flex items-center justify-center mb-6`}>
                        <TrendingUp className={`w-12 h-12 ${accentText}`} />
                    </div>
                    <h2 className="text-3xl font-heading text-white uppercase mb-4">Coletando Dados...</h2>
                    <p className="text-neutral-400 max-w-xl mx-auto leading-relaxed">
                        Nossa IA está acompanhando seus agendamentos diários. Para que o Assistente de Negócios gere relatórios precisos sobre clientes fiéis, serviços campeões e receitas recuperadas, precisamos de mais histórico do seu negócio.
                    </p>
                    <p className="text-neutral-500 text-sm mt-4">
                        Continue controlando sua agenda por aqui e logo seus insights estarão disponíveis.
                    </p>
                    <div className="mt-8 p-6 bg-white/5 rounded-xl border border-white/10 max-w-md w-full text-left">
                        <p className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                            <Brain className={`w-4 h-4 ${accentText}`} /> O que você verá aqui em breve:
                        </p>
                        <ul className="text-sm text-neutral-400 space-y-3">
                            <li className="flex gap-2"><DollarSign className="w-4 h-4 text-neutral-500" /> Faturamento médio real por atendimento</li>
                            <li className="flex gap-2"><AlertCircle className="w-4 h-4 text-neutral-500" /> Alertas de clientes prestes a sumir</li>
                            <li className="flex gap-2"><Zap className="w-4 h-4 text-neutral-500" /> Receita salva pelas campanhas automáticas</li>
                            <li className="flex gap-2"><Target className="w-4 h-4 text-neutral-500" /> Quais serviços atraem os clientes mais fiéis</li>
                        </ul>
                    </div>
                </div>
            ) : (
                <div className="space-y-8 fade-in">
                    {/* Visão Geral Rápida */}
                    <div>
                        <h2 className="text-xl font-heading text-white uppercase mb-4 tracking-wider">Visão Geral</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                            <BrutalCard>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className={`p-2 rounded-xl ${accentBg}`}>
                                        <DollarSign className="w-5 h-5" />
                                    </div>
                                    <span className="text-neutral-400 font-mono text-xs uppercase tracking-widest">Média por atendimento</span>
                                </div>
                                <h3 className="text-3xl font-heading text-white">{formatCurrency(stats?.avg_ticket || 0, currencyRegion)}</h3>
                                <p className="text-xs text-neutral-500 mt-2">Últimos 90 dias</p>
                            </BrutalCard>

                            <BrutalCard>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="p-2 rounded-xl bg-green-500/10 text-green-400">
                                        <TrendingUp className="w-5 h-5" />
                                    </div>
                                    <span className="text-neutral-400 font-mono text-xs uppercase tracking-widest">Crescimento</span>
                                </div>
                                <h3 className="text-3xl font-heading text-white">{stats?.weekly_growth || 0}%</h3>
                                <p className="text-xs text-neutral-500 mt-2">Vs. semana anterior</p>
                            </BrutalCard>

                            <BrutalCard>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                                        <Target className="w-5 h-5" />
                                    </div>
                                    <span className="text-neutral-400 font-mono text-xs uppercase tracking-widest">Recorrência</span>
                                </div>
                                <h3 className="text-3xl font-heading text-white">{stats?.repeat_client_rate || 0}%</h3>
                                <p className="text-xs text-neutral-500 mt-2">Clientes que voltaram</p>
                            </BrutalCard>

                            <BrutalCard>
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="p-2 rounded-xl bg-red-500/10 text-red-400">
                                        <AlertCircle className="w-5 h-5" />
                                    </div>
                                    <span className="text-neutral-400 font-mono text-xs uppercase tracking-widest">Clientes em Risco</span>
                                </div>
                                <h3 className="text-3xl font-heading text-white">{stats?.churn_risk_count || 0}</h3>
                                <p className="text-xs text-neutral-500 mt-2">Há mais de 45 dias sem vir</p>
                            </BrutalCard>
                        </div>
                    </div>


                    {/* Evolução e Performance */}
                    <div>
                        <h2 className="text-xl font-heading text-white uppercase mb-4 tracking-wider">Performance e Crescimento</h2>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <BrutalCard title="Evolução de Clientes (6 Meses)" className="lg:col-span-2">
                                <div className="h-[250px] w-full mt-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={clientInsights.client_growth_by_month}>
                                            <defs>
                                                <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={isBeauty ? '#A78BFA' : '#EAB308'} stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor={isBeauty ? '#A78BFA' : '#EAB308'} stopOpacity={0} />
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
                                                stroke={isBeauty ? '#A78BFA' : '#EAB308'}
                                                fillOpacity={1}
                                                fill="url(#colorGrowth)"
                                                strokeWidth={3}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </BrutalCard>

                            <BrutalCard title="Serviço Campeão" className="flex flex-col justify-center items-center text-center">
                                <div className={`w-16 h-16 rounded-full ${accentBg} flex items-center justify-center mb-4`}>
                                    <TrendingUp className={`w-8 h-8 ${accentText}`} />
                                </div>
                                <h2 className={`text-3xl md:text-4xl font-heading ${accentText} uppercase mb-2`}>{stats?.top_service || 'N/A'}</h2>
                                <p className="text-neutral-500 text-sm">Serviço mais vendido do período recente</p>
                            </BrutalCard>
                        </div>
                    </div>

                    {/* Top Clients Table */}
                    <BrutalCard title="Nossos Melhores Clientes">
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
                                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${accentBg}`}>
                                                            {client.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="text-white font-bold group-hover:text-white transition-colors">{client.name}</p>
                                                            <p className="text-xs text-neutral-500 mt-0.5">Última em {client.last_visit}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-center font-mono text-white text-lg">{client.visits}</td>
                                                <td className={`px-4 py-4 text-right font-bold text-lg ${accentText}`}>{formatCurrency(client.revenue, currencyRegion)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </BrutalCard>
                </div>
            )}
        </div>
    );
};
