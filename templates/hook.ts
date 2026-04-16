import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/Logger';

export interface UseHookNameData {
  id: string;
  [key: string]: unknown;
}

export function useHookName() {
  const { companyId } = useAuth();
  const [data, setData] = useState<UseHookNameData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!companyId) return;

    try {
      setLoading(true);
      setError(null);
      const { data: result, error: supabaseError } = await supabase
        .from('tabela')
        .select('*')
        .eq('company_id', companyId);

      if (supabaseError) throw supabaseError;
      setData(result ?? []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(message);
      logger.error('useHookName.fetchData', err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
