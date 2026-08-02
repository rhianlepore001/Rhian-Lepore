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
