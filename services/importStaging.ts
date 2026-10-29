import { supabase } from '@/lib/supabase';
import type { ImportKind } from '@/utils/importPreparation';

export type ImportSource = 'trinks' | 'fresha' | 'appbarber' | 'booksy' | 'avec' | 'spreadsheet' | 'contacts';
export interface StagingRowInput { rowNumber: number; raw: Record<string, unknown> }
export interface CreateImportBatchInput {
  companyId: string;
  userId: string;
  source: ImportSource;
  kind: ImportKind;
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
  const { data, error } = await supabase.from('import_batches').insert({
    company_id: input.companyId, created_by: input.userId, source: input.source,
    kind: input.kind, status: 'preparing',
  }).select('id').single();
  if (error || !data) throw new Error('Não foi possível preparar os dados. Tente novamente.');
  const batchId = data.id as string;
  for (let offset = 0; offset < input.rows.length; offset += 100) {
    const chunk = input.rows.slice(offset, offset + 100).map(row => ({
      company_id: input.companyId, batch_id: batchId, row_number: row.rowNumber, raw_data: row.raw,
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
  const { error } = await supabase.from('import_batches').delete().eq('company_id', companyId).eq('id', batchId).in('status', ['preparing', 'review']);
  if (error) throw new Error('Não foi possível remover os dados preparados. Tente novamente.');
}
