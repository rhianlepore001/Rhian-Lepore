import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../utils/Logger';

/**
 * Custom hook for fetching and managing dashboard data
 * Retrieves appointments, revenue metrics, goals, and business statistics
 * Automatically refreshes when user changes
 *
 * @returns {Object} Dashboard data object
 * @returns {Array} appointments - Next 5 confirmed appointments
 * @returns {number} profit - Total profit earned
 * @returns {number} currentMonthRevenue - Revenue for current month
 * @returns {number} weeklyGrowth - Week-over-week growth percentage
 * @returns {boolean} loading - Whether data is currently loading
 * @returns {number} monthlyGoal - Monthly revenue goal
 * @returns {Array} goalHistory - Historical goal achievement data (6 months)
 * @returns {string|null} businessSlug - Business URL slug
 * @returns {Date|null} accountCreatedAt - Account creation date
 * @returns {Function} updateGoal - Update monthly goal
 * @returns {Object} profitMetrics - Detailed profit metrics
 * @returns {Array} actionItems - Recommended action items
 *
 * @example
 * const { appointments, profit, monthlyGoal, updateGoal } = useDashboardData();
 */
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

                const now = new Date();
                const currentMonth = now.getMonth();
                const currentYear = now.getFullYear();

                const [profileRes, goalRes] = await Promise.all([
                    supabase.from('profiles').select('business_slug, monthly_goal').eq('id', user.id).single(),
                    supabase.from('goal_settings').select('monthly_goal').eq('user_id', user.id).eq('month', currentMonth).eq('year', currentYear).maybeSingle()
                ]);

                if (profileRes.data?.business_slug) setBusinessSlug(profileRes.data.business_slug);

                const effectiveGoal = goalRes.data?.monthly_goal ?? profileRes.data?.monthly_goal ?? 15000;

                // Only update if different to avoid unnecessary re-renders
                setMonthlyGoal(prev => prev !== effectiveGoal ? effectiveGoal : prev);

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

                const date = new Date();
                const currentMonth = date.getMonth();
                const currentYear = date.getFullYear();

                const historyPromises = [];
                for (let i = 0; i < 6; i++) {
                    const targetDate = new Date(currentYear, currentMonth - i, 1);
                    const month = targetDate.getMonth();
                    const year = targetDate.getFullYear();

                    const startOfMonth = new Date(year, month, 1).toISOString().split('T')[0];
                    const endOfMonth = new Date(year, month + 1, 0).toISOString().split('T')[0];

                    historyPromises.push(Promise.all([
                        supabase.rpc('get_finance_stats', { p_user_id: user.id, p_start_date: startOfMonth, p_end_date: endOfMonth }),
                        supabase.from('goal_settings').select('monthly_goal').eq('user_id', user.id).eq('month', month).eq('year', year).maybeSingle(),
                        Promise.resolve({ month, year })
                    ]));
                }

                const results = await Promise.all(historyPromises);

                for (const [statsRes, goalRes, meta] of results) {
                    const revenue = statsRes.data?.revenue || 0;
                    const mGoal = goalRes.data?.monthly_goal || effectiveGoalValue || 15000;
                    const percentage = mGoal > 0 ? Math.round((revenue / mGoal) * 100) : 0;

                    history.push({
                        month: monthsNames[meta.month],
                        year: meta.year,
                        goal: mGoal,
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

        // Get value from state for history fallback if not yet fetched
        const effectiveGoalValue = monthlyGoal;

        fetchData();
        fetchGoalHistory();
    }, [user]); // Removed monthlyGoal from dependencies to break infinite loop

    /**
     * Update the monthly revenue goal
     * @async
     * @param {number} newGoalValue - New goal amount
     * @returns {Promise<{error: any}>} Error object if update fails, null on success
     */
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
