import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { AgendixPlanId } from '../utils/planPricing';

/** Plano AgendiX contratado pelo dono logado (profiles.subscription_plan), só leitura. */
export function useCurrentPlan(): AgendixPlanId | null {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { data } = useQuery({
    queryKey: ['agendix-current-plan', userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async (): Promise<AgendixPlanId | null> => {
      const { data: row, error } = await supabase
        .from('profiles')
        .select('subscription_plan')
        .eq('id', userId as string)
        .maybeSingle();
      if (error) return null;
      const plan = (row as { subscription_plan?: string | null } | null)?.subscription_plan;
      return plan === 'solo' || plan === 'team' ? plan : null;
    },
  });
  return data ?? null;
}
