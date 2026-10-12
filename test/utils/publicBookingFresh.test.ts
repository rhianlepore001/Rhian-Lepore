import { describe, it, expect } from 'vitest';
import { mergeFreshPublicBooking } from '../../utils/publicBookingFresh';

const created = {
  id: 'b1', status: 'pending', appointment_time: '2026-10-20T10:00:00Z', is_edit: false,
  original_appointment_time: null, created_at: '2026-10-11T20:00:00Z', product_lines: [{ product_id: 'p1', quantity: 1 }],
  customer_phone: '351910000101', total_price: 35, service_ids: ['s1'],
};

describe('mergeFreshPublicBooking (polling da tela de sucesso)', () => {
  it('atualiza o status quando o dono aceita (pending -> confirmed)', () => {
    const next = mergeFreshPublicBooking(created, { id: 'b1', status: 'confirmed', appointment_time: created.appointment_time });
    expect(next).toMatchObject({ id: 'b1', status: 'confirmed' });
  });

  it('mantém campos que a RPC de polling não devolve (is_edit, original_appointment_time, created_at, product_lines)', () => {
    const editing = { ...created, is_edit: true, original_appointment_time: '2026-10-19T10:00:00Z' };
    const next = mergeFreshPublicBooking(editing, { id: 'b1', status: 'pending', business_id: 'biz' });
    expect(next).toMatchObject({
      is_edit: true, original_appointment_time: '2026-10-19T10:00:00Z',
      created_at: created.created_at, product_lines: created.product_lines, business_id: 'biz',
    });
  });

  it('não apaga campos com null/undefined vindos da resposta', () => {
    const next = mergeFreshPublicBooking(created, { id: 'b1', status: 'confirmed', total_price: null, customer_phone: undefined });
    expect(next).toMatchObject({ status: 'confirmed', total_price: 35, customer_phone: '351910000101' });
  });

  it('ignora resposta de outro pedido', () => {
    expect(mergeFreshPublicBooking(created, { id: 'b2', status: 'cancelled' })).toBe(created);
  });

  it('sem resposta mantém o pedido; sem pedido usa a resposta', () => {
    expect(mergeFreshPublicBooking(created, null)).toBe(created);
    expect(mergeFreshPublicBooking(null, { id: 'b1', status: 'pending' })).toEqual({ id: 'b1', status: 'pending' });
  });
});
