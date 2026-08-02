import { z } from 'zod';

export const rankingItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  count: z.number().nonnegative(),
  revenue: z.number().nonnegative(),
  share: z.number().min(0).max(100),
  margin: z.number().optional(),
});

export const businessPerformanceSchema = z.object({
  services: z.array(rankingItemSchema),
  products: z.array(rankingItemSchema),
  professionals: z.array(rankingItemSchema),
  summary: z.object({
    servicesRevenue: z.number().nonnegative(),
    productsRevenue: z.number().nonnegative(),
    servicesCount: z.number().nonnegative(),
    productsUnits: z.number().nonnegative(),
    appointmentsCount: z.number().nonnegative(),
  }),
});

export type RankingItem = z.infer<typeof rankingItemSchema>;
export type BusinessPerformance = z.infer<typeof businessPerformanceSchema>;

export const staffPeriodSchema = z.enum(['day', 'week', 'month']);
export type StaffPeriod = z.infer<typeof staffPeriodSchema>;

export const staffServiceLineSchema = z.object({
  id: z.string(),
  service: z.string(),
  clientName: z.string(),
  appointmentTime: z.string(),
  price: z.number().nonnegative(),
  commissionValue: z.number().nonnegative(),
});

export const staffProductSaleLineSchema = z.object({
  id: z.string(),
  productName: z.string(),
  clientName: z.string().nullable(),
  quantity: z.number().int().positive(),
  totalRevenue: z.number().nonnegative(),
  commissionValue: z.number().nonnegative(),
  stockQuantity: z.number().int().nonnegative().nullable(),
  createdAt: z.string(),
});

export const staffServiceAggregateSchema = z.object({
  id: z.string(),
  name: z.string(),
  count: z.number().nonnegative(),
  revenue: z.number().nonnegative(),
  commission: z.number().nonnegative(),
  share: z.number().min(0).max(100),
});

export const staffProductAggregateSchema = z.object({
  id: z.string(),
  name: z.string(),
  count: z.number().nonnegative(),
  revenue: z.number().nonnegative(),
  commission: z.number().nonnegative(),
  stockQuantity: z.number().int().nonnegative().nullable(),
  share: z.number().min(0).max(100),
});

export const staffInsightsSummarySchema = z.object({
  appointmentsCount: z.number().nonnegative(),
  uniqueClients: z.number().nonnegative(),
  commissionsTotal: z.number().nonnegative(),
  productsUnits: z.number().nonnegative(),
  productsRevenue: z.number().nonnegative(),
  servicesRevenue: z.number().nonnegative(),
  avgTicket: z.number().nonnegative(),
});

export const staffUpcomingAppointmentSchema = z.object({
  id: z.string(),
  service: z.string(),
  clientName: z.string(),
  appointmentTime: z.string(),
  status: z.string(),
});

export const staffInsightsSchema = z.object({
  summary: staffInsightsSummarySchema,
  services: z.array(staffServiceAggregateSchema),
  products: z.array(staffProductAggregateSchema),
  recentServices: z.array(staffServiceLineSchema),
  recentProducts: z.array(staffProductSaleLineSchema),
  todayUpcoming: z.array(staffUpcomingAppointmentSchema),
});

export type StaffServiceLine = z.infer<typeof staffServiceLineSchema>;
export type StaffProductSaleLine = z.infer<typeof staffProductSaleLineSchema>;
export type StaffServiceAggregate = z.infer<typeof staffServiceAggregateSchema>;
export type StaffProductAggregate = z.infer<typeof staffProductAggregateSchema>;
export type StaffInsightsSummary = z.infer<typeof staffInsightsSummarySchema>;
export type StaffUpcomingAppointment = z.infer<typeof staffUpcomingAppointmentSchema>;
export type StaffInsights = z.infer<typeof staffInsightsSchema>;
