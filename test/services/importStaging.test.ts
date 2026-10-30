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
    expect(await createImportBatch({ companyId: 'empresa-ficticia', userId: 'usuario-ficticio', source: 'trinks', kind: 'client', fileName: 'clientes-ficticios.csv', rows })).toBe('lote-ficticio');
    expect(state.insertBatch).toHaveBeenCalledWith(expect.objectContaining({ company_id: 'empresa-ficticia', created_by: 'usuario-ficticio', status: 'preparing', file_name: 'clientes-ficticios.csv' }));
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
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'lote-ficticio' }, error: null });
    const inStatus = vi.fn().mockReturnValue({ select: () => ({ maybeSingle }) });
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

it('consulta o mapeamento apenas na empresa, origem e tipo atuais', async () => {
  const maybeSingle = vi.fn().mockResolvedValue({ data: { mapping: { phone: ['Celular'] } }, error: null });
  const eqKind = vi.fn().mockReturnValue({ maybeSingle });
  const eqSource = vi.fn().mockReturnValue({ eq: eqKind });
  const eqCompany = vi.fn().mockReturnValue({ eq: eqSource });
  state.from.mockReturnValue({ select: vi.fn().mockReturnValue({ eq: eqCompany }) });
  const { loadImportMapping } = await import('../../services/importStaging');
  expect(await loadImportMapping('empresa-ficticia', 'fresha', 'client')).toEqual({ phone: ['Celular'] });
  expect(eqCompany).toHaveBeenCalledWith('company_id', 'empresa-ficticia');
  expect(eqSource).toHaveBeenCalledWith('source', 'fresha');
  expect(eqKind).toHaveBeenCalledWith('kind', 'client');
});

describe('confirmação e desfazer', () => {
  it('processa os grupos até finalizar o lote', async () => {
    const rpc = vi.fn().mockResolvedValueOnce({ data: { remaining: 1, total: 101, imported: 100, pending: 1, error: 0, ignored: 0, updated: 0 }, error: null }).mockResolvedValueOnce({ data: { remaining: 0, total: 101, imported: 101, pending: 0, error: 0, ignored: 0, updated: 0 }, error: null });
    const client = (await import('../../lib/supabase')).supabase as unknown as { rpc: typeof rpc };
    client.rpc = rpc;
    const { commitImportBatch } = await import('../../services/importStaging');
    const report = await commitImportBatch('lote-ficticio');
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(report.imported).toBe(101);
  });
});

it('solicita a remoção explícita das pendências do lote', async () => {
  const rpc = vi.fn().mockResolvedValue({ data: 2, error: null });
  const client = (await import('../../lib/supabase')).supabase as unknown as { rpc: typeof rpc };
  client.rpc = rpc;
  const { clearImportPending } = await import('../../services/importStaging');
  expect(await clearImportPending('lote-ficticio')).toBe(2);
  expect(rpc).toHaveBeenCalledWith('clear_import_pending', { p_batch_id: 'lote-ficticio' });
});

it('consulta categorias somente da empresa atual', async () => {
  const range = vi.fn().mockResolvedValue({ data:[{ id:'categoria-ficticia', name:'Categoria fictícia' }], error:null });
  const order = vi.fn().mockReturnValue({ range });
  const eq = vi.fn().mockReturnValue({ order });
  state.from.mockReturnValue({ select:vi.fn().mockReturnValue({ eq }) });
  const { loadImportCategories } = await import('../../services/importStaging');
  expect(await loadImportCategories('empresa-ficticia')).toHaveLength(1);
  expect(eq).toHaveBeenCalledWith('user_id','empresa-ficticia');
});

it('consulta dados adicionais de origem apenas para a empresa e lote informados', async () => {
  const range = vi.fn().mockResolvedValue({ data:[{ row_id:'linha-ficticia', source_data:{ coluna:'valor fictício' } }], error:null });
  const order = vi.fn().mockReturnValue({ range });
  const eqBatch = vi.fn().mockReturnValue({ order });
  const eqCompany = vi.fn().mockReturnValue({ eq:eqBatch });
  state.from.mockReturnValue({ select:vi.fn().mockReturnValue({ eq:eqCompany }) });
  const { loadImportSourceData } = await import('../../services/importStaging');
  expect(await loadImportSourceData('empresa-ficticia','lote-ficticio')).toHaveLength(1);
  expect(eqCompany).toHaveBeenCalledWith('company_id','empresa-ficticia');
  expect(eqBatch).toHaveBeenCalledWith('batch_id','lote-ficticio');
});

it('recusa uma linha grande antes de gravar qualquer dado', async () => {
  const { createImportBatch } = await import('../../services/importStaging');
  await expect(createImportBatch({ companyId:'empresa-ficticia', userId:'usuario-ficticio', source:'contacts', kind:'client', rows:[{ rowNumber:1, raw:{ conteudo:'x'.repeat(950000) } }] })).rejects.toThrow();
  expect(state.from).not.toHaveBeenCalled();
});

it('percorre todas as importações da empresa para não ocultar relatórios antigos', async () => {
  const range = vi.fn().mockResolvedValueOnce({ data:Array.from({ length:500 }, (_, i) => ({ id:`lote-${i}` })), error:null }).mockResolvedValueOnce({ data:[{ id:'lote-mais-antigo' }], error:null });
  const orderId = vi.fn().mockReturnValue({ range });
  const orderDate = vi.fn().mockReturnValue({ order:orderId });
  const statuses = vi.fn().mockReturnValue({ order:orderDate });
  const eq = vi.fn().mockReturnValue({ in:statuses });
  state.from.mockReturnValue({ select:vi.fn().mockReturnValue({ eq }) });
  const { loadImportBatches } = await import('../../services/importStaging');
  expect(await loadImportBatches('empresa-ficticia')).toHaveLength(501);
  expect(eq).toHaveBeenCalledWith('company_id','empresa-ficticia');
  expect(range).toHaveBeenNthCalledWith(2,500,999);
});
