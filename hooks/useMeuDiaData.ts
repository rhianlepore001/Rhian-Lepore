import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import * as dashboardService from '../services/dashboard';
import { useCallback } from 'react';

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
    const queryClient = useQueryClient();
    
    const ownerId = companyId ?? user?.id;
    const professionalId = teamMemberId ?? user?.id;
    
    const isEnabled = !!user && !(companyId && !teamMemberId);

    const { data: appointments = [], isLoading: loading } = useQuery({
        queryKey: ['meudia', 'todayAppointments', ownerId, professionalId],
        queryFn: async (): Promise<MeuDiaAppointment[]> => {
            const data = await dashboardService.fetchTodayAppointmentsForProfessional(ownerId!, professionalId!);
            return data.map(apt => ({
                id: apt.id,
                clientName: apt.clientName,
                service: apt.service,
                time: apt.time,
                date: apt.date,
                rawDate: apt.rawDate,
                status: apt.status,
                price: apt.price,
                appointment_time: apt.appointment_time
            }));
        },
        enabled: isEnabled,
        staleTime: 30 * 1000, // 30s
    });

    const completedApts = appointments.filter(a => a.status === 'Completed' || a.status === 'Concluído');
    const pendingApts = appointments.filter(a => a.status === 'Confirmed' || a.status === 'Confirmado');
    const dailyEarnings = completedApts.reduce((sum, a) => sum + (Number(a.price) || 0), 0);

    const summary: MeuDiaSummary = {
        completed: completedApts.length,
        pending: pendingApts.length,
        dailyEarnings
    };

    const markMutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) => 
            dashboardService.updateAppointmentStatus(id, status),
        onMutate: async ({ id }) => {
            await queryClient.cancelQueries({ queryKey: ['meudia', 'todayAppointments', ownerId, professionalId] });
            const previousAppointments = queryClient.getQueryData(['meudia', 'todayAppointments', ownerId, professionalId]);

            queryClient.setQueryData(
                ['meudia', 'todayAppointments', ownerId, professionalId],
                (old: any) => (old || []).map((apt: any) => apt.id === id ? { ...apt, status: 'Completed' } : apt)
            );

            return { previousAppointments };
        },
        onError: (err, variables, context) => {
            if (context?.previousAppointments) {
                queryClient.setQueryData(
                    ['meudia', 'todayAppointments', ownerId, professionalId],
                    context.previousAppointments
                );
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['meudia', 'todayAppointments', ownerId, professionalId] });
            queryClient.invalidateQueries({ queryKey: ['dashboard', 'todayRevenue', ownerId] });
            queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats', ownerId] });
        }
    });

    const markAsCompleted = async (id: string) => {
        try {
            await markMutation.mutateAsync({ id, status: 'Completed' });
            return true;
        } catch {
            return false;
        }
    };

    const fetchAllAppointments = useCallback(async () => {
        if (!isEnabled) return [];
        const data = await dashboardService.fetchFutureAppointmentsForProfessional(ownerId!, professionalId!);
        return data.map(apt => ({
            id: apt.id,
            clientName: apt.clientName,
            service: apt.service,
            time: apt.time,
            date: apt.date,
            rawDate: apt.rawDate,
            status: apt.status,
            price: apt.price,
            appointment_time: apt.appointment_time
        }));
    }, [isEnabled, ownerId, professionalId]);

    const refreshAppointments = () => {
        queryClient.invalidateQueries({ queryKey: ['meudia', 'todayAppointments', ownerId, professionalId] });
    };

    return {
        appointments,
        summary,
        loading,
        markAsCompleted,
        fetchAllAppointments,
        refreshAppointments
    };
}
