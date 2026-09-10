import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  parseQueueRealtimeEvent,
  QUEUE_REALTIME_EVENT,
  queueRealtimeTopic,
  type QueueRealtimeEvent,
} from '@/utils/queueRealtime';

export type { QueueRealtimeEvent };
export { parseQueueRealtimeEvent, QUEUE_REALTIME_EVENT, queueRealtimeTopic };

/**
 * Assina o broadcast da fila de um estabelecimento. Funciona para o cliente anônimo
 * (área pública) e para o gestor. O polling das queries continua como fallback.
 */
export function useQueueRealtime(
  businessId: string | null | undefined,
  onEvent: (event: QueueRealtimeEvent) => void,
  enabled = true,
): { connected: boolean } {
  const [connected, setConnected] = useState(false);
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    if (!businessId || !enabled) {
      setConnected(false);
      return;
    }

    const channel = supabase
      .channel(queueRealtimeTopic(businessId), { config: { private: true } })
      .on('broadcast', { event: QUEUE_REALTIME_EVENT }, (message) => {
        const event = parseQueueRealtimeEvent((message as { payload?: unknown }).payload);
        if (event) handlerRef.current(event);
      })
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED');
      });

    return () => {
      setConnected(false);
      void supabase.removeChannel(channel);
    };
  }, [businessId, enabled]);

  return { connected };
}
