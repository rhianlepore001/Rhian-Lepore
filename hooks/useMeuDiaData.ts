import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../utils/Logger';

export interface MeuDiaAppointment {
    id: string;
    clientName: string;
    service: string;
    time: string;
    date: string;
    rawDate: string;
    status: string;
    price: number;
    appointment_time: string;
}

export interface MeuDiaSummary {
    completed: number;
    pending: number;
    dailyEarnings: number;
}

export function useMeuDiaData() {
    const { user, companyId, teamMemberId } = useAuth();
    const [appointments, setAppointments] = useState<MeuDiaAppointment[]>([]);
    const [summary, setSummary] = useState<MeuDiaSummary>({ completed: 0, pending: 0, dailyEarnings: 0 });
    const [loading, setLoading] = useState(true);

    const fetchTodayAppointments = async () => {
        if (!user) return;
        // Staff precisa do teamMemberId para filtrar agendamentos atribuídos a ele
        if (companyId && !teamMemberId) return;
        try {
            setLoading(true);
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayStartIso = todayStart.toISOString();

            const todayEnd = new Date();
            todayEnd.setHours(23, 59, 59, 999);
            const todayEndIso = todayEnd.toISOString();

            // Para staff: filtra pelo team_member record ID + user_id do dono
            // Para owner: filtra pelo user_id próprio
            const professionalId = teamMemberId ?? user.id;
            const ownerId = companyId ?? user.id;

            // Busca agendamentos do dia para o profissional logado
            const { data: aptData, error: aptError } = await supabase
                .from('appointments')
                .select('*, clients(name)')
                .eq('user_id', ownerId)
                .eq('professional_id', professionalId)
                .gte('appointment_time', todayStartIso)
                .lte('appointment_time', todayEndIso)
                .order('appointment_time', { ascending: true });

            if (aptError) {
                logger.error('Error fetching today appointments (Meu Dia):', aptError);
                return;
            }

            if (aptData) {
                const mappedApts = aptData.map((apt: any) => ({
                    id: apt.id,
                    clientName: apt.clients?.name || 'Cliente Desconhecido',
                    service: apt.service || 'Serviço Padrão',
                    time: new Date(apt.appointment_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    date: new Date(apt.appointment_time).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                    rawDate: new Date(apt.appointment_time).toISOString().split('T')[0],
                    status: apt.status,
                    price: Number(apt.price) || 0,
                    appointment_time: apt.appointment_time
                }));

                setAppointments(mappedApts);

                // Calcula o resumo
                const completedApts = mappedApts.filter(a => a.status === 'Completed' || a.status === 'Concluído');
                const pendingApts = mappedApts.filter(a => a.status === 'Confirmed' || a.status === 'Confirmado');
                const earnings = completedApts.reduce((sum, a) => sum + a.price, 0);

                setSummary({
                    completed: completedApts.length,
                    pending: pendingApts.length,
                    dailyEarnings: earnings
                });
            }
        } catch (error) {
            logger.error('Error in useMeuDiaData:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTodayAppointments();
    }, [user, teamMemberId]);

    const markAsCompleted = async (id: string) => {
        if (!user) return false;

        // Status otimista na tela (1 toque)
        const previousAppointments = [...appointments];
        setAppointments(prev => prev.map(apt =>
            apt.id === id ? { ...apt, status: 'Completed' } : apt
        ));

        try {
            const { error } = await supabase
                .from('appointments')
                .update({ status: 'Completed' })
                .eq('id', id);

            if (error) {
                logger.error('Erro ao marcar como concluído:', error);
                // Reverte em caso de erro
                setAppointments(previousAppointments);
                return false;
            }

            // Recarrega os totais
            await fetchTodayAppointments();
            return true;
        } catch (err) {
            logger.error('Exceção ao marcar como concluído:', err);
            setAppointments(previousAppointments);
            return false;
        }
    };

    const fetchAllAppointments = async () => {
        if (!user) return [];
        const professionalId = teamMemberId ?? user.id;
        const ownerId = companyId ?? user.id;
        const now = new Date().toISOString();

        const { data, error } = await supabase
            .from('appointments')
            .select('*, clients(name)')
            .eq('user_id', ownerId)
            .eq('professional_id', professionalId)
            .gte('appointment_time', now)
            .in('status', ['Confirmed', 'Pending'])
            .order('appointment_time', { ascending: true });

        if (error) {
            logger.error('Error fetching all appointments (Meu Dia):', error);
            return [];
        }

        return (data || []).map((apt: any) => ({
            id: apt.id,
            clientName: apt.clients?.name || 'Cliente Desconhecido',
            service: apt.service || 'Serviço Padrão',
            time: new Date(apt.appointment_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            date: new Date(apt.appointment_time).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
            rawDate: new Date(apt.appointment_time).toISOString().split('T')[0],
            status: apt.status,
            price: Number(apt.price) || 0,
            appointment_time: apt.appointment_time
        }));
    };

    return {
        appointments,
        summary,
        loading,
        markAsCompleted,
        fetchAllAppointments,
        refreshAppointments: fetchTodayAppointments
    };
}
