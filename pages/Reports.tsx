import React, { useState, useEffect } from 'react';
import { BrutalCard } from '../components/BrutalCard';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Users, UserPlus, Calendar, TrendingUp, DollarSign } from 'lucide-react';
import { MonthYearSelector } from '../components/MonthYearSelector';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area } from 'recharts';
import { formatCurrency } from '../utils/formatters';
import { logger } from '../utils/Logger';

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
    const [loading, setLoading] = useState(true);
    const currentDate = new Date();
    const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

    // Insights Data
    const [insights, setInsights] = useState({
        total_appointments: 0,
        new_clients: 0,
        active_clients: 0,
        top_professionals: [],
        top_services: [],
        appointments_by_day: []
    });

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
        fetchInsights();
    }, [selectedMonth, selectedYear, user]);

    const fetchInsights = async () => {
        try {
            setLoading(true);
            const startOfMonth = new Date(selectedYear, selectedMonth, 1).toISOString().split('T')[0];
            const endOfMonth = new Date(selectedYear, selectedMonth + 1, 0).toISOString().split('T')[0];

            const [dashboardResult, clientResult] = await Promise.all([
                supabase.rpc('get_dashboard_insights', {
                    p_user_id: user.id,
                    p_start_date: startOfMonth,
                    p_end_date: endOfMonth
                }),
                supabase.rpc('get_client_insights', {
                    p_user_id: user.id,
                    p_months: 6
                })
            ]);

            if (dashboardResult.error) {
                logger.error('Error fetching dashboard insights RPC', dashboardResult.error);
            }
            if (clientResult.error) {
                logger.error('Error fetching client insights RPC', clientResult.error);
            }

            if (dashboardResult.data) {
                setInsights(dashboardResult.data);
            }
            if (clientResult.data) {
                setClientInsights(clientResult.data);
            }
        } catch (error) {
            logger.error('Unexpected error fetching insights', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMonthChange = (month: number, year: number) => {
        setSelectedMonth(month);
        setSelectedYear(year);
    };

    const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    return (
        <div className="space-y-6 md:space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col gap-4 border-b-4 border-white/10 pb-4">
                <div>
                    <h2 className="text-2xl md:text-4xl font-heading text-white uppercase">Insights</h2>
                    <p className="text-text-secondary font-mono mt-1 md:mt-2 text-sm md:text-base">
                        Análise de desempenho e métricas operacionais
                    </p>
                </div>

                <MonthYearSelector
                    selectedMonth={selectedMonth}
                    selectedYear={selectedYear}
                    onChange={handleMonthChange}
                    accentColor={accentColor}
                />
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <BrutalCard className={`border-l-4 ${isBeauty ? 'border-beauty-neon' : 'border-neutral-500'}`}>
                    <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-lg ${isBeauty ? 'bg-beauty-neon/10 text-beauty-neon' : 'bg-neutral-800 text-white'}`}>
                            <UserPlus className="w-5 h-5" />
                        </div>
                        <span className="text-text-secondary font-mono text-xs uppercase tracking-widest">Novos Clientes</span>
                    </div>
                    <h3 className="text-3xl font-heading text-white">{insights.new_clients}</h3>
                    <p className="text-xs text-neutral-500 mt-1">Cadastrados este mês</p>
                </BrutalCard>

                <BrutalCard className={`border-l-4 ${isBeauty ? 'border-purple-500' : 'border-accent-gold'}`}>
                    <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-lg ${isBeauty ? 'bg-beauty-neon/10 text-beauty-neon' : 'bg-accent-gold/10 text-yellow-600'}`}>
                            <DollarSign className="w-6 h-6" />
                        </div>
                        <span className="text-text-secondary font-mono text-xs uppercase tracking-widest">Clientes Ativos</span>
                    </div>
                    <h3 className="text-3xl font-heading text-white">{insights.active_clients}</h3>
                    <p className="text-xs text-neutral-500 mt-1">Visitaram este mês</p>
                </BrutalCard>

                <BrutalCard className="border-l-4 border-blue-500">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                            <Calendar className="w-5 h-5" />
                        </div>
                        <span className="text-text-secondary font-mono text-xs uppercase tracking-widest">Agendamentos</span>
                    </div>
                    <h3 className="text-3xl font-heading text-white">{insights.total_appointments}</h3>
                    <p className="text-xs text-neutral-500 mt-1">Concluídos este mês</p>
                </BrutalCard>

                <BrutalCard className="border-l-4 border-green-500">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-green-500/10 text-green-400">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                        <span className="text-text-secondary font-mono text-xs uppercase tracking-widest">Taxa de Retenção</span>
                    </div>
                    <h3 className="text-3xl font-heading text-white">{clientInsights.retention_rate}%</h3>
                    <p className="text-xs text-neutral-500 mt-1">Clientes que voltaram</p>
                </BrutalCard>
            </div>

            {/* Gráfico: Volume Diário de Atendimentos */}
            <BrutalCard title={`Volume de Atendimentos - ${months[selectedMonth]}`}>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={insights.appointments_by_day}>
                            <defs>
                                <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={isBeauty ? '#A78BFA' : '#EAB308'} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={isBeauty ? '#A78BFA' : '#EAB308'} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis dataKey="name" stroke="#666" style={{ fontSize: '12px' }} />
                            <YAxis stroke="#666" style={{ fontSize: '12px' }} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#171717', border: '1px solid #333', borderRadius: '8px' }}
                                labelStyle={{ color: '#fff' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="count"
                                stroke={isBeauty ? '#A78BFA' : '#EAB308'}
                                fillOpacity={1}
                                fill="url(#colorVisits)"
                                name="Agendamentos"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </BrutalCard>

            {/* Gráfico: Crescimento de Clientes (últimos 6 meses) */}
            <BrutalCard title="Crescimento de Clientes — Últimos 6 Meses">
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={clientInsights.client_growth_by_month}>
                            <defs>
                                <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis dataKey="month" stroke="#666" style={{ fontSize: '12px' }} />
                            <YAxis stroke="#666" style={{ fontSize: '12px' }} allowDecimals={false} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#171717', border: '1px solid #333', borderRadius: '8px' }}
                                labelStyle={{ color: '#fff' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="new_clients"
                                stroke="#22C55E"
                                fillOpacity={1}
                                fill="url(#colorGrowth)"
                                name="Novos Clientes"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </BrutalCard>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Desempenho da Equipe */}
                <BrutalCard title="Desempenho da Equipe">
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                        {insights.top_professionals.length === 0 ? (
                            <p className="text-neutral-500 text-sm">Sem dados de equipe.</p>
                        ) : (
                            insights.top_professionals.map((prof: any, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-neutral-800/50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-black ${accentBg}`}>
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <p className="text-white font-bold">{prof.name}</p>
                                            <p className="text-xs text-neutral-400">{prof.count} atendimentos</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-mono font-bold ${accentText}`}>
                                            {formatCurrency(prof.revenue, currencyRegion)}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </BrutalCard>

                {/* Serviços Mais Populares */}
                <BrutalCard title="Serviços Mais Populares">
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={insights.top_services} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                                <XAxis type="number" stroke="#666" style={{ fontSize: '12px' }} />
                                <YAxis dataKey="name" type="category" stroke="#fff" tick={{ fontSize: 11, fill: '#fff' }} width={100} />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                    contentStyle={{ backgroundColor: '#171717', border: '1px solid #333', borderRadius: '8px' }}
                                />
                                <Bar dataKey="count" fill={isBeauty ? '#A78BFA' : '#fff'} name="Agendamentos" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </BrutalCard>
            </div>

            {/* Top Clientes do Mês */}
            <BrutalCard title={`Top Clientes — ${months[selectedMonth]}`}>
                <div className="space-y-3 max-h-[450px] overflow-y-auto pr-2">
                    {clientInsights.top_clients.length === 0 ? (
                        <p className="text-neutral-500 text-sm">Nenhum cliente com agendamentos concluídos este mês.</p>
                    ) : (
                        clientInsights.top_clients.map((client, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-neutral-800/50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                                        idx === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                                        idx === 1 ? 'bg-neutral-400/20 text-neutral-300' :
                                        idx === 2 ? 'bg-orange-700/20 text-orange-400' :
                                        'bg-neutral-700/50 text-neutral-400'
                                    }`}>
                                        #{idx + 1}
                                    </div>
                                    <div>
                                        <p className="text-white font-bold">{client.name}</p>
                                        <p className="text-xs text-neutral-400">
                                            {client.visits} {client.visits === 1 ? 'visita' : 'visitas'} · última em {client.last_visit}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`font-mono font-bold ${accentText}`}>
                                        {formatCurrency(client.revenue, currencyRegion)}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </BrutalCard>
        </div>
    );
};
