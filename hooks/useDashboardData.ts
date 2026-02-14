import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../utils/formatters';

export function useDashboardData() {
    const { user } = useAuth();
    const [appointments, setAppointments] = useState<any[]>([]);
    const [profit, setProfit] = useState(0);
    const [currentMonthRevenue, setCurrentMonthRevenue] = useState(0);
    const [weeklyGrowth, setWeeklyGrowth] = useState(0);
    const [loading, setLoading] = useState(true);
    const [monthlyGoal, setMonthlyGoal] = useState(15000);
    const [goalHistory, setGoalHistory] = useState<any[]>([]);
    const [businessSlug, setBusinessSlug] = useState<string | null>(null);
    const [accountCreatedAt, setAccountCreatedAt] = useState<Date | null>(null);


    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            try {
                if (user.created_at) {
                    setAccountCreatedAt(new Date(user.created_at));
                }

                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('business_slug, monthly_goal')
                    .eq('id', user.id)
                    .single();

                if (profileData?.business_slug) setBusinessSlug(profileData.business_slug);
                if (profileData?.monthly_goal) setMonthlyGoal(profileData.monthly_goal);

                const now = new Date().toISOString();
                const { data: aptData, error: aptError } = await supabase
                    .from('appointments')
                    .select('*, clients(name)')
                    .eq('user_id', user.id)
                    .eq('status', 'Confirmed')
                    .gte('appointment_time', now)
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

                const { data: statsData, error: statsError } = await supabase
                    .rpc('get_dashboard_stats', { p_user_id: user.id });

                if (statsError) throw statsError;

                if (statsData) {
                    setProfit(statsData.total_profit);
                    setCurrentMonthRevenue(statsData.current_month_revenue);
                    setWeeklyGrowth(statsData.weekly_growth);
                    if (statsData.monthly_goal) setMonthlyGoal(statsData.monthly_goal);
                }

            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        const fetchGoalHistory = async () => {
            if (!user) return;
            try {
                const history = [];
                const months = [
                    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
                ];

                for (let i = 0; i < 6; i++) {
                    const date = new Date();
                    date.setMonth(date.getMonth() - i);
                    const month = date.getMonth();
                    const year = date.getFullYear();

                    const startOfMonth = new Date(year, month, 1).toISOString().split('T')[0];
                    const endOfMonth = new Date(year, month + 1, 0).toISOString().split('T')[0];

                    const { data } = await supabase.rpc('get_finance_stats', {
                        p_user_id: user.id,
                        p_start_date: startOfMonth,
                        p_end_date: endOfMonth
                    });

                    if (data) {
                        const percentage = monthlyGoal > 0 ? Math.round((data.revenue / monthlyGoal) * 100) : 0;
                        history.push({
                            month: months[month],
                            year: year,
                            goal: monthlyGoal,
                            achieved: data.revenue,
                            percentage: percentage,
                            success: percentage >= 100
                        });
                    }
                }
                setGoalHistory(history);
            } catch (error) {
                console.error('Error fetching goal history:', error);
            }
        };

        fetchData();
        fetchGoalHistory();
    }, [user, monthlyGoal]);

    const updateGoal = async (newGoalValue: number) => {
        if (!user) return;
        const { error } = await supabase
            .from('profiles')
            .update({ monthly_goal: newGoalValue })
            .eq('id', user.id);

        if (!error) {
            setMonthlyGoal(newGoalValue);
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
        updateGoal
    };
}
