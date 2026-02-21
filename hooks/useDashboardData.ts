import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../utils/Logger';

export function useDashboardData() {
    const { user } = useAuth();
    const [appointments, setAppointments] = useState<any[]>([]);
    const [profit, setProfit] = useState(0);
    const [currentMonthRevenue, setCurrentMonthRevenue] = useState(0);
    const [weeklyGrowth, setWeeklyGrowth] = useState(0);
    const [loading, setLoading] = useState(true);
    const [monthlyGoal, setMonthlyGoal] = useState(0);
    const [goalHistory, setGoalHistory] = useState<any[]>([]);
    const [businessSlug, setBusinessSlug] = useState<string | null>(null);
    const [accountCreatedAt, setAccountCreatedAt] = useState<Date | null>(null);
    const [profitMetrics, setProfitMetrics] = useState<any>({
        totalProfit: 0,
        recoveredRevenue: 0,
        avoidedNoShows: 0,
        filledSlots: 0,
        weeklyGrowth: 0
    });
    const [actionItems, setActionItems] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            try {
                if (user.created_at) {
                    setAccountCreatedAt(new Date(user.created_at));
                }

                // 1. Fetch Profile and current Goal
                const now = new Date();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();

                const [profileRes, goalRes] = await Promise.all([
                    supabase.from('profiles').select('business_slug, monthly_goal').eq('id', user.id).single(),
                    supabase.from('goal_settings').select('monthly_goal').eq('user_id', user.id).eq('month', currentMonth).eq('year', currentYear).maybeSingle()
                ]);

                if (profileRes.data?.business_slug) setBusinessSlug(profileRes.data.business_slug);

                // Priority: goal_settings > profiles.monthly_goal > default(15000)
                const effectiveGoal = goalRes.data?.monthly_goal ?? profileRes.data?.monthly_goal ?? 15000;
                setMonthlyGoal(effectiveGoal);

                // 2. Fetch Appointments
                const nowIso = now.toISOString();
                const { data: aptData, error: aptError } = await supabase
                    .from('appointments')
                    .select('*, clients(name)')
                    .eq('user_id', user.id)
                    .eq('status', 'Confirmed')
                    .gte('appointment_time', nowIso)
                    .order('appointment_time', { ascending: true })
                    .limit(5);

                if (aptError) throw aptError;

                if (aptData) {
                    setAppointments(aptData.map((apt: any) => ({
                        id: apt.id,
                        clientName: apt.clients?.name || 'Cliente Desconhecido',
                        service: apt.service,
                        time: new Date(apt.appointment_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        date: new Date(apt.appointment_time).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                        rawDate: new Date(apt.appointment_time).toISOString().split('T')[0],
                        status: apt.status,
                        price: apt.price,
                        appointment_time: apt.appointment_time
                    })));
                }

                // 3. Stats and Actions
                const [statsRes, actionsRes] = await Promise.all([
                    supabase.rpc('get_dashboard_stats', { p_user_id: user.id }),
                    supabase.rpc('get_dashboard_actions', { p_user_id: user.id })
                ]);

                if (statsRes.error) throw statsRes.error;
                if (actionsRes.error) throw actionsRes.error;

                const statsData = statsRes.data;

                if (statsData) {
                    setProfit(statsData.total_profit);
                    setCurrentMonthRevenue(statsData.current_month_revenue);
                    setWeeklyGrowth(statsData.weekly_growth);

                    setProfitMetrics({
                        totalProfit: statsData.total_profit || 0,
                        recoveredRevenue: statsData.recovered_revenue || 0,
                        avoidedNoShows: statsData.avoided_no_shows || 0,
                        filledSlots: statsData.filled_slots || 0,
                        weeklyGrowth: statsData.weekly_growth || 0,
                        campaignsSent: statsData.campaigns_sent || 0
                    });
                }

                if (actionsRes.data) {
                    setActionItems(actionsRes.data.map((item: any, index: number) => ({
                        id: item.id || `action-${index}`,
                        ...item
                    })));
                }

            } catch (error) {
                logger.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        const fetchGoalHistory = async () => {
            if (!user) return;
            try {
                const history = [];
                const monthsNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

                // We'll fetch the last 6 months
                for (let i = 0; i < 6; i++) {
                    const date = new Date();
                    date.setMonth(date.getMonth() - i);
                    const month = date.getMonth();
                    const year = date.getFullYear();

                    const startOfMonth = new Date(year, month, 1).toISOString().split('T')[0];
                    const endOfMonth = new Date(year, month + 1, 0).toISOString().split('T')[0];

                    // Fetch revenue and goal for that specific month
                    const [statsRes, goalRes] = await Promise.all([
                        supabase.rpc('get_finance_stats', { p_user_id: user.id, p_start_date: startOfMonth, p_end_date: endOfMonth }),
                        supabase.from('goal_settings').select('monthly_goal').eq('user_id', user.id).eq('month', month).eq('year', year).maybeSingle()
                    ]);

                    const revenue = statsRes.data?.revenue || 0;
                    const monthGoal = goalRes.data?.monthly_goal || monthlyGoal || 15000;
                    const percentage = monthGoal > 0 ? Math.round((revenue / monthGoal) * 100) : 0;

                    history.push({
                        month: monthsNames[month],
                        year: year,
                        goal: monthGoal,
                        achieved: revenue,
                        percentage: percentage,
                        success: percentage >= 100
                    });
                }
                setGoalHistory(history);
            } catch (error) {
                logger.error('Error fetching goal history:', error);
            }
        };

        fetchData();
        fetchGoalHistory();
    }, [user, monthlyGoal]);

    const updateGoal = async (newGoalValue: number) => {
        if (!user) return { error: { message: 'User not authenticated' } };

        const now = new Date();
        const month = now.getMonth();
        const year = now.getFullYear();

        // Upsert into goal_settings
        const { error } = await supabase
            .from('goal_settings')
            .upsert({
                user_id: user.id,
                month,
                year,
                monthly_goal: newGoalValue
            }, {
                onConflict: 'user_id,month,year'
            });

        if (!error) {
            setMonthlyGoal(newGoalValue);
            // Also sync back to profiles for legacy compatibility if needed, 
            // but goal_settings is now the source of truth for current month
            await supabase.from('profiles').update({ monthly_goal: newGoalValue }).eq('id', user.id);
        }

        return { error };
    }

    return {
        appointments,
        profit,
        currentMonthRevenue,
        weeklyGrowth,
        loading,
        monthlyGoal,
        goalHistory,
        businessSlug,
        accountCreatedAt,
        updateGoal,
        profitMetrics,
        actionItems
    };
}
