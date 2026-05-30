import { z } from 'zod';

export const financeTransactionSchema = z.object({
  id: z.string().min(1),
  serviceName: z.string(),
  professionalName: z.string(),
  professionalId: z.string().nullable(),
  clientName: z.string(),
  amount: z.number(),
  expense: z.number(),
  date: z.string(),
  time: z.string(),
  rawDate: z.date(),
  type: z.enum(['revenue', 'expense']),
  payment_method: z.string().nullable(),
  commission_paid: z.boolean(),
  status: z.enum(['paid', 'pending']),
});

export const financeSummarySchema = z.object({
  revenue: z.number(),
  expenses: z.number(),
  commissionsPending: z.number(),
  profit: z.number(),
  growth: z.number(),
  previousMonthRevenue: z.number(),
  revenueByMethod: z.object({
    pix: z.number(),
    mbway: z.number(),
    dinheiro: z.number(),
    cartao: z.number(),
  }),
  pendingExpenses: z.number(),
});

export type FinanceTransaction = z.infer<typeof financeTransactionSchema>;
export type FinanceSummary = z.infer<typeof financeSummarySchema>;

export interface FinanceStatsInput {
  companyId: string;
  startDate: string;
  endDate: string;
  professionalId?: string | null;
}

export interface CommissionCalculationInput {
  price: number;
  commissionRate: number;
  machineFeeEnabled: boolean;
  machineFeeAmount: number;
}

export interface CommissionCalculationResult {
  commissionBase: number;
  commissionValue: number;
}
