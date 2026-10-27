import { useCallback, useEffect, useState } from 'react';
import { listDependents, type ClientDependent } from '@/services/clientDependents';

export function useClientDependents(companyId: string, clientId: string) {
  const [dependents, setDependents] = useState<ClientDependent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    let cancelled = false;
    setDependents([]);
    setError('');
    if (!companyId || !clientId) return;
    setLoading(true);
    void listDependents(companyId, clientId).then(rows => {
      if (!cancelled) setDependents(rows);
    }).catch(() => {
      if (!cancelled) setError('Não foi possível carregar os dependentes. Tente novamente.');
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [companyId, clientId, revision]);
  return { dependents, loading, error, reload };
}
