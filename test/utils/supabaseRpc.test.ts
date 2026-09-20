import { describe, expect, it } from 'vitest';
import { isMissingRpcError, isSlotUnavailableError } from '@/utils/supabaseRpc';

describe('supabaseRpc helpers', () => {
  it('detecta RPC ausente por código PostgREST/Postgres', () => {
    expect(isMissingRpcError({ code: 'PGRST202' })).toBe(true);
    expect(isMissingRpcError({ code: '42883' })).toBe(true);
    expect(isMissingRpcError({ message: 'Could not find the function public.create_public_booking' })).toBe(true);
    expect(isMissingRpcError({ message: 'slot_unavailable' })).toBe(false);
  });

  it('detecta conflito de slot', () => {
    expect(isSlotUnavailableError({ message: 'slot_unavailable' })).toBe(true);
    expect(isSlotUnavailableError({ message: 'booking_not_cancellable' })).toBe(false);
  });
});
