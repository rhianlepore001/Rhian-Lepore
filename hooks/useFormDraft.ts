import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export const FORM_DRAFT_PREFIX = 'agendix:draft:v1:';
const CLEAR_EVENT = 'agendix:clear-drafts';
const DEFAULT_TTL = 12 * 60 * 60 * 1000;

export interface FormDraftOptions<T> {
  enabled: boolean;
  companyId?: string | null;
  userId?: string | null;
  ttlMs?: number;
  omit?: (keyof T)[];
}

export function discardFormDraft(companyId: string | null | undefined, userId: string | undefined, formKey: string): void {
  if (!companyId || !userId) return;
  const key = `${FORM_DRAFT_PREFIX}${companyId}:${userId}:${formKey}`;
  window.dispatchEvent(new CustomEvent(CLEAR_EVENT, { detail: key }));
  try { sessionStorage.removeItem(key); } catch { return; }
}

export function clearAllFormDrafts(): void {
  window.dispatchEvent(new Event(CLEAR_EVENT));
  try {
    Object.keys(sessionStorage).filter(key => key.startsWith('agendix:draft:'))
      .forEach(key => sessionStorage.removeItem(key));
  } catch { return; }
}

function readDraft<T>(key: string | null, ttl: number): T | null {
  if (!key) return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const value = JSON.parse(raw);
    if (value.v !== 1 || !Number.isFinite(value.savedAt) || Date.now() - value.savedAt > ttl ||
      value.savedAt > Date.now() || !value.data || typeof value.data !== 'object' || Array.isArray(value.data)) {
      sessionStorage.removeItem(key);
      return null;
    }
    return value.data as T;
  } catch {
    try { sessionStorage.removeItem(key); } catch { return null; }
    return null;
  }
}

export function useFormDraft<T extends object>(formKey: string, state: T, opts: FormDraftOptions<T>) {
  const { enabled, companyId, userId, ttlMs = DEFAULT_TTL, omit = [] } = opts;
  const key = companyId && userId ? `${FORM_DRAFT_PREFIX}${companyId}:${userId}:${formKey}` : null;
  const snapshot = useMemo(() => readDraft<T>(key, ttlMs), [key, ttlMs]);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [clearedKey, setClearedKey] = useState<string | null>(null);
  let serialized: string | null = null;
  try {
    const data = { ...state };
    omit.forEach(field => delete data[field]);
    serialized = JSON.stringify(data);
  } catch { serialized = null; }
  const latest = useRef({ key, enabled, serialized });
  latest.current = { key, enabled, serialized };
  const blocked = useRef(false);
  const clearedData = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    clearedData.current = latest.current.serialized;
    setSavedKey(null);
    setClearedKey(key);
    try { if (key) sessionStorage.removeItem(key); } catch { return; }
  }, [key]);

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    const current = latest.current;
    if (!key || current.key !== key || !current.enabled || !current.serialized || blocked.current || clearedData.current === current.serialized) return;
    try {
      sessionStorage.setItem(key, `{"v":1,"savedAt":${Date.now()},"data":${current.serialized}}`);
      setSavedKey(key);
    } catch { return; }
  }, [key]);

  useEffect(() => {
    blocked.current = false;
    clearedData.current = null;
  }, [key]);

  useEffect(() => {
    const cancel = (event: Event) => {
      const targetKey = (event as CustomEvent<string>).detail;
      if (targetKey && targetKey !== key) return;
      if (!targetKey) blocked.current = true;
      clear();
    };
    window.addEventListener(CLEAR_EVENT, cancel);
    return () => window.removeEventListener(CLEAR_EVENT, cancel);
  }, [key, clear]);

  useEffect(() => {
    if (!enabled || !key) return;
    timer.current = setTimeout(flush, 300);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [enabled, key, serialized, flush]);

  useEffect(() => {
    if (!enabled || !key) return;
    const hide = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('pagehide', flush);
    window.addEventListener('agendix:before-reload', flush);
    document.addEventListener('visibilitychange', hide);
    return () => {
      flush();
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('agendix:before-reload', flush);
      document.removeEventListener('visibilitychange', hide);
    };
  }, [enabled, key, flush]);

  const restored = clearedKey === key ? null : snapshot;
  return { restored, clear, hasDraft: (savedKey === key && key !== null) || !!restored };
}
