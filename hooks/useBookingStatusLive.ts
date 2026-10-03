import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  BOOKING_LIVE_POLL_MS,
  BOOKING_REALTIME_EVENT,
  BOOKING_STATUS_LIVE_EVENT,
  bookingRealtimeTopic,
  parseBookingRealtimeEvent,
  type BookingRealtimeEvent,
} from '@/utils/bookingRealtime';

const UNHEALTHY = new Set(['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED']);

export type { BookingRealtimeEvent };
export { BOOKING_LIVE_POLL_MS, BOOKING_REALTIME_EVENT, bookingRealtimeTopic, parseBookingRealtimeEvent };

export function useBookingStatusLive(
  bookingIds: readonly string[],
  onEvent: (event: BookingRealtimeEvent) => void,
  onRefetch: () => void,
  enabled = true,
): { healthy: boolean | null } {
  const [healthy, setHealthy] = useState<boolean | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const onRefetchRef = useRef(onRefetch);
  onRefetchRef.current = onRefetch;
  const idsKey = bookingIds.filter(Boolean).slice().sort().join('\0');

  useEffect(() => {
    if (!enabled || !idsKey) {
      setHealthy(null);
      return;
    }

    const ids = idsKey.split('\0');
    let alive = true;
    const healthById = new Map<string, boolean>();

    const recomputeHealth = () => {
      if (!alive) return;
      const states = ids.map((id) => healthById.get(id));
      if (states.some((state) => state === false)) setHealthy(false);
      else if (states.every((state) => state === true)) setHealthy(true);
    };

    const channels = ids.map((id) =>
      supabase
        .channel(bookingRealtimeTopic(id), { config: { private: true } })
        .on('broadcast', { event: BOOKING_REALTIME_EVENT }, (message) => {
          const event = parseBookingRealtimeEvent((message as { payload?: unknown }).payload);
          if (event && event.id === id) onEventRef.current(event);
        })
        .subscribe((status) => {
          if (!alive) return;
          if (status === 'SUBSCRIBED') healthById.set(id, true);
          else if (UNHEALTHY.has(status)) {
            healthById.set(id, false);
            onRefetchRef.current();
          } else {
            return;
          }
          recomputeHealth();
        }),
    );

    const onVisible = () => {
      if (document.visibilityState === 'visible') onRefetchRef.current();
    };
    const onOnline = () => onRefetchRef.current();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);

    let detachTest: (() => void) | undefined;
    if (import.meta.env.DEV) {
      const onTestEvent = (nativeEvent: Event) => {
        const event = parseBookingRealtimeEvent((nativeEvent as CustomEvent).detail);
        if (event && ids.includes(event.id)) onEventRef.current(event);
      };
      window.addEventListener(BOOKING_STATUS_LIVE_EVENT, onTestEvent);
      detachTest = () => window.removeEventListener(BOOKING_STATUS_LIVE_EVENT, onTestEvent);
    }

    return () => {
      alive = false;
      setHealthy(null);
      detachTest?.();
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
      channels.forEach((channel) => {
        void supabase.removeChannel(channel);
      });
    };
  }, [enabled, idsKey]);

  useEffect(() => {
    if (!enabled || !idsKey || healthy !== false) return;
    const timer = window.setInterval(() => onRefetchRef.current(), BOOKING_LIVE_POLL_MS);
    return () => window.clearInterval(timer);
  }, [enabled, idsKey, healthy]);

  return { healthy };
}
