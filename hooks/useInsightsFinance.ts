import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { fetchFinanceStats, mapFinanceTransaction } from '../services/finance';
import { useMonthlyHistory } from './useFinance';

/**
 * Dados financeiros analíticos para o hub de Insights (owner-only).
 * Encapsula a montagem que antes vivia na aba "Insights" do Financeiro:
 * resumo do mês atual (com crescimento vs mês anterior e receita por método),
 * histórico de 12 meses e transações do mês — no formato que <FinanceInsights /> espera.
 */
export interface InsightsFinanceSummary {
  revenue: number;
  expenses: number;
  profit: number;
  growth: number;
  previousMonthRevenue: number;
  revenueByMethod: { pix: number; mbway: number; dinheiro: number; cartao: number };
}

const MONTH_PT: Record<string, string> = {
  January: 'Janeiro', February: 'Fevereiro', March: 'Março', April: 'Abril',
  May: 'Maio', June: 'Junho', July: 'Julho', August: 'Agosto',
  September: 'Setembro', October: 'Outubro', November: 'Novembro', December: 'Dezembro',
};

export function useInsightsFinance() {
  const { user, companyId } = useAuth();
  const effectiveUserId = companyId ?? user?.id ?? '';

  const { data: monthlyHistoryData } = useMonthlyHistory(effectiveUserId, 12);

  const monthlyHistory = useMemo(() => {
    if (!monthlyHistoryData) return [];
    return monthlyHistoryData
      .map((item: any, index: number, arr: any[]) => {
        let growth = 0;
        if (index > 0) {
          const prevRevenue = arr[index - 1].revenue;
          growth = prevRevenue > 0 ? ((item.revenue - prevRevenue) / prevRevenue) * 100 : 0;
        }
        return {
          month: MONTH_PT[item.month_name?.trim() || ''] || (item.month_name?.trim() || ''),
          year: item.year_num,
          revenue: parseFloat(item.revenue),
          expenses: parseFloat(item.expenses),
          profit: parseFloat(item.profit),
          growth,
        };
      })
      .reverse();
  }, [monthlyHistoryData]);

  const { data: statsData, isLoading } = useQuery({
    queryKey: ['insights', 'finance', effectiveUserId],
    enabled: !!effectiveUserId,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();

      const startDate = new Date(year, month, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const prevStart = new Date(prevYear, prevMonth, 1).toISOString().split('T')[0];
      const prevEnd = new Date(prevYear, prevMonth + 1, 0).toISOString().split('T')[0];

      const [data, prevData] = await Promise.all([
        fetchFinanceStats({ companyId: effectiveUserId, startDate, endDate, professionalId: null }),
        fetchFinanceStats({ companyId: effectiveUserId, startDate: prevStart, endDate: prevEnd, professionalId: null }),
      ]);

      const growth = prevData && prevData.revenue > 0
        ? ((data.revenue - prevData.revenue) / prevData.revenue) * 100
        : 0;

      const summary: InsightsFinanceSummary = {
        revenue: data?.revenue || 0,
        expenses: data?.expenses || 0,
        profit: data?.profit || 0,
        growth: growth || 0,
        previousMonthRevenue: prevData?.revenue || 0,
        revenueByMethod: data?.revenue_by_method || { pix: 0, mbway: 0, dinheiro: 0, cartao: 0 },
      };

      const transactions = (data?.transactions || []).map(mapFinanceTransaction);

      return { summary, transactions };
    },
  });

  const summary: InsightsFinanceSummary = statsData?.summary ?? {
    revenue: 0, expenses: 0, profit: 0, growth: 0, previousMonthRevenue: 0,
    revenueByMethod: { pix: 0, mbway: 0, dinheiro: 0, cartao: 0 },
  };

  return {
    summary,
    monthlyHistory,
    transactions: statsData?.transactions ?? [],
    loading: isLoading,
  };
}
