import { supabase } from '@/lib/supabase';
import { z } from 'zod';
import {
  dashboardStatsSchema,
  actionItemSchema,
  type DashboardStats,
  type ActionItem,
  type DashboardAppointment,
  type GoalHistoryItem,
  clientInsightsSchema,
  type ClientInsights,
} from '@/types/dashboard';

export interface DashboardProfileData {
  businessSlug: string | null;
  monthlyGoal: number;
  dailyGoal: number | null;
}

export async function fetchDashboardProfile(userId: string): Promise<DashboardProfileData> {
  const { data, error } = await supabase
    .from('profiles')
    .select('business_slug, monthly_goal, daily_goal')
    .eq('id', userId)
    .single();

  if (error) throw error;

  return {
    businessSlug: data?.business_slug || null,
    monthlyGoal: data?.monthly_goal ?? 15000,
    dailyGoal: data?.daily_goal ?? null,
  };
}

export async function updateDailyGoal(userId: string, dailyGoal: number | null): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ daily_goal: dailyGoal })
    .eq('id', userId);

  if (error) throw error;
}

export async function fetchGoalSettings(
  userId: string,
  month: number,
  year: number,
): Promise<number | null> {
  const { data, error } = await supabase
    .from('goal_settings')
    .select('monthly_goal')
    .eq('user_id', userId)
    .eq('month', month)
    .eq('year', year)
    .maybeSingle();

  if (error) throw error;
  return data?.monthly_goal ?? null;
}

export async function fetchDashboardStats(effectiveUserId: string): Promise<DashboardStats> {
  const { data, error } = await supabase.rpc('get_dashboard_stats', {
    p_user_id: effectiveUserId,
  });

  if (error) throw error;
  return dashboardStatsSchema.parse(data);
}

export async function fetchClientInsights(
  effectiveUserId: string,
  months = 6,
): Promise<ClientInsights> {
  const { data, error } = await supabase.rpc('get_client_insights', {
    p_user_id: effectiveUserId,
    p_months: months,
  });

  if (error) throw error;
  return clientInsightsSchema.parse(data);
}

export async function fetchDashboardActions(effectiveUserId: string): Promise<ActionItem[]> {
  const { data, error } = await supabase.rpc('get_dashboard_actions', {
    p_user_id: effectiveUserId,
  });

  if (error) {
    // Non-fatal, just return empty list
    return [];
  }

  return z.array(actionItemSchema).parse(data || []);
}

export async function fetchTodayRevenue(effectiveUserId: string): Promise<number> {
  const todayStr = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('appointments')
    .select('price')
    .eq('user_id', effectiveUserId)
    .eq('status', 'Completed')
    .gte('appointment_time', todayStr + 'T00:00:00')
    .lte('appointment_time', todayStr + 'T23:59:59');

  if (error) throw error;

  return data?.reduce((sum, a) => sum + (Number(a.price) || 0), 0) ?? 0;
}

export async function updateGoal(userId: string, newGoalValue: number): Promise<void> {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  const { error: goalError } = await supabase
    .from('goal_settings')
    .upsert({
      user_id: userId,
      month,
      year,
      monthly_goal: newGoalValue,
    }, {
      onConflict: 'user_id,month,year',
    });

  if (goalError) throw goalError;

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ monthly_goal: newGoalValue })
    .eq('id', userId);

  if (profileError) throw profileError;
}

export async function fetchUpcomingAppointments(effectiveUserId: string, limit = 5): Promise<DashboardAppointment[]> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from('appointments')
    .select('*, clients(name)')
    .eq('user_id', effectiveUserId)
    .eq('status', 'Confirmed')
    .gte('appointment_time', nowIso)
    .order('appointment_time', { ascending: true })
    .limit(limit);

  if (error) throw error;

  return (data || []).map((apt: any) => ({
    id: apt.id,
    clientName: apt.clients?.name || 'Cliente Desconhecido',
    service: apt.service || 'Serviço Padrão',
    time: new Date(apt.appointment_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    date: new Date(apt.appointment_time).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    rawDate: new Date(apt.appointment_time).toISOString().split('T')[0],
    status: apt.status,
    price: Number(apt.price) || 0,
    appointment_time: apt.appointment_time,
    professional_id: apt.professional_id ?? null,
  }));
}

export async function fetchGoalHistory(
  userId: string,
  effectiveUserId: string,
  defaultGoal: number,
): Promise<GoalHistoryItem[]> {
  const history: GoalHistoryItem[] = [];
  const monthsNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

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
      supabase.rpc('get_finance_stats', { p_user_id: effectiveUserId, p_start_date: startOfMonth, p_end_date: endOfMonth }),
      supabase.from('goal_settings').select('monthly_goal').eq('user_id', userId).eq('month', month).eq('year', year).maybeSingle(),
      Promise.resolve({ month, year }),
    ]));
  }

  const results = await Promise.all(historyPromises);

  for (const [statsRes, goalRes, meta] of results) {
    const revenue = statsRes.data?.revenue || 0;
    const mGoal = goalRes.data?.monthly_goal || defaultGoal || 15000;
    const percentage = mGoal > 0 ? Math.round((revenue / mGoal) * 100) : 0;

    history.push({
      month: monthsNames[meta.month],
      year: meta.year,
      goal: mGoal,
      achieved: revenue,
      percentage: percentage,
      success: percentage >= 100,
    });
  }

  return history;
}

export async function fetchTodayAppointmentsForProfessional(
  ownerId: string,
  professionalId: string,
): Promise<DashboardAppointment[]> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStartIso = todayStart.toISOString();

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  const todayEndIso = todayEnd.toISOString();

  const { data, error } = await supabase
    .from('appointments')
    .select('*, clients(name)')
    .eq('user_id', ownerId)
    .eq('professional_id', professionalId)
    .gte('appointment_time', todayStartIso)
    .lte('appointment_time', todayEndIso)
    .order('appointment_time', { ascending: true });

  if (error) throw error;

  return (data || []).map((apt: any) => ({
    id: apt.id,
    clientName: apt.clients?.name || 'Cliente Desconhecido',
    service: apt.service || 'Serviço Padrão',
    time: new Date(apt.appointment_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    date: new Date(apt.appointment_time).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    rawDate: new Date(apt.appointment_time).toISOString().split('T')[0],
    status: apt.status,
    price: Number(apt.price) || 0,
    appointment_time: apt.appointment_time,
    professional_id: apt.professional_id ?? null,
  }));
}

export async function updateAppointmentStatus(id: string, status: string): Promise<void> {
  const { error } = await supabase
    .from('appointments')
    .update({ status })
    .eq('id', id);

  if (error) throw error;
}

export async function fetchFutureAppointmentsForProfessional(
    ownerId: string,
    professionalId: string,
): Promise<DashboardAppointment[]> {
    const now = new Date().toISOString();
    const { data, error } = await supabase
        .from('appointments')
        .select('*, clients(name)')
        .eq('user_id', ownerId)
        .eq('professional_id', professionalId)
        .gte('appointment_time', now)
        .in('status', ['Confirmed', 'Pending'])
        .order('appointment_time', { ascending: true });

    if (error) throw error;

    return (data || []).map((apt: any) => ({
        id: apt.id,
        clientName: apt.clients?.name || 'Cliente Desconhecido',
        service: apt.service || 'Serviço Padrão',
        time: new Date(apt.appointment_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: new Date(apt.appointment_time).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        rawDate: new Date(apt.appointment_time).toISOString().split('T')[0],
        status: apt.status,
        price: Number(apt.price) || 0,
        appointment_time: apt.appointment_time,
        professional_id: apt.professional_id ?? null,
    }));
}

export async function fetchStaffUnpaidCommissions(professionalId: string): Promise<number> {
    const { data, error } = await supabase
        .from('finance_records')
        .select('commission_value')
        .eq('professional_id', professionalId)
        .eq('commission_paid', false);

    if (error) throw error;

    return (data || []).reduce((sum, r) => sum + (Number(r.commission_value) || 0), 0);
}
