import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ from: vi.fn(), insertBatch: vi.fn(), insertRows: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ supabase: { from: state.from } }));
import { createImportBatch } from '../../services/importStaging';

beforeEach(() => {
  vi.clearAllMocks();
  state.insertBatch.mockReturnValue({ select: () => ({ single: async () => ({ data: { id: 'lote-ficticio' }, error: null }) }) });
  state.insertRows.mockResolvedValue({ error: null });
  state.from.mockImplementation((table: string) => ({ insert: table === 'import_batches' ? state.insertBatch : state.insertRows }));
});

describe('preparação de importação', () => {
  it('guarda linhas em grupos limitados e identifica a empresa em cada linha', async () => {
    const rows = Array.from({ length: 205 }, (_, i) => ({ rowNumber: i + 2, raw: { nome: `Pessoa fictícia ${i}` } }));
    expect(await createImportBatch({ companyId: 'empresa-ficticia', userId: 'usuario-ficticio', source: 'trinks', kind: 'client', rows })).toBe('lote-ficticio');
    expect(state.insertBatch).toHaveBeenCalledWith(expect.objectContaining({ company_id: 'empresa-ficticia', created_by: 'usuario-ficticio', status: 'preparing' }));
    expect(state.insertRows).toHaveBeenCalledTimes(3);
    expect(state.insertRows.mock.calls[0][0]).toHaveLength(100);
    expect(state.insertRows.mock.calls[2][0]).toHaveLength(5);
    expect(state.insertRows.mock.calls[0][0][0]).toEqual(expect.objectContaining({ company_id: 'empresa-ficticia', batch_id: 'lote-ficticio', row_number: 2, raw_data: { nome: 'Pessoa fictícia 0' } }));
  });
  it('não inicia um lote sem linhas ou empresa', async () => {
    await expect(createImportBatch({ companyId: '', userId: 'usuario-ficticio', source: 'trinks', kind: 'client', rows: [] })).rejects.toThrow();
    expect(state.from).not.toHaveBeenCalled();
  });
  it('informa quando o lote foi preparado apenas parcialmente', async () => {
    state.insertRows.mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ error: new Error('falha') });
    const rows = Array.from({ length: 101 }, (_, i) => ({ rowNumber: i + 1, raw: { nome: 'Pessoa fictícia' } }));
    await expect(createImportBatch({ companyId: 'empresa-ficticia', userId: 'usuario-ficticio', source: 'fresha', kind: 'client', rows })).rejects.toMatchObject({ batchId: 'lote-ficticio' });
  });
});

describe('limpeza da preparação', () => {
  it('descarta somente o lote da empresa atual', async () => {
    const inStatus = vi.fn().mockResolvedValue({ error: null });
    const eqBatch = vi.fn().mockReturnValue({ in: inStatus });
    const eqCompany = vi.fn().mockReturnValue({ eq: eqBatch });
    const remove = vi.fn().mockReturnValue({ eq: eqCompany });
    state.from.mockReturnValue({ delete: remove });
    const { discardImportBatch } = await import('../../services/importStaging');
    await discardImportBatch('empresa-ficticia', 'lote-ficticio');
    expect(state.from).toHaveBeenCalledWith('import_batches');
    expect(eqCompany).toHaveBeenCalledWith('company_id', 'empresa-ficticia');
    expect(eqBatch).toHaveBeenCalledWith('id', 'lote-ficticio');
    expect(inStatus).toHaveBeenCalledWith('status', ['preparing', 'review']);
  });
  it('não descarta sem empresa ou lote', async () => {
    const { discardImportBatch } = await import('../../services/importStaging');
    await expect(discardImportBatch('', 'lote-ficticio')).rejects.toThrow();
    expect(state.from).not.toHaveBeenCalled();
  });
});

describe('mapeamento salvo', () => {
  it('salva os campos escolhidos por empresa, origem e tipo', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    state.from.mockReturnValue({ upsert });
    const { saveImportMapping } = await import('../../services/importStaging');
    await saveImportMapping('empresa-ficticia', 'fresha', 'client', { name: ['Nome'], phone: ['Celular', 'Telefone'] });
    expect(state.from).toHaveBeenCalledWith('import_column_mappings');
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ company_id: 'empresa-ficticia', source: 'fresha', kind: 'client', mapping: { name: ['Nome'], phone: ['Celular', 'Telefone'] } }), { onConflict: 'company_id,source,kind' });
  });
  it('rejeita mapeamento sem empresa', async () => {
    const { saveImportMapping } = await import('../../services/importStaging');
    await expect(saveImportMapping('', 'fresha', 'client', { name: ['Nome'] })).rejects.toThrow();
    expect(state.from).not.toHaveBeenCalled();
  });
});
