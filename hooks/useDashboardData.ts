import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../utils/Logger';

export interface DataMaturity {
    appointmentsTotal: number;
    appointmentsThisMonth: number;
    completedThisMonth: number;
    hasPublicBookings: boolean;
    accountDaysOld: number;
    score: number; // 0-100
}

export interface ProfitMetricsData {
    totalProfit: number;
    recoveredRevenue: number;
    avoidedNoShows: number;
    filledSlots: number;
    weeklyGrowth: number;
    campaignsSent: number;
}

export interface FinancialDoctorData {
    avgTicket: number;
    churnRiskCount: number;
    topService: string;
    repeatClientRate: number;
}

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

    const [profitMetrics, setProfitMetrics] = useState<ProfitMetricsData>({
        totalProfit: 0,
        recoveredRevenue: 0,
        avoidedNoShows: 0,
        filledSlots: 0,
        weeklyGrowth: 0,
        campaignsSent: 0
    });

    const [dataMaturity, setDataMaturity] = useState<DataMaturity>({
        appointmentsTotal: 0,
        appointmentsThisMonth: 0,
        completedThisMonth: 0,
        hasPublicBookings: false,
        accountDaysOld: 0,
        score: 0
    });

    const [financialDoctor, setFinancialDoctor] = useState<FinancialDoctorData>({
        avgTicket: 0,
        churnRiskCount: 0,
        topService: '',
        repeatClientRate: 0
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

                const s = statsRes.data;

                if (s) {
                    setProfit(s.total_profit);
                    setCurrentMonthRevenue(s.current_month_revenue);
                    setWeeklyGrowth(s.weekly_growth);

                    setProfitMetrics({
                        totalProfit: s.total_profit || 0,
                        recoveredRevenue: s.recovered_revenue || 0,
                        avoidedNoShows: s.avoided_no_shows || 0,
                        filledSlots: s.filled_slots || 0,
                        weeklyGrowth: s.weekly_growth || 0,
                        campaignsSent: s.campaigns_sent || 0
                    });

                    // Data Maturity Guard
                    setDataMaturity({
                        appointmentsTotal: s.appointments_total || 0,
                        appointmentsThisMonth: s.appointments_this_month || 0,
                        completedThisMonth: s.completed_this_month || 0,
                        hasPublicBookings: s.has_public_bookings || false,
                        accountDaysOld: s.account_days_old || 0,
                        score: Math.min(s.data_maturity_score || 0, 100)
                    });

                    // Doutor Financeiro
                    setFinancialDoctor({
                        avgTicket: s.avg_ticket || 0,
                        churnRiskCount: s.churn_risk_count || 0,
                        topService: s.top_service || '',
                        repeatClientRate: s.repeat_client_rate || 0
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

        const effectiveGoalValue = monthlyGoal;

        fetchData();
        fetchGoalHistory();
    }, [user]);

    const updateGoal = async (newGoalValue: number) => {
        if (!user) return { error: { message: 'User not authenticated' } };

        const now = new Date();
        const month = now.getMonth();
        const year = now.getFullYear();

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
        dataMaturity,
        financialDoctor,
        actionItems
    };
}
