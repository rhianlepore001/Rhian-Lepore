import React, { useState, useEffect } from 'react';
import { BrutalCard } from '../components/BrutalCard';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/UIContext';
import { supabase } from '../lib/supabase';
import {
    Users,
    UserPlus,
    Calendar,
    TrendingUp,
    DollarSign,
    Target,
    Zap,
    ShieldCheck,
    AlertCircle,
    ArrowUpRight,
    Brain
} from 'lucide-react';
import { MonthYearSelector } from '../components/MonthYearSelector';
import { ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area, BarChart, Bar } from 'recharts';
import { formatCurrency } from '../utils/formatters';
import { logger } from '../utils/Logger';

interface DashboardStats {
    total_profit: number;
    current_month_revenue: number;
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
                        Sócio Virtual: Analisando performance e crescimento
                    </p>
                </div>

                <MonthYearSelector
                    selectedMonth={selectedMonth}
                    selectedYear={selectedYear}
                    onChange={handleMonthChange}
                    accentColor={accentColor}
                />
            </div>

            {/* AIOS Growth Engine Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Profit Radar Card */}
                <BrutalCard accent glow className="lg:col-span-2">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Zap className="w-5 h-5 text-yellow-400" />
                                <span className="text-white font-heading uppercase tracking-wider">Painel de Oportunidades</span>
                            </div>
                            <p className="text-neutral-400 text-sm">Dinheiro recuperado e horários preenchidos pela IA</p>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-heading text-white">
                                {formatCurrency((stats?.recovered_revenue || 0) + (stats?.filled_slots || 0), currencyRegion)}
                            </p>
                            <p className="text-xs text-green-400 flex items-center justify-end gap-1">
                                <ArrowUpRight className="w-3 h-3" /> Impacto Real
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                            <p className="text-xs text-neutral-500 uppercase mb-1">Dinheiro Recuperado</p>
                            <p className={`text-xl font-heading ${accentText}`}>{formatCurrency(stats?.recovered_revenue || 0, currencyRegion)}</p>
                        </div>
                        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                            <p className="text-xs text-neutral-500 uppercase mb-1">Vagas Preenchidas</p>
                            <p className="text-xl font-heading text-white">{stats?.filled_slots || 0}</p>
                        </div>
                        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                            <p className="text-xs text-neutral-500 uppercase mb-1">Campanhas Enviadas</p>
                            <p className="text-xl font-heading text-white">{stats?.filled_slots || 0}</p>
                        </div>
                    </div>
                </BrutalCard>

                {/* Data Maturity Score */}
                <BrutalCard className="flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <ShieldCheck className={`w-5 h-5 ${accentText}`} />
                            <span className="text-white font-heading uppercase tracking-wider">Qualidade dos Dados</span>
                        </div>
                        <p className="text-neutral-400 text-sm">Saúde operacional do seu sistema</p>
                    </div>

                    <div className="my-6 flex flex-col items-center">
                        <div className="relative w-32 h-32 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle
                                    cx="64" cy="64" r="58"
                                    stroke="currentColor" strokeWidth="8"
                                    fill="transparent" className="text-white/5"
                                />
                                <circle
                                    cx="64" cy="64" r="58"
                                    stroke="currentColor" strokeWidth="8"
                                    fill="transparent"
                                    strokeDasharray={364}
                                    strokeDashoffset={364 - (364 * (stats?.data_maturity_score || 0)) / 100}
                                    className={`${accentText} transition-all duration-1000 ease-out`}
                                />
                            </svg>
                            <span className="absolute text-3xl font-heading text-white">{stats?.data_maturity_score}%</span>
                        </div>
                    </div>

                    <p className="text-xs text-center text-neutral-500">
                        {stats?.data_maturity_score && stats.data_maturity_score > 80
                            ? 'Excelente! Seu banco de dados está pronto para IA avançada.'
                            : 'Dica: Use mais o agendamento público para subir sua maturidade.'}
                    </p>
                </BrutalCard>
            </div>

            {/* Main Stats Grid */}
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
                        <div className="p-2 rounded-xl bg-red-500/10 text-red-400">
                            <AlertCircle className="w-5 h-5" />
                        </div>
                        <span className="text-neutral-400 font-mono text-xs uppercase tracking-widest">Clientes que não voltaram</span>
                    </div>
                    <h3 className="text-3xl font-heading text-white">{stats?.churn_risk_count || 0}</h3>
                    <p className="text-xs text-neutral-500 mt-2">Clientes há 45+ dias sem vir</p>
                </BrutalCard>

                <BrutalCard>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                            <Target className="w-5 h-5" />
                        </div>
                        <span className="text-neutral-400 font-mono text-xs uppercase tracking-widest">Recorrência</span>
                    </div>
                    <h3 className="text-3xl font-heading text-white">{stats?.repeat_client_rate || 0}%</h3>
                    <p className="text-xs text-neutral-500 mt-2">Clientes fiéis (2+ visitas)</p>
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
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <BrutalCard title="Evolução de Clientes (6 Meses)">
                    <div className="h-[300px] w-full mt-4">
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

                <BrutalCard title="Serviço Campeão">
                    <div className="flex items-center justify-center h-[300px]">
                        <div className="text-center">
                            <p className="text-neutral-500 uppercase font-mono text-xs tracking-widest mb-2">Serviço mais vendido</p>
                            <h2 className={`text-4xl md:text-5xl font-heading ${accentText} uppercase`}>{stats?.top_service || 'N/A'}</h2>
                            <div className="mt-6 flex justify-center gap-4">
                                <div className="px-4 py-2 bg-white/5 rounded-full border border-white/10 text-xs text-neutral-400">
                                    Foco em Retorno: ALTO
                                </div>
                            </div>
                        </div>
                    </div>
                </BrutalCard>
            </div>

            {/* Top Clients Table */}
            <BrutalCard title="Elite de Clientes (Mês Atual)">
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
                                    <td colSpan={3} className="px-4 py-8 text-center text-neutral-600">Nenhum dado disponível para este período.</td>
                                </tr>
                            ) : (
                                clientInsights.top_clients.map((client, idx) => (
                                    <tr key={idx} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${accentBg}`}>
                                                    {client.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-white font-bold group-hover:text-white">{client.name}</p>
                                                    <p className="text-xs text-neutral-500">Última em {client.last_visit}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-center font-mono text-white">{client.visits}</td>
                                        <td className={`px-4 py-4 text-right font-bold ${accentText}`}>{formatCurrency(client.revenue, currencyRegion)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </BrutalCard>
        </div>
    );
};
