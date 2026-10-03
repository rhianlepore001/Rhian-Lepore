import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  BOOKING_LIVE_POLL_MS,
  PUBLIC_BOOKING_CHANGE_LIVE_EVENT,
} from '@/utils/bookingRealtime';

const UNHEALTHY = new Set(['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED']);

type PostgresChangePayload = {
  eventType?: string;
  new?: Record<string, unknown> | null;
};

function asInsertRow(payload: PostgresChangePayload | undefined): Record<string, unknown> | null {
  if (!payload?.new || typeof payload.new !== 'object') return null;
  if (payload.eventType && payload.eventType !== 'INSERT' && payload.eventType !== '*') return null;
  return payload.new;
}

export function usePendingPublicBookingsLive(
  businessId: string | null | undefined,
  onRefresh: () => void,
  enabled = true,
  onInsert?: (row: Record<string, unknown>) => void,
): { healthy: boolean | null } {
  const [healthy, setHealthy] = useState<boolean | null>(null);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;
  const onInsertRef = useRef(onInsert);
  onInsertRef.current = onInsert;

  useEffect(() => {
    if (!enabled || !businessId) {
      setHealthy(null);
      return;
    }

    let alive = true;

    const applyPayload = (payload: PostgresChangePayload | undefined) => {
      const row = asInsertRow(payload);
      if (row && row.status === 'pending') {
        const rowBusinessId = typeof row.business_id === 'string' ? row.business_id : null;
        if (!rowBusinessId || rowBusinessId === businessId) {
          onInsertRef.current?.(row);
        }
      }
      onRefreshRef.current();
    };

    const channel = supabase
      .channel('public_bookings_agenda')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'public_bookings',
          filter: `business_id=eq.${businessId}`,
        },
        (payload) => applyPayload(payload as PostgresChangePayload),
      )
      .subscribe((status) => {
        if (!alive) return;
        if (status === 'SUBSCRIBED') setHealthy(true);
        else if (UNHEALTHY.has(status)) {
          setHealthy(false);
          onRefreshRef.current();
        }
      });

    const onVisible = () => {
      if (document.visibilityState === 'visible') onRefreshRef.current();
    };
    const onOnline = () => onRefreshRef.current();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);

    let detachTest: (() => void) | undefined;
    if (import.meta.env.DEV) {
      const onTestEvent = (nativeEvent: Event) => {
        applyPayload((nativeEvent as CustomEvent).detail as PostgresChangePayload);
      };
      window.addEventListener(PUBLIC_BOOKING_CHANGE_LIVE_EVENT, onTestEvent);
      detachTest = () => window.removeEventListener(PUBLIC_BOOKING_CHANGE_LIVE_EVENT, onTestEvent);
    }

    return () => {
      alive = false;
      setHealthy(null);
      detachTest?.();
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
      void supabase.removeChannel(channel);
    };
  }, [businessId, enabled]);

  useEffect(() => {
    if (!enabled || !businessId || healthy !== false) return;
    const timer = window.setInterval(() => onRefreshRef.current(), BOOKING_LIVE_POLL_MS);
    return () => window.clearInterval(timer);
  }, [businessId, enabled, healthy]);

  return { healthy };
}
