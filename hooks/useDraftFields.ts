import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui';
import { useFormDraft } from './useFormDraft';

type Fields<T> = { [K in keyof T]: readonly [T[K], (value: NoInfer<T[K]>) => void] };

export function useDraftFields<T extends object>(
  formKey: string,
  fields: Fields<T>,
  options: {
    enabled?: boolean;
    ready?: boolean;
    restore?: (data: T) => Partial<T>;
    notify?: boolean;
    onDiscard?: () => void;
  } = {},
) {
  const { user, companyId } = useAuth();
  const { showToast } = useToast();
  const { enabled = true, ready = true, notify = true } = options;
  const [discardVersion, setDiscardVersion] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const state = Object.fromEntries(Object.entries(fields).map(([key, pair]) => [key, pair[0]])) as T;
  const draft = useFormDraft(formKey, state, { enabled: enabled && ready && hydrated, companyId, userId: user?.id });
  const scope = `${companyId}:${user?.id}:${formKey}`;
  const applied = useRef<string | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const current = useRef({ fields, options, draft, showToast });
  current.current = { fields, options, draft, showToast };

  useEffect(() => {
    if (!ready || !companyId || !user?.id || applied.current === scope) return;
    applied.current = scope;
    const { fields, options, draft, showToast } = current.current;
    if (draft.restored) {
      const safeData = Object.fromEntries((Object.keys(fields) as (keyof T)[]).map(key => {
        const fallback = fields[key][0];
        const value = draft.restored![key];
        const valid = Array.isArray(fallback) ? Array.isArray(value) :
          fallback === null ? value === null : typeof value === typeof fallback;
        return [key, valid ? value : fallback];
      })) as T;
      const data = options.restore ? options.restore(safeData) : safeData;
      for (const key of Object.keys(fields) as (keyof T)[]) {
        if (Object.prototype.hasOwnProperty.call(data, key)) fields[key][1](data[key] as T[keyof T]);
      }
      if (notify) showToast('Rascunho restaurado', { type: 'info', action: {
        label: 'Descartar', onClick: () => {
          if (!mounted.current || applied.current !== scope || !current.current.draft.restored) return;
          draft.clear();
          for (const key of Object.keys(fields) as (keyof T)[]) fields[key][1](fields[key][0]);
          setDiscardVersion(version => version + 1);
          options.onDiscard?.();
        },
      } });
    }
    setHydrated(true);
  }, [scope, ready, companyId, user?.id, notify]);

  useEffect(() => {
    if (discardVersion > 0) current.current.draft.clear();
  }, [discardVersion]);

  return { ...draft, hydrated };
}
