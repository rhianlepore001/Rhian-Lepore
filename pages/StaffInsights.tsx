import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { TrendingUp, Calendar, Users, DollarSign, Clock, Scissors } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { BrutalCard } from '../components/BrutalCard';
import { formatCurrency } from '../utils/formatters';

type Period = 'day' | 'week' | 'month';

interface Appointment {
    id: string;
    service: string;
    appointment_time: string;
    status: string;
    clients?: { name: string };
}

function getPeriodRange(period: Period): { start: string; end: string } {
    const now = new Date();
    let start: Date;
    let end: Date;

    if (period === 'day') {
        start = new Date(now); start.setHours(0, 0, 0, 0);
        end = new Date(now); end.setHours(23, 59, 59, 999);
    } else if (period === 'week') {
        const day = now.getDay();
        start = new Date(now); start.setDate(now.getDate() - day); start.setHours(0, 0, 0, 0);
        end = new Date(now); end.setDate(now.getDate() + (6 - day)); end.setHours(23, 59, 59, 999);
    } else {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    return { start: start.toISOString(), end: end.toISOString() };
}

export const StaffInsights: React.FC = () => {
    const { role, fullName, teamMemberId } = useAuth();
    const [period, setPeriod] = useState<Period>('month');
    const [appointments, setAppointments] = useState<any[]>([]);
    const [todayAppointments, setTodayAppointments] = useState<any[]>([]);
    const [commissions, setCommissions] = useState(0);
    const [loading, setLoading] = useState(true);

    if (role === 'owner') return <Navigate to="/insights" replace />;

    useEffect(() => {
        if (!teamMemberId) { setLoading(false); return; }

        const fetchData = async () => {
            setLoading(true);
            const { start, end } = getPeriodRange(period);
            const todayRange = getPeriodRange('day');

            const [aptRes, todayRes, commRes] = await Promise.all([
                supabase
                    .from('appointments')
                    .select('id, service, appointment_time, status, clients(name)')
                    .eq('professional_id', teamMemberId)
                    .gte('appointment_time', start)
                    .lte('appointment_time', end)
                    .order('appointment_time', { ascending: true }),
                supabase
                    .from('appointments')
                    .select('id, service, appointment_time, status, clients(name)')
                    .eq('professional_id', teamMemberId)
                    .gte('appointment_time', todayRange.start)
                    .lte('appointment_time', todayRange.end)
                    .in('status', ['Confirmed', 'Pending'])
                    .order('appointment_time', { ascending: true }),
                supabase
                    .from('finance_records')
                    .select('amount')
                    .gte('created_at', start)
                    .lte('created_at', end)
            ]);

            if (aptRes.data) setAppointments(aptRes.data);
            if (todayRes.data) setTodayAppointments(todayRes.data);
            if (commRes.data) {
                const total = commRes.data.reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
                setCommissions(total);
            }
            setLoading(false);
        };

        fetchData();
    }, [period, teamMemberId]);

    const completedCount = appointments.filter(a => a.status === 'Completed').length;
    const uniqueClients = new Set(appointments.map(a => a.clients?.name).filter(Boolean)).size;

    const topServices = (Object.entries(
        appointments.reduce((acc: Record<string, number>, a) => {
            acc[a.service] = (acc[a.service] || 0) + 1;
            return acc;
        }, {})
    ) as [string, number][]).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const periodLabel = { day: 'Hoje', week: 'Esta semana', month: 'Este mês' }[period];

    if (!teamMemberId) {
        return (
            <div className="p-6 md:p-8">
                <h1 className="font-heading text-2xl uppercase text-white tracking-tight mb-6">
                    Meus Resultados
                </h1>
                <BrutalCard>
                    <div className="text-center py-10">
                        <TrendingUp className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
                        <p className="text-white font-heading uppercase text-lg mb-2">Vinculação pendente</p>
                        <p className="text-neutral-500 font-mono text-sm">
                            Você ainda não tem agendamentos registrados.<br />
                            Aguarde o owner vincular seu perfil à equipe.
                        </p>
                    </div>
                </BrutalCard>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h1 className="font-heading text-2xl uppercase text-white tracking-tight">
                    Meus Resultados
                    {fullName && <span className="text-accent-gold"> — {fullName.split(' ')[0]}</span>}
                </h1>

                {/* Período selector */}
                <div className="flex gap-2">
                    {(['day', 'week', 'month'] as Period[]).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-3 py-1.5 min-h-[44px] text-xs font-mono uppercase tracking-wider border-2 rounded-lg transition-all ${
                                period === p
                                    ? 'bg-accent-gold text-black border-accent-gold shadow-gold'
                                    : 'border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-white'
                            }`}
                        >
                            {{ day: 'Hoje', week: 'Semana', month: 'Mês' }[p]}
                        </button>
                    ))}
                </div>
            </div>

            {/* Hero Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <BrutalCard accent>
                    <div className="flex items-start gap-4">
                        <div className="p-2.5 bg-accent-gold/10 rounded-xl">
                            <Calendar className="w-5 h-5 text-accent-gold" />
                        </div>
                        <div>
                            <p className="text-neutral-500 font-mono text-xs uppercase">Atendimentos</p>
                            <p className="text-3xl font-heading text-accent-gold font-bold">
                                {loading ? '—' : completedCount}
                            </p>
                            <p className="text-neutral-600 font-mono text-xs">{periodLabel}</p>
                        </div>
                    </div>
                </BrutalCard>

                <BrutalCard>
                    <div className="flex items-start gap-4">
                        <div className="p-2.5 bg-white/5 rounded-xl">
                            <Users className="w-5 h-5 text-neutral-400" />
                        </div>
                        <div>
                            <p className="text-neutral-500 font-mono text-xs uppercase">Clientes únicos</p>
                            <p className="text-3xl font-heading text-white font-bold">
                                {loading ? '—' : uniqueClients}
                            </p>
                            <p className="text-neutral-600 font-mono text-xs">{periodLabel}</p>
                        </div>
                    </div>
                </BrutalCard>

                <BrutalCard accent>
                    <div className="flex items-start gap-4">
                        <div className="p-2.5 bg-accent-gold/10 rounded-xl">
                            <DollarSign className="w-5 h-5 text-accent-gold" />
                        </div>
                        <div>
                            <p className="text-neutral-500 font-mono text-xs uppercase">Comissões</p>
                            <p className="text-3xl font-heading text-accent-gold font-bold">
                                {loading ? '—' : formatCurrency(commissions)}
                            </p>
                            <p className="text-neutral-600 font-mono text-xs">{periodLabel}</p>
                        </div>
                    </div>
                </BrutalCard>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Próximos agendamentos do dia */}
                <BrutalCard title="Próximos Hoje">
                    {loading ? (
                        <p className="text-neutral-600 font-mono text-sm">Carregando...</p>
                    ) : todayAppointments.length === 0 ? (
                        <div className="text-center py-6">
                            <Clock className="w-8 h-8 text-neutral-700 mx-auto mb-2" />
                            <p className="text-neutral-600 font-mono text-sm">Nenhum agendamento para hoje</p>
                        </div>
                    ) : (
                        <ul className="space-y-3">
                            {todayAppointments.map((apt) => (
                                <li key={apt.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                                    <div>
                                        <p className="text-white text-sm font-medium">
                                            {apt.clients?.name || 'Cliente'}
                                        </p>
                                        <p className="text-neutral-500 font-mono text-xs">{apt.service}</p>
                                    </div>
                                    <span className="text-accent-gold font-mono text-xs font-bold">
                                        {new Date(apt.appointment_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </BrutalCard>

                {/* Top serviços do mês */}
                <BrutalCard title="Top Serviços do Mês">
                    {loading ? (
                        <p className="text-neutral-600 font-mono text-sm">Carregando...</p>
                    ) : topServices.length === 0 ? (
                        <div className="text-center py-6">
                            <Scissors className="w-8 h-8 text-neutral-700 mx-auto mb-2" />
                            <p className="text-neutral-600 font-mono text-sm">Nenhum serviço realizado</p>
                        </div>
                    ) : (
                        <ol className="space-y-3">
                            {topServices.map(([service, count], i) => (
                                <li key={service} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                                    <div className="flex items-center gap-3">
                                        <span className="text-neutral-600 font-heading text-sm w-5">{i + 1}.</span>
                                        <span className="text-white text-sm">{service}</span>
                                    </div>
                                    <span className="text-accent-gold font-mono text-xs font-bold">
                                        {count as number}x
                                    </span>
                                </li>
                            ))}
                        </ol>
                    )}
                </BrutalCard>
            </div>
        </div>
    );
};
