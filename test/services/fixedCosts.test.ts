import { describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ supabase: { from: state.from } }));
import { fixedCostsApi } from '../../services/fixedCosts';

describe('custos fixos', () => {
  it('carrega o limite privado da empresa e usa o valor inicial quando não existe configuração', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const settingsEq = vi.fn().mockReturnValue({ maybeSingle });
    const settingsSelect = vi.fn().mockReturnValue({ eq: settingsEq });
    const genericResult = { data: [], error: null };
    const query: { eq: ReturnType<typeof vi.fn>; order: ReturnType<typeof vi.fn>; then: Promise<typeof genericResult>['then'] } = {
      eq: vi.fn(), order: vi.fn(), then: Promise.resolve(genericResult).then.bind(Promise.resolve(genericResult)),
    };
    query.eq.mockReturnValue(query);
    query.order.mockResolvedValue(genericResult);
    state.from.mockImplementation(table => table === 'chair_hour_settings' ? { select: settingsSelect } : { select: vi.fn().mockReturnValue(query) });

    const result = await fixedCostsApi.list('empresa');
    expect(result.lowMargin).toBe(20);
    expect(result.lowMarginSaved).toBe(false);
    expect(settingsSelect).toHaveBeenCalledWith('low_margin_pct');
    expect(settingsEq).toHaveBeenCalledWith('company_id', 'empresa');
  });

  it('lowMarginSaved true quando já existe linha em chair_hour_settings', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { low_margin_pct: 20 }, error: null });
    const settingsEq = vi.fn().mockReturnValue({ maybeSingle });
    const settingsSelect = vi.fn().mockReturnValue({ eq: settingsEq });
    const genericResult = { data: [], error: null };
    const query: { eq: ReturnType<typeof vi.fn>; order: ReturnType<typeof vi.fn>; then: Promise<typeof genericResult>['then'] } = {
      eq: vi.fn(), order: vi.fn(), then: Promise.resolve(genericResult).then.bind(Promise.resolve(genericResult)),
    };
    query.eq.mockReturnValue(query);
    query.order.mockResolvedValue(genericResult);
    state.from.mockImplementation(table => table === 'chair_hour_settings' ? { select: settingsSelect } : { select: vi.fn().mockReturnValue(query) });

    const result = await fixedCostsApi.list('empresa');
    expect(result.lowMarginSaved).toBe(true);
    expect(result.lowMargin).toBe(20);
  });

  it('salva o limite na configuração privada com identificação da empresa', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { company_id: 'empresa' }, error: null });
    const select = vi.fn().mockReturnValue({ maybeSingle });
    const upsert = vi.fn().mockReturnValue({ select });
    state.from.mockReturnValue({ upsert });

    await expect(fixedCostsApi.saveLowMargin('empresa', 15)).resolves.toBeUndefined();
    expect(state.from).toHaveBeenLastCalledWith('chair_hour_settings');
    expect(upsert).toHaveBeenCalledWith({ company_id: 'empresa', low_margin_pct: 15 }, { onConflict: 'company_id' });
  });

  it('sugere somente despesas próprias sem vínculo com atendimento ou venda de produto', async () => {
    const rows = [
      { id: 'despesa', description: 'Aluguel', commission_value: 500, created_at: '2026-01-01', appointment_id: null },
      { id: 'comissao', description: 'Comissão', commission_value: 45, created_at: '2026-01-02', appointment_id: 'atendimento' },
      { id: 'venda', description: 'Venda', commission_value: 25, created_at: '2026-01-03', appointment_id: null },
      { id: 'sem-valor', description: 'Sem valor', commission_value: null, created_at: '2026-01-04', appointment_id: null },
    ];
    const limit = vi.fn().mockResolvedValue({ data: rows, error: null });
    const order = vi.fn().mockReturnValue({ limit });
    const is = vi.fn().mockReturnValue({ order });
    const eqType = vi.fn().mockReturnValue({ is });
    const eqCompany = vi.fn().mockReturnValue({ eq: eqType });
    const financeSelect = vi.fn().mockReturnValue({ eq: eqCompany });
    const inIds = vi.fn().mockResolvedValue({ data: [{ finance_record_id: 'venda' }], error: null });
    const salesCompany = vi.fn().mockReturnValue({ in: inIds });
    const salesSelect = vi.fn().mockReturnValue({ eq: salesCompany });
    state.from.mockImplementation(table => table === 'finance_records' ? { select: financeSelect } : { select: salesSelect });

    await expect(fixedCostsApi.suggestions('empresa')).resolves.toEqual([
      { id: 'despesa', description: 'Aluguel', amount: 500, created_at: '2026-01-01' },
    ]);
    expect(eqCompany).toHaveBeenCalledWith('user_id', 'empresa');
    expect(is).toHaveBeenCalledWith('appointment_id', null);
    expect(salesCompany).toHaveBeenCalledWith('company_id', 'empresa');
  });

  it('não oferece sugestões quando não consegue verificar vínculos com vendas', async () => {
    const limit = vi.fn().mockResolvedValue({ data: [{ id: 'registro', commission_value: 50, appointment_id: null }], error: null });
    const order = vi.fn().mockReturnValue({ limit });
    const is = vi.fn().mockReturnValue({ order });
    const eqType = vi.fn().mockReturnValue({ is });
    const eqCompany = vi.fn().mockReturnValue({ eq: eqType });
    const financeSelect = vi.fn().mockReturnValue({ eq: eqCompany });
    const inIds = vi.fn().mockResolvedValue({ data: null, error: { message: 'consulta indisponível' } });
    const salesCompany = vi.fn().mockReturnValue({ in: inIds });
    const salesSelect = vi.fn().mockReturnValue({ eq: salesCompany });
    state.from.mockImplementation(table => table === 'finance_records' ? { select: financeSelect } : { select: salesSelect });

    await expect(fixedCostsApi.suggestions('empresa')).rejects.toThrow('Não foi possível buscar as despesas.');
  });

  it('não informa sucesso se nenhuma linha da empresa foi atualizada', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const select = vi.fn().mockReturnValue({ maybeSingle });
    const eqCompany = vi.fn().mockReturnValue({ select });
    const eqId = vi.fn().mockReturnValue({ eq: eqCompany });
    const update = vi.fn().mockReturnValue({ eq: eqId });
    state.from.mockReturnValue({ update });
    await expect(fixedCostsApi.saveCost({ id: 'c1', company_id: 'empresa', professional_id: null, category: 'Aluguel', description: 'Sala', amount: 500, start_date: '2025-01-01', end_date: '2099-12-31', is_owner_salary: false, active: true })).rejects.toThrow();
    expect(eqCompany).toHaveBeenCalledWith('company_id', 'empresa');
  });

  it('grava linhas de material reutilizáveis com company_id e recai no total se o catálogo falhar', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'm1' }, error: null });
    const select = vi.fn().mockReturnValue({ maybeSingle });
    const upsert = vi.fn().mockReturnValue({ select });
    const delEqService = vi.fn().mockResolvedValue({ error: null });
    const delEqCompany = vi.fn().mockReturnValue({ eq: delEqService });
    const del = vi.fn().mockReturnValue({ eq: delEqCompany });
    const insert = vi.fn().mockResolvedValue({ error: null });
    state.from.mockImplementation((table: string) => {
      if (table === 'materials') return { upsert };
      if (table === 'service_material_uses') return { delete: del, insert };
      return { upsert: vi.fn() };
    });
    await expect(fixedCostsApi.saveMaterialLines('empresa', 's1', [{ name: 'Giletes', mode: 'count', packagePrice: 20, yieldCount: 40 }], 0.5)).resolves.toBeUndefined();
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ company_id: 'empresa', name: 'Giletes', package_price: 20, yield_mode: 'count' }), { onConflict: 'company_id,name_key' });
    expect(insert).toHaveBeenCalledWith([expect.objectContaining({ company_id: 'empresa', service_id: 's1', material_id: 'm1' })]);
  });

  it('atualiza preço do material só da empresa autenticada', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'm1' }, error: null });
    const select = vi.fn().mockReturnValue({ maybeSingle });
    const eqCompany = vi.fn().mockReturnValue({ select });
    const eqId = vi.fn().mockReturnValue({ eq: eqCompany });
    const update = vi.fn().mockReturnValue({ eq: eqId });
    state.from.mockReturnValue({ update });
    await expect(fixedCostsApi.updateMaterialPrice('empresa', 'm1', 40)).resolves.toBeUndefined();
    expect(state.from).toHaveBeenCalledWith('materials');
    expect(eqId).toHaveBeenCalledWith('id', 'm1');
    expect(eqCompany).toHaveBeenCalledWith('company_id', 'empresa');
    expect(update).toHaveBeenCalledWith({ package_price: 40 });
  });
});
