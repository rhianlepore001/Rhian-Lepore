import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
  BOOKING_LIVE_POLL_MS,
  BOOKING_STATUS_LIVE_EVENT,
  bookingRealtimeTopic,
} from '@/utils/bookingRealtime';

type StatusCb = (status: string) => void;
type BroadcastCb = (message: { payload: unknown }) => void;

const channels = new Map<string, { broadcast?: BroadcastCb; status?: StatusCb; api: Record<string, unknown> }>();
const removeChannel = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    channel: (name: string, opts?: { config?: { private?: boolean } }) => {
      const api: Record<string, unknown> = {};
      const entry: { broadcast?: BroadcastCb; status?: StatusCb; api: Record<string, unknown>; private?: boolean } = {
        api,
        private: opts?.config?.private,
      };
      api.on = vi.fn((_type: string, _filter: unknown, cb: BroadcastCb) => {
        entry.broadcast = cb;
        return api;
      });
      api.subscribe = vi.fn((cb?: StatusCb) => {
        entry.status = cb;
        cb?.('SUBSCRIBED');
        return api;
      });
      channels.set(name, entry);
      return api;
    },
    removeChannel: (...args: unknown[]) => removeChannel(...args),
  },
}));

import { useBookingStatusLive } from '@/hooks/useBookingStatusLive';

const ID_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const ID_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

describe('useBookingStatusLive', () => {
  beforeEach(() => {
    channels.clear();
    removeChannel.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('broadcast atualiza o estado do card correspondente', () => {
    const onEvent = vi.fn();
    const onRefetch = vi.fn();
    renderHook(() => useBookingStatusLive([ID_A], onEvent, onRefetch));

    const topic = bookingRealtimeTopic(ID_A);
    expect(channels.get(topic)?.api).toBeTruthy();

    act(() => {
      channels.get(topic)?.broadcast?.({
        payload: {
          id: ID_A,
          status: 'confirmed',
          appointment_time: '2026-10-10T14:00:00.000Z',
          op: 'UPDATE',
          at: '2026-10-03T12:00:01.000Z',
        },
      });
    });

    expect(onEvent).toHaveBeenCalledWith({
      id: ID_A,
      status: 'confirmed',
      appointment_time: '2026-10-10T14:00:00.000Z',
      op: 'UPDATE',
      at: '2026-10-03T12:00:01.000Z',
    });
    expect(onRefetch).not.toHaveBeenCalled();
  });

  it('dois bookings: evento de um não mexe no outro', () => {
    const onEvent = vi.fn();
    renderHook(() => useBookingStatusLive([ID_A, ID_B], onEvent, vi.fn()));

    act(() => {
      channels.get(bookingRealtimeTopic(ID_A))?.broadcast?.({
        payload: { id: ID_A, status: 'cancelled', appointment_time: '2026-10-10T14:00:00.000Z', op: 'UPDATE' },
      });
    });

    expect(onEvent).toHaveBeenCalledTimes(1);
    expect(onEvent.mock.calls[0][0].id).toBe(ID_A);
    expect(channels.has(bookingRealtimeTopic(ID_B))).toBe(true);
  });

  it('dois ids: um CHANNEL_ERROR e o outro SUBSCRIBED mantém o polling', () => {
    const onRefetch = vi.fn();
    renderHook(() => useBookingStatusLive([ID_A, ID_B], vi.fn(), onRefetch));

    act(() => {
      channels.get(bookingRealtimeTopic(ID_A))?.status?.('CHANNEL_ERROR');
    });
    expect(onRefetch).toHaveBeenCalled();

    act(() => {
      channels.get(bookingRealtimeTopic(ID_B))?.status?.('SUBSCRIBED');
    });
    onRefetch.mockClear();
    act(() => {
      vi.advanceTimersByTime(BOOKING_LIVE_POLL_MS);
    });
    expect(onRefetch).toHaveBeenCalledTimes(1);
  });

  it('CHANNEL_ERROR dispara refetch e polling a cada 30s até o canal voltar', () => {
    const onRefetch = vi.fn();
    renderHook(() => useBookingStatusLive([ID_A], vi.fn(), onRefetch));
    const topic = bookingRealtimeTopic(ID_A);

    act(() => {
      channels.get(topic)?.status?.('CHANNEL_ERROR');
    });
    expect(onRefetch).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(BOOKING_LIVE_POLL_MS);
    });
    expect(onRefetch).toHaveBeenCalledTimes(2);

    act(() => {
      channels.get(topic)?.status?.('SUBSCRIBED');
    });
    onRefetch.mockClear();
    act(() => {
      vi.advanceTimersByTime(BOOKING_LIVE_POLL_MS * 2);
    });
    expect(onRefetch).not.toHaveBeenCalled();
  });

  it('visibilitychange visível refaz a leitura', () => {
    const onRefetch = vi.fn();
    renderHook(() => useBookingStatusLive([ID_A], vi.fn(), onRefetch));

    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(onRefetch).toHaveBeenCalledTimes(1);
  });

  it('evento de teste (E2E) atualiza o card sem websocket', () => {
    const onEvent = vi.fn();
    renderHook(() => useBookingStatusLive([ID_A], onEvent, vi.fn()));

    act(() => {
      window.dispatchEvent(new CustomEvent(BOOKING_STATUS_LIVE_EVENT, {
        detail: { id: ID_A, status: 'completed', appointment_time: '2026-10-10T14:00:00.000Z', op: 'UPDATE' },
      }));
    });
    expect(onEvent.mock.calls[0][0].status).toBe('completed');
  });

  it('broadcast de no_show chega ao card', () => {
    const onEvent = vi.fn();
    renderHook(() => useBookingStatusLive([ID_A], onEvent, vi.fn()));
    act(() => {
      channels.get(bookingRealtimeTopic(ID_A))?.broadcast?.({
        payload: { id: ID_A, status: 'no_show', appointment_time: '2026-10-10T14:00:00.000Z', op: 'UPDATE' },
      });
    });
    expect(onEvent.mock.calls[0][0].status).toBe('no_show');
  });

  it('cleanup remove canais e ignora eventos depois do unmount', () => {
    const onEvent = vi.fn();
    const onRefetch = vi.fn();
    const { unmount } = renderHook(() => useBookingStatusLive([ID_A, ID_B], onEvent, onRefetch));
    expect(removeChannel).not.toHaveBeenCalled();

    unmount();
    expect(removeChannel).toHaveBeenCalledTimes(2);

    act(() => {
      window.dispatchEvent(new CustomEvent(BOOKING_STATUS_LIVE_EVENT, {
        detail: { id: ID_A, status: 'confirmed', appointment_time: '2026-10-10T14:00:00.000Z', op: 'UPDATE' },
      }));
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(onEvent).not.toHaveBeenCalled();
    expect(onRefetch).not.toHaveBeenCalled();
  });
});
