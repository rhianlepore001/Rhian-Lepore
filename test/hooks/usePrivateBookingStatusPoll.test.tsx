import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePrivateBookingStatusPoll } from '@/hooks/usePrivateBookingStatusPoll';
import { fetchPublicBookingById } from '@/services/publicBooking';
vi.mock('@/services/publicBooking', () => ({ fetchPublicBookingById: vi.fn() }));
const token = 'a'.repeat(64);
describe('anonymous pending confirmation polling', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.resetAllMocks(); });
  afterEach(() => vi.useRealTimers());
  it('confirms via the private token while retaining it and stops after confirmation', async () => {
    let booking: any = { id: 'booking-a', status: 'pending', management_token: token };
    vi.mocked(fetchPublicBookingById).mockResolvedValue({ id: 'booking-a', status: 'confirmed' } as any);
    const update = vi.fn(fn => { booking = fn(booking); });
    const { rerender, unmount } = renderHook(({ current }) => usePrivateBookingStatusPoll(current, 'business-a', '', update), { initialProps: { current: booking } });
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(fetchPublicBookingById).toHaveBeenCalledWith('booking-a', 'business-a', token);
    expect(booking).toMatchObject({ status: 'confirmed', management_token: token });
    rerender({ current: booking });
    await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
    expect(fetchPublicBookingById).toHaveBeenCalledTimes(1);
    unmount();
  });
  it('does not fetch legacy bookings without a token', async () => {
    renderHook(() => usePrivateBookingStatusPoll({ id: 'old', status: 'pending' }, 'business-a', '', vi.fn()));
    await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
    expect(fetchPublicBookingById).not.toHaveBeenCalled();
  });
  it('ignores an in-flight result after unmount', async () => {
    let complete!: (value: any) => void;
    vi.mocked(fetchPublicBookingById).mockReturnValue(new Promise(resolve => { complete = resolve; }));
    const update = vi.fn();
    const { unmount } = renderHook(() => usePrivateBookingStatusPoll({ id: 'a', status: 'pending', management_token: token }, 'business-a', '', update));
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    unmount();
    await act(async () => { complete({ id: 'a', status: 'confirmed' }); });
    expect(update).not.toHaveBeenCalled();
  });
});
