import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useCallback } from 'react';
import * as dashboardService from '../services/dashboard';
import type { DataMaturity, ProfitMetricsData, FinancialDoctorData } from '../types/dashboard';

export type { DataMaturity, ProfitMetricsData, FinancialDoctorData };

export function useDashboardData() {
    const { user, companyId } = useAuth();
    const queryClient = useQueryClient();
    const effectiveUserId = companyId ?? user?.id;
    const userId = user?.id;

    // 1. Profile query
    const { data: profile } = useQuery({
        queryKey: ['dashboard', 'profile', userId],
        queryFn: () => dashboardService.fetchDashboardProfile(userId!),
        enabled: !!userId,
        staleTime: 5 * 60 * 1000, // 5 min
    });

    const businessSlug = profile?.businessSlug || null;
    const profileMonthlyGoal = profile?.monthlyGoal ?? 15000;

    // 2. Goal setting query for current month
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const { data: currentMonthGoal } = useQuery({
        queryKey: ['dashboard', 'goal', userId, currentMonth, currentYear],
        queryFn: () => dashboardService.fetchGoalSettings(userId!, currentMonth, currentYear),
        enabled: !!userId,
        staleTime: 5 * 60 * 1000,
    });

    const monthlyGoal = currentMonthGoal ?? profileMonthlyGoal;

    // 3. Stats query
    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['dashboard', 'stats', effectiveUserId],
        queryFn: () => dashboardService.fetchDashboardStats(effectiveUserId!),
        enabled: !!effectiveUserId,
        staleTime: 2 * 60 * 1000, // 2 min
    });

    // 4. Actions query
    const { data: actionItems = [] } = useQuery({
        queryKey: ['dashboard', 'actions', effectiveUserId],
        queryFn: () => dashboardService.fetchDashboardActions(effectiveUserId!),
        enabled: !!effectiveUserId,
        staleTime: 2 * 60 * 1000,
    });

    // 5. Today's Revenue query
    const { data: todayRevenue = 0 } = useQuery({
        queryKey: ['dashboard', 'todayRevenue', effectiveUserId],
        queryFn: () => dashboardService.fetchTodayRevenue(effectiveUserId!),
        enabled: !!effectiveUserId,
        staleTime: 30 * 1000, // 30s
    });

    // 6. Upcoming appointments query
    const { data: appointments = [] } = useQuery({
        queryKey: ['dashboard', 'upcomingAppointments', effectiveUserId],
        queryFn: () => dashboardService.fetchUpcomingAppointments(effectiveUserId!, 5),
        enabled: !!effectiveUserId,
        staleTime: 30 * 1000,
    });

    // 7. Goal history query
    const { data: goalHistory = [] } = useQuery({
        queryKey: ['dashboard', 'goalHistory', userId, effectiveUserId, monthlyGoal],
        queryFn: () => dashboardService.fetchGoalHistory(userId!, effectiveUserId!, monthlyGoal),
        enabled: !!userId && !!effectiveUserId,
        staleTime: 10 * 60 * 1000, // 10 min
    });

    // 8. Mutation to update goal
    const updateGoalMutation = useMutation({
        mutationFn: (newGoalValue: number) => dashboardService.updateGoal(userId!, newGoalValue),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['dashboard', 'profile', userId] });
            queryClient.invalidateQueries({ queryKey: ['dashboard', 'goal', userId] });
            queryClient.invalidateQueries({ queryKey: ['dashboard', 'goalHistory', userId] });
        }
    });

    const updateGoal = async (newGoalValue: number) => {
        try {
            await updateGoalMutation.mutateAsync(newGoalValue);
            return { error: null };
        } catch (error: any) {
            return { error };
        }
    };

    // 9. Fetch all appointments callback (used in modal)
    const fetchAllAppointments = useCallback(async () => {
        if (!effectiveUserId) return [];
        return dashboardService.fetchUpcomingAppointments(effectiveUserId, 100);
    }, [effectiveUserId]);

    const profit = stats?.total_profit ?? 0;
    const currentMonthRevenue = stats?.current_month_revenue ?? 0;
    const weeklyGrowth = stats?.weekly_growth ?? 0;

    const profitMetrics: ProfitMetricsData = {
        totalProfit: stats?.total_profit ?? 0,
        currentMonthRevenue: stats?.current_month_revenue ?? 0,
        monthScheduledValue: stats?.month_scheduled_value ?? 0,
        recoveredRevenue: stats?.recovered_revenue ?? 0,
        avoidedNoShows: stats?.avoided_no_shows ?? 0,
        filledSlots: stats?.filled_slots ?? 0,
        weeklyGrowth: stats?.weekly_growth ?? 0,
        campaignsSent: stats?.campaigns_sent ?? 0,
        todayRevenue
    };

    const dataMaturity: DataMaturity = {
        appointmentsTotal: stats?.appointments_total ?? 0,
        appointmentsThisMonth: stats?.appointments_this_month ?? 0,
        completedThisMonth: stats?.completed_this_month ?? 0,
        hasPublicBookings: stats?.has_public_bookings ?? false,
        accountDaysOld: stats?.account_days_old ?? 0,
        score: Math.min(stats?.data_maturity_score ?? 0, 100)
    };

    const financialDoctor: FinancialDoctorData = {
        avgTicket: stats?.avg_ticket ?? 0,
        churnRiskCount: stats?.churn_risk_count ?? 0,
        topService: stats?.top_service ?? '',
        repeatClientRate: stats?.repeat_client_rate ?? 0
    };

    const accountCreatedAt = user?.created_at ? new Date(user.created_at) : null;

    return {
        appointments,
        fetchAllAppointments,
        profit,
        currentMonthRevenue,
        weeklyGrowth,
        loading: statsLoading && appointments.length === 0,
        monthlyGoal,
        goalHistory,
        businessSlug,
        accountCreatedAt,
        updateGoal,
        profitMetrics,
        dataMaturity,
        financialDoctor,
        actionItems
    };
}
