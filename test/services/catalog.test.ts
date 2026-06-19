import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const product = {
    id: '11111111-1111-4111-8111-111111111111',
    company_id: '22222222-2222-4222-8222-222222222222',
    name: 'Pomada',
    sale_price: 50,
    cost_price: 20,
    stock_quantity: 10,
    min_stock_quantity: 2,
    is_active: true,
  };

  const sale = {
    id: '33333333-3333-4333-8333-333333333333',
    company_id: product.company_id,
    product_id: product.id,
    appointment_id: null,
    finance_record_id: '44444444-4444-4444-8444-444444444444',
    sold_by: '55555555-5555-4555-8555-555555555555',
    quantity: 2,
    unit_sale_price: 50,
    unit_cost_price: 20,
    total_revenue: 100,
    total_cost: 40,
  };

  const singleMock = vi.fn();
  const selectAfterInsertMock = vi.fn(() => ({ single: singleMock }));
  const insertMock = vi.fn(() => ({ select: selectAfterInsertMock }));
  const updateSelectMock = vi.fn(() => ({ single: singleMock }));
  const updateEqCompanyMock = vi.fn(() => ({ select: updateSelectMock }));
  const updateEqIdMock = vi.fn(() => ({ eq: updateEqCompanyMock }));
  const updateMock = vi.fn(() => ({ eq: updateEqIdMock }));
  const orderMock = vi.fn().mockResolvedValue({ data: [product], error: null });
  const activeEqMock = vi.fn(() => ({ order: orderMock }));
  const companyEqMock = vi.fn(() => ({ order: orderMock, eq: activeEqMock }));
  const selectMock = vi.fn(() => ({ eq: companyEqMock }));
  const rpcMock = vi.fn().mockResolvedValue({ data: sale, error: null });

  return {
    product,
    sale,
    singleMock,
    insertMock,
    updateMock,
    updateEqIdMock,
    updateEqCompanyMock,
    orderMock,
    activeEqMock,
    companyEqMock,
    selectMock,
    rpcMock,
  };
});

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mocks.selectMock,
      insert: mocks.insertMock,
      update: mocks.updateMock,
    })),
    rpc: mocks.rpcMock,
  },
}));

import { createProduct, listProducts, sellProduct, updateProduct } from '@/services/catalog';
import { supabase } from '@/lib/supabase';

const { product, sale } = mocks;

describe('catalog service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.singleMock.mockResolvedValue({ data: product, error: null });
    mocks.orderMock.mockResolvedValue({ data: [product], error: null });
    (supabase.rpc as any).mockResolvedValue({ data: sale, error: null });
  });

  it('lista produtos ativos por company_id', async () => {
    const result = await listProducts({ companyId: product.company_id });

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Pomada');
    expect(supabase.from).toHaveBeenCalledWith('products');
    expect(mocks.companyEqMock).toHaveBeenCalledWith('company_id', product.company_id);
    expect(mocks.activeEqMock).toHaveBeenCalledWith('is_active', true);
  });

  it('cria produto ativo com estoque inicial', async () => {
    const result = await createProduct({
      companyId: product.company_id,
      name: 'Pomada',
      salePrice: 50,
      costPrice: 20,
      stockQuantity: 10,
      minStockQuantity: 2,
    });

    expect(result.id).toBe(product.id);
    expect(mocks.insertMock).toHaveBeenCalledWith({
      company_id: product.company_id,
      name: 'Pomada',
      sale_price: 50,
      cost_price: 20,
      stock_quantity: 10,
      min_stock_quantity: 2,
      is_active: true,
    });
  });

  it('atualiza produto dentro do tenant', async () => {
    await updateProduct({
      companyId: product.company_id,
      productId: product.id,
      salePrice: 60,
      isActive: false,
    });

    expect(mocks.updateMock).toHaveBeenCalledWith({
      sale_price: 60,
      is_active: false,
    });
    expect(mocks.updateEqIdMock).toHaveBeenCalledWith('id', product.id);
    expect(mocks.updateEqCompanyMock).toHaveBeenCalledWith('company_id', product.company_id);
  });

  it('vende produto por RPC atomica', async () => {
    const result = await sellProduct({
      productId: product.id,
      quantity: 2,
      appointmentId: null,
    });

    expect(result.total_revenue).toBe(100);
    expect(supabase.rpc).toHaveBeenCalledWith('sell_product', {
      p_product_id: product.id,
      p_quantity: 2,
      p_appointment_id: null,
    });
  });
});
