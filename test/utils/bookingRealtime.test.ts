import { describe, expect, it } from 'vitest';
import {
  applyBookingStatusEvent,
  mergePendingPublicBooking,
  parseBookingRealtimeEvent,
} from '@/utils/bookingRealtime';

describe('parseBookingRealtimeEvent', () => {
  it('aceita só id, status, appointment_time, op e at', () => {
    const parsed = parseBookingRealtimeEvent({
      id: 'bk-1',
      status: 'confirmed',
      appointment_time: '2026-10-10T14:00:00.000Z',
      op: 'UPDATE',
      at: '2026-10-03T12:00:00.000Z',
      customer_name: 'Maria',
      customer_phone: '11999998888',
      total_price: 80,
    });
    expect(parsed).toEqual({
      id: 'bk-1',
      status: 'confirmed',
      appointment_time: '2026-10-10T14:00:00.000Z',
      op: 'UPDATE',
      at: '2026-10-03T12:00:00.000Z',
    });
    expect(parsed).not.toHaveProperty('customer_name');
    expect(parsed).not.toHaveProperty('customer_phone');
    expect(parsed).not.toHaveProperty('total_price');
  });

  it('rejeita payload sem id ou status', () => {
    expect(parseBookingRealtimeEvent({ status: 'confirmed' })).toBeNull();
    expect(parseBookingRealtimeEvent({ id: 'bk-1' })).toBeNull();
    expect(parseBookingRealtimeEvent(null)).toBeNull();
  });
});

describe('applyBookingStatusEvent', () => {
  const bookings = [
    { id: 'a', status: 'pending', appointment_time: '2026-10-10T14:00:00.000Z', name: 'Ana' },
    { id: 'b', status: 'pending', appointment_time: '2026-10-11T14:00:00.000Z', name: 'Bia' },
  ];

  it('atualiza só o booking do id do evento', () => {
    const next = applyBookingStatusEvent(bookings, {
      id: 'a',
      status: 'confirmed',
      appointment_time: '2026-10-10T15:00:00.000Z',
      op: 'UPDATE',
    });
    expect(next[0]).toMatchObject({ id: 'a', status: 'confirmed', appointment_time: '2026-10-10T15:00:00.000Z', name: 'Ana' });
    expect(next[1]).toBe(bookings[1]);
  });

  it('não cria card de outro cliente', () => {
    const next = applyBookingStatusEvent(bookings, {
      id: 'zzz',
      status: 'confirmed',
      appointment_time: '2026-10-10T14:00:00.000Z',
      op: 'UPDATE',
    });
    expect(next).toEqual(bookings);
  });
});

describe('mergePendingPublicBooking', () => {
  it('insere solicitação nova pending', () => {
    const row = { id: 'n1', status: 'pending', customer_name: 'Carla' };
    expect(mergePendingPublicBooking([], row)).toEqual([row]);
  });

  it('não duplica o mesmo id', () => {
    const current = [{ id: 'n1', status: 'pending', customer_name: 'Carla' }];
    const next = mergePendingPublicBooking(current, { id: 'n1', status: 'pending', customer_name: 'Carla Nunes' });
    expect(next).toHaveLength(1);
    expect(next[0].customer_name).toBe('Carla Nunes');
  });

  it('remove se o status deixar de ser pending', () => {
    const current = [{ id: 'n1', status: 'pending' }];
    expect(mergePendingPublicBooking(current, { id: 'n1', status: 'confirmed' })).toEqual([]);
  });
});
