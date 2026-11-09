import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => {
  const inserted: unknown[] = [];
  const rpc = vi.fn();
  const productsSelect = vi.fn();
  const from = vi.fn((table: string) => {
    if (table === 'products') {
      // Staff can no longer read product rows (cost_price) after the products migration.
      productsSelect();
      const empty = { data: [], error: null };
      const chain: any = { select: () => chain, eq: () => chain, in: () => Promise.resolve(empty) };
      return chain;
    }
    return {
      delete: () => ({ eq: () => ({ eq: () => Promise.resolve({ error: null }) }) }),
      insert: (rows: unknown[]) => {
        inserted.push(...rows);
        return { select: () => Promise.resolve({ data: rows.map((r: any, i) => ({ id: `00000000-0000-4000-8000-00000000000${i}`, ...r })), error: null }) };
      },
    };
  });
  return { inserted, rpc, from, productsSelect };
});

vi.mock('@/lib/supabase', () => ({ supabase: { from: m.from, rpc: m.rpc } }));

import { setAppointmentProductLines } from '@/services/catalog';

const company = '22222222-2222-4222-8222-222222222222';
const appointment = '33333333-3333-4333-8333-333333333333';
const pomada = '11111111-1111-4111-8111-111111111111';
const cera = '44444444-4444-4444-8444-444444444444';

describe('setAppointmentProductLines — preço de venda sem ler custo', () => {
  beforeEach(() => { m.inserted.length = 0; m.rpc.mockReset(); m.productsSelect.mockReset(); });

  it('salva o preço de venda vindo da RPC sem custo, nunca R$ 0', async () => {
    m.rpc.mockResolvedValue({ data: [{ id: pomada, name: 'Pomada', sale_price: 35 }, { id: cera, name: 'Cera', sale_price: 22.5 }], error: null });
    await setAppointmentProductLines({ companyId: company, appointmentId: appointment, lines: [{ productId: pomada, quantity: 2 }, { productId: cera, quantity: 1 }] });
    expect(m.rpc).toHaveBeenCalledWith('get_product_sale_prices_v1', { p_product_ids: [pomada, cera] });
    expect(m.productsSelect).not.toHaveBeenCalled();
    expect(m.inserted).toEqual([
      expect.objectContaining({ product_id: pomada, quantity: 2, unit_sale_price: 35 }),
      expect.objectContaining({ product_id: cera, quantity: 1, unit_sale_price: 22.5 }),
    ]);
  });

  it('falha em vez de salvar R$ 0 quando um preço não vem', async () => {
    m.rpc.mockResolvedValue({ data: [{ id: pomada, name: 'Pomada', sale_price: 35 }], error: null });
    await expect(setAppointmentProductLines({ companyId: company, appointmentId: appointment, lines: [{ productId: pomada, quantity: 1 }, { productId: cera, quantity: 1 }] }))
      .rejects.toThrow(/product_price_unavailable/);
    expect(m.inserted).toEqual([]);
  });
});
