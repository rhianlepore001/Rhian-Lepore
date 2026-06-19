import { z } from 'zod';

export const dataMaturitySchema = z.object({
  appointmentsTotal: z.number().default(0),
  appointmentsThisMonth: z.number().default(0),
  completedThisMonth: z.number().default(0),
  hasPublicBookings: z.boolean().default(false),
  accountDaysOld: z.number().default(0),
  score: z.number().default(0),
});

export const profitMetricsDataSchema = z.object({
  totalProfit: z.number().default(0),
  recoveredRevenue: z.number().default(0),
  avoidedNoShows: z.number().default(0),
  filledSlots: z.number().default(0),
  weeklyGrowth: z.number().default(0),
  campaignsSent: z.number().default(0),
  currentMonthRevenue: z.number().optional().default(0),
  monthScheduledValue: z.number().optional().default(0),
  todayRevenue: z.number().optional().default(0),
});

export const financialDoctorDataSchema = z.object({
  avgTicket: z.number().default(0),
  churnRiskCount: z.number().default(0),
  topService: z.string().default(''),
  repeatClientRate: z.number().default(0),
});

export const dashboardStatsSchema = z.object({
  total_profit: z.number().nullable().optional().transform(v => v ?? 0),
  current_month_revenue: z.number().nullable().optional().transform(v => v ?? 0),
  weekly_growth: z.number().nullable().optional().transform(v => v ?? 0),
  recovered_revenue: z.number().nullable().optional().transform(v => v ?? 0),
  avoided_no_shows: z.number().nullable().optional().transform(v => v ?? 0),
  filled_slots: z.number().nullable().optional().transform(v => v ?? 0),
  campaigns_sent: z.number().nullable().optional().transform(v => v ?? 0),
  appointments_total: z.number().nullable().optional().transform(v => v ?? 0),
  appointments_this_month: z.number().nullable().optional().transform(v => v ?? 0),
  completed_this_month: z.number().nullable().optional().transform(v => v ?? 0),
  has_public_bookings: z.boolean().nullable().optional().transform(v => v ?? false),
  account_days_old: z.number().nullable().optional().transform(v => v ?? 0),
  data_maturity_score: z.number().nullable().optional().transform(v => v ?? 0),
  avg_ticket: z.number().nullable().optional().transform(v => v ?? 0),
  churn_risk_count: z.number().nullable().optional().transform(v => v ?? 0),
  top_service: z.string().nullable().optional().transform(v => v ?? ''),
  repeat_client_rate: z.number().nullable().optional().transform(v => v ?? 0),
  month_scheduled_value: z.number().nullable().optional().transform(v => v ?? 0),
});

export const actionItemSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  description: z.string(),
  time: z.string().nullable().optional(),
});

export const dashboardAppointmentSchema = z.object({
  id: z.string(),
  clientName: z.string(),
  service: z.string(),
  time: z.string(),
  date: z.string(),
  rawDate: z.string(),
  status: z.string(),
  price: z.number(),
  appointment_time: z.string(),
});

export const goalHistoryItemSchema = z.object({
  month: z.string(),
  year: z.number(),
  goal: z.number(),
  achieved: z.number(),
  percentage: z.number(),
  success: z.boolean(),
});

export type DataMaturity = z.infer<typeof dataMaturitySchema>;
export type ProfitMetricsData = z.infer<typeof profitMetricsDataSchema>;
export type FinancialDoctorData = z.infer<typeof financialDoctorDataSchema>;
export type DashboardStats = z.infer<typeof dashboardStatsSchema>;
export type ActionItem = z.infer<typeof actionItemSchema>;
export type DashboardAppointment = z.infer<typeof dashboardAppointmentSchema>;
export type GoalHistoryItem = z.infer<typeof goalHistoryItemSchema>;

export const clientGrowthEntrySchema = z.object({
  month: z.string(),
  new_clients: z.number(),
});

export const topClientSchema = z.object({
  name: z.string(),
  visits: z.number(),
  revenue: z.number(),
  last_visit: z.string(),
});

export const clientInsightsSchema = z.object({
  client_growth_by_month: z.array(clientGrowthEntrySchema).default([]),
  top_clients: z.array(topClientSchema).default([]),
  retention_rate: z.number().default(0),
});

export type ClientGrowthEntry = z.infer<typeof clientGrowthEntrySchema>;
export type TopClient = z.infer<typeof topClientSchema>;
export type ClientInsights = z.infer<typeof clientInsightsSchema>;
