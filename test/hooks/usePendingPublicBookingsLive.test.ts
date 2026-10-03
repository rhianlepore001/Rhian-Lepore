import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { BOOKING_LIVE_POLL_MS, PUBLIC_BOOKING_CHANGE_LIVE_EVENT } from '@/utils/bookingRealtime';

type StatusCb = (status: string) => void;
type ChangeCb = (payload: { eventType: string; new: Record<string, unknown> }) => void;

let postgresCb: ChangeCb | undefined;
let statusCb: StatusCb | undefined;
let lastFilter: { event?: string; table?: string; filter?: string } | undefined;
const removeChannel = vi.fn();
const channelApi: Record<string, unknown> = {};

vi.mock('@/lib/supabase', () => ({
  supabase: {
    channel: () => {
      channelApi.on = vi.fn((_type: string, filter: { event?: string; table?: string; filter?: string }, cb: ChangeCb) => {
        lastFilter = filter;
        postgresCb = cb;
        return channelApi;
      });
      channelApi.subscribe = vi.fn((cb?: StatusCb) => {
        statusCb = cb;
        cb?.('SUBSCRIBED');
        return channelApi;
      });
      return channelApi;
    },
    removeChannel: (...args: unknown[]) => removeChannel(...args),
  },
}));

import { usePendingPublicBookingsLive } from '@/hooks/usePendingPublicBookingsLive';
import { mergePendingPublicBooking } from '@/utils/bookingRealtime';

const BIZ = '2310b54d-5963-4dc6-9afb-8f308116a698';
const NEW_ROW = {
  id: 'pb-new',
  business_id: BIZ,
  status: 'pending',
  customer_name: 'Ana Nova',
  customer_phone: '11988887777',
  appointment_time: '2026-10-12T14:00:00.000Z',
  total_price: 40,
};

describe('usePendingPublicBookingsLive', () => {
  beforeEach(() => {
    postgresCb = undefined;
    statusCb = undefined;
    lastFilter = undefined;
    removeChannel.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('INSERT de outro tenant não entra na lista; o da empresa aparece sem reload', () => {
    const onRefresh = vi.fn();
    let list: typeof NEW_ROW[] = [];
    const onInsert = vi.fn((row: Record<string, unknown>) => {
      list = mergePendingPublicBooking(list, row as typeof NEW_ROW);
    });

    renderHook(() => usePendingPublicBookingsLive(BIZ, onRefresh, true, onInsert));

    expect(lastFilter).toMatchObject({
      event: '*',
      table: 'public_bookings',
      filter: `business_id=eq.${BIZ}`,
    });

    act(() => {
      postgresCb?.({
        eventType: 'INSERT',
        new: { ...NEW_ROW, business_id: 'other-biz', customer_name: 'Intrusa' },
      });
    });
    expect(onInsert).not.toHaveBeenCalled();
    expect(list).toEqual([]);
    expect(onRefresh).toHaveBeenCalledTimes(1);

    act(() => {
      postgresCb?.({ eventType: 'INSERT', new: NEW_ROW });
    });
    expect(list).toHaveLength(1);
    expect(list[0].customer_name).toBe('Ana Nova');
    expect(onRefresh).toHaveBeenCalledTimes(2);
  });

  it('erro do canal refaz a lista e faz fallback de 30s', () => {
    const onRefresh = vi.fn();
    renderHook(() => usePendingPublicBookingsLive(BIZ, onRefresh));

    act(() => {
      statusCb?.('TIMED_OUT');
    });
    expect(onRefresh).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(BOOKING_LIVE_POLL_MS);
    });
    expect(onRefresh).toHaveBeenCalledTimes(2);
  });

  it('volta do background refaz a leitura', () => {
    const onRefresh = vi.fn();
    renderHook(() => usePendingPublicBookingsLive(BIZ, onRefresh));
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('evento E2E insere solicitação na lista', () => {
    const onRefresh = vi.fn();
    const onInsert = vi.fn();
    renderHook(() => usePendingPublicBookingsLive(BIZ, onRefresh, true, onInsert));

    act(() => {
      window.dispatchEvent(new CustomEvent(PUBLIC_BOOKING_CHANGE_LIVE_EVENT, {
        detail: { eventType: 'INSERT', new: NEW_ROW },
      }));
    });
    expect(onInsert).toHaveBeenCalledWith(NEW_ROW);
    expect(onRefresh).toHaveBeenCalled();
  });

  it('cleanup remove o canal', () => {
    const { unmount } = renderHook(() => usePendingPublicBookingsLive(BIZ, vi.fn()));
    unmount();
    expect(removeChannel).toHaveBeenCalledTimes(1);
  });
});
