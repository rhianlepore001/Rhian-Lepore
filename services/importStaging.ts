import { supabase } from '@/lib/supabase';
import type { ImportKind } from '@/utils/importPreparation';

export type ImportSource = 'trinks' | 'fresha' | 'appbarber' | 'booksy' | 'avec' | 'spreadsheet' | 'contacts';
export interface StagingRowInput { rowNumber: number; raw: Record<string, unknown>; normalized?: Record<string, unknown>; issues?: string[]; reason?: string }
export interface CreateImportBatchInput {
  companyId: string;
  userId: string;
  source: ImportSource;
  kind: ImportKind;
  fileName?: string;
  rows: StagingRowInput[];
}

export class PartialStagingError extends Error {
  constructor(public readonly batchId: string) {
    super('Não foi possível preparar todos os dados. Tente novamente.');
    this.name = 'PartialStagingError';
  }
}

export async function createImportBatch(input: CreateImportBatchInput): Promise<string> {
  if (!input.companyId || !input.userId || !input.rows.length || input.rows.length > 10000
    || input.rows.some(row => !Number.isInteger(row.rowNumber) || row.rowNumber < 1 || row.rowNumber > 1000000)
    || new Set(input.rows.map(row => row.rowNumber)).size !== input.rows.length) {
    throw new Error('Confira os dados antes de continuar.');
  }
  try {
    const encoder = new TextEncoder();
    let total = 0;
    for (const row of input.rows) {
      const rawSize = encoder.encode(JSON.stringify(row.raw)).byteLength;
      const normalizedSize = encoder.encode(JSON.stringify(row.normalized || {})).byteLength;
      if (rawSize > 900000 || normalizedSize > 60000) throw new Error('size');
      total += rawSize + normalizedSize;
      if (total > 20 * 1024 * 1024) throw new Error('size');
    }
  } catch {
    throw new Error('Há informações grandes demais. Divida os dados ou remova anexos e tente novamente.');
  }
  const { data, error } = await supabase.from('import_batches').insert({
    company_id: input.companyId, created_by: input.userId, source: input.source,
    kind: input.kind, status: 'preparing', expected_rows: input.rows.length, file_name: input.fileName?.slice(0, 255) || null,
  }).select('id').single();
  if (error || !data) throw new Error('Não foi possível preparar os dados. Tente novamente.');
  const batchId = data.id as string;
  for (let offset = 0; offset < input.rows.length; offset += 100) {
    const chunk = input.rows.slice(offset, offset + 100).map(row => ({
      company_id: input.companyId, batch_id: batchId, row_number: row.rowNumber, raw_data: row.raw, display_name: typeof row.normalized?.name === 'string' ? row.normalized.name.slice(0, 200) : null,
      normalized_data: row.normalized ? { ...row.normalized, issues: row.issues || [] } : null, reason: row.issues?.join(' ') || row.reason || null,
    }));
    try {
      const result = await supabase.from('import_staging_rows').insert(chunk);
      if (result.error) throw result.error;
    } catch {
      throw new PartialStagingError(batchId);
    }
  }
  return batchId;
}

export async function discardImportBatch(companyId: string, batchId: string): Promise<void> {
  if (!companyId || !batchId) throw new Error('Não foi possível identificar a preparação.');
  const { data, error } = await supabase.from('import_batches').delete().eq('company_id', companyId).eq('id', batchId).in('status', ['preparing', 'review']).select('id').maybeSingle();
  if (error || !data) throw new Error('Não foi possível remover os dados preparados. Tente novamente.');
}

export type SavedImportMapping = Record<string, string[]>;

export async function saveImportMapping(companyId: string, source: ImportSource, kind: ImportKind, mapping: SavedImportMapping): Promise<void> {
  if (!companyId || !Object.keys(mapping).length || Object.keys(mapping).length > 30
    || Object.entries(mapping).some(([field, columns]) => !field || field.length > 100 || !Array.isArray(columns)
      || columns.length > 20 || columns.some(column => typeof column !== 'string' || !column.trim() || column.length > 255))) {
    throw new Error('Confira as informações antes de salvar.');
  }
  const { error } = await supabase.from('import_column_mappings').upsert({
    company_id: companyId, source, kind, mapping, updated_at: new Date().toISOString(),
  }, { onConflict: 'company_id,source,kind' });
  if (error) throw new Error('Não foi possível salvar as escolhas. Tente novamente.');
}

export async function loadImportMapping(companyId: string, source: ImportSource, kind: ImportKind): Promise<SavedImportMapping | null> {
  if (!companyId) throw new Error('Não foi possível identificar a empresa.');
  const { data, error } = await supabase.from('import_column_mappings').select('mapping')
    .eq('company_id', companyId).eq('source', source).eq('kind', kind).maybeSingle();
  if (error) throw new Error('Não foi possível carregar as escolhas. Tente novamente.');
  if (!data) return null;
  const mapping: unknown = data.mapping;
  if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping)
    || Object.values(mapping).some(columns => !Array.isArray(columns) || columns.some(column => typeof column !== 'string'))) {
    throw new Error('Não foi possível carregar as escolhas. Tente novamente.');
  }
  return mapping as SavedImportMapping;
}

export interface ImportReport { total: number; imported: number; updated: number; ignored: number; pending: number; error: number; remaining: number }
export interface ImportUndoReport { undone: number; preserved: number }
export interface ImportCandidate { id: string; name: string; phone?: string | null; email?: string | null; additional_phones?: string[] | null }
export interface StoredImportRow { id: string; row_number: number; display_name?: string | null; raw_data: Record<string, unknown>; normalized_data: Record<string, unknown> | null; outcome: string; reason: string | null }
export interface StoredImportBatch { id: string; expected_rows?: number | null; file_name?: string | null; source: ImportSource; kind: ImportKind; status: string; created_at: string }

export async function commitImportBatch(batchId: string): Promise<ImportReport> {
  if (!batchId) throw new Error('Não foi possível identificar a importação.');
  for (let attempts = 0; attempts < 101; attempts++) {
    const { data, error } = await supabase.rpc('commit_import_batch', { p_batch_id: batchId });
    if (error || !data || typeof data.remaining !== 'number') throw new Error('Não foi possível concluir a importação. Confira o relatório antes de tentar novamente.');
    if (data.remaining === 0) return data as ImportReport;
  }
  throw new Error('Não foi possível concluir a importação. Confira o relatório antes de tentar novamente.');
}

export async function undoImportBatch(batchId: string): Promise<ImportUndoReport> {
  if (!batchId) throw new Error('Não foi possível identificar a importação.');
  let undone = 0, preserved = 0;
  // O desfazer é feito em partes para não travar com importações grandes.
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const { data, error } = await supabase.rpc('undo_import_batch', { p_batch_id: batchId, p_restart: attempt === 0 });
    if (error || !data) throw new Error('Não foi possível desfazer a importação. Tente novamente.');
    const part = data as { undone?: number; preserved?: number; remaining?: number };
    undone += Number(part.undone || 0);
    preserved = Number(part.preserved || 0);
    if (!Number(part.remaining || 0)) return { undone, preserved };
  }
  throw new Error('Não foi possível desfazer a importação. Tente novamente.');
}

/** Remove dados de importações antigas. Nunca interrompe a tela se falhar. */
export async function purgeExpiredImportData(): Promise<void> {
  try { await supabase.rpc('purge_expired_import_data'); } catch { /* limpeza opcional */ }
}

export async function loadImportCandidates(companyId: string, kind: ImportKind): Promise<ImportCandidate[]> {
  if (!companyId) throw new Error('Não foi possível identificar a empresa.');
  const result: ImportCandidate[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from(kind === 'client' ? 'clients' : 'services')
      .select(kind === 'client' ? 'id,name,phone,email,additional_phones' : 'id,name').eq('user_id', companyId).order('id').range(offset, offset + 499);
    if (error) throw new Error('Não foi possível conferir os cadastros existentes. Tente novamente.');
    result.push(...(data || []) as unknown as ImportCandidate[]);
    if (!data || data.length < 500) return result;
  }
}

export async function loadImportRows(companyId: string, batchId: string): Promise<StoredImportRow[]> {
  if (!companyId || !batchId) throw new Error('Não foi possível identificar a importação.');
  const rows: StoredImportRow[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from('import_staging_rows').select('id,row_number,display_name,raw_data,normalized_data,outcome,reason')
      .eq('company_id', companyId).eq('batch_id', batchId).order('row_number').range(offset, offset + 499);
    if (error) throw new Error('Não foi possível carregar o relatório. Tente novamente.');
    rows.push(...(data || []) as StoredImportRow[]);
    if (!data || data.length < 500) return rows;
  }
}

export async function loadImportBatches(companyId: string): Promise<StoredImportBatch[]> {
  if (!companyId) return [];
  const batches: StoredImportBatch[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from('import_batches').select('id,file_name,expected_rows,source,kind,status,created_at')
      .eq('company_id', companyId).in('status', ['preparing', 'review', 'completed', 'undone']).order('created_at', { ascending: false }).order('id', { ascending: false }).range(offset, offset + 499);
    if (error) throw new Error('Não foi possível carregar as importações anteriores.');
    batches.push(...(data || []) as StoredImportBatch[]);
    if (!data || data.length < 500) return batches;
  }
}

export async function updateImportRow(companyId: string, batchId: string, rowId: string, normalized: Record<string, unknown>): Promise<void> {
  if (!companyId || !batchId || !rowId) throw new Error('Não foi possível identificar a linha.');
  const { data, error } = await supabase.from('import_staging_rows').update({ normalized_data: normalized, outcome: 'pending', reason: null })
    .eq('company_id', companyId).eq('batch_id', batchId).eq('id', rowId).in('outcome', ['pending', 'error']).select('id').maybeSingle();
  if (error || !data) throw new Error('Não foi possível salvar a escolha. Tente novamente.');
}

export async function clearImportPending(batchId: string): Promise<number> {
  if (!batchId) throw new Error('Não foi possível identificar a importação.');
  const { data, error } = await supabase.rpc('clear_import_pending', { p_batch_id: batchId });
  if (error || typeof data !== 'number') throw new Error('Não foi possível remover as pendências. Tente novamente.');
  return data;
}

export interface ImportCategory { id: string; name: string }
export async function loadImportCategories(companyId: string): Promise<ImportCategory[]> {
  if (!companyId) throw new Error('Não foi possível identificar a empresa.');
  const categories: ImportCategory[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from('service_categories').select('id,name').eq('user_id', companyId).order('id').range(offset, offset + 499);
    if (error) throw new Error('Não foi possível conferir as categorias. Tente novamente.');
    categories.push(...(data || []) as ImportCategory[]);
    if (!data || data.length < 500) return categories;
  }
}

export interface ImportSourceRecord { row_id: string; source_data: Record<string, unknown> }
export async function loadImportSourceData(companyId: string, batchId: string): Promise<ImportSourceRecord[]> {
  if (!companyId || !batchId) throw new Error('Não foi possível identificar a importação.');
  const records: ImportSourceRecord[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from('import_created_records').select('row_id,source_data')
      .eq('company_id', companyId).eq('batch_id', batchId).order('id').range(offset, offset + 499);
    if (error) throw new Error('Não foi possível carregar os dados de origem.');
    records.push(...(data || []) as ImportSourceRecord[]);
    if (!data || data.length < 500) return records;
  }
}

export async function clearImportSourceData(batchId: string): Promise<number> {
  if (!batchId) throw new Error('Não foi possível identificar a importação.');
  const { data, error } = await supabase.rpc('clear_import_source_data', { p_batch_id: batchId });
  if (error || typeof data !== 'number') throw new Error('Não foi possível remover os dados de origem. Tente novamente.');
  return data;
}
