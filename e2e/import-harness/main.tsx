import React from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from '../../contexts/AuthContext';
import { ImportDataWizard } from '../../components/ImportDataWizard';
import type { ImportKind } from '../../utils/importPreparation';
import type { ImportSource, StoredImportRow } from '../../services/importStaging';

type Api = NonNullable<React.ComponentProps<typeof ImportDataWizard>['api']>;
type Batch = { id: string; kind: ImportKind; source: ImportSource; rows: StoredImportRow[] };
const batches = new Map<string, Batch>();
const created = new Map<string, { batchId: string; name: string }>();
let nextId = 1;

const api: Api = {
  loadImportCandidates: async (_company, kind) => [...(kind === 'client' ? [{ id:'existente-ficticio', name:'Cliente Existente Fictício', phone:'11999998888' }] : []), ...[...created.values()].filter(item => batches.get(item.batchId)?.kind === kind).map((item, index) => ({ id: `c-${index}`, name: item.name }))],
  createImportBatch: async input => {
    const id = `lote-${nextId++}`;
    batches.set(id, { id, kind:input.kind, source:input.source, rows:input.rows.map((row, index) => ({ id:`${id}-${index}`, row_number:row.rowNumber, display_name:String(row.normalized?.name || ''), raw_data:row.raw, normalized_data:{ ...row.normalized, issues:row.issues || [] }, outcome:'pending', reason:row.reason || row.issues?.join(' ') || null })) });
    return id;
  },
  loadImportRows: async (_company, id) => structuredClone(batches.get(id)?.rows || []),
  commitImportBatch: async id => {
    const batch = batches.get(id)!;
    for (const row of batch.rows) {
      if (row.outcome !== 'pending' || row.reason) continue;
      if (row.normalized_data?.decision === 'link' || row.normalized_data?.decision === 'skip') { row.outcome = 'ignored'; row.reason = 'Não houve alteração no cadastro existente.'; }
      else { created.set(row.id, { batchId:id, name:String(row.normalized_data?.name || '') }); row.outcome = 'imported'; row.reason = 'Cadastro criado.'; }
      row.raw_data = {}; row.normalized_data = null;
    }
    return { total:batch.rows.length, imported:batch.rows.filter(row => row.outcome === 'imported').length, updated:0, ignored:batch.rows.filter(row => row.outcome === 'ignored').length, pending:batch.rows.filter(row => row.outcome === 'pending').length, error:0, remaining:0 };
  },
  undoImportBatch: async id => {
    let undone = 0;
    for (const [key, item] of created) if (item.batchId === id) { created.delete(key); undone++; }
    return { undone, preserved:0 };
  },
  updateImportRow: async (_company, batch, rowId, normalized) => {
    const row = batches.get(batch)?.rows.find(item => item.id === rowId);
    if (row) { row.normalized_data = normalized; row.reason = null; row.outcome = 'pending'; }
  },
  discardImportBatch: async (_company, id) => { batches.delete(id); },
  saveImportMapping: async () => {},
  loadImportMapping: async () => null,
  loadImportCategories: async () => [],
  loadImportSourceData: async () => [],
  clearImportSourceData: async () => 0,
  loadImportBatches: async () => [],
  clearImportPending: async id => {
    const batch = batches.get(id)!; let count = 0;
    for (const row of batch.rows) if (row.outcome === 'pending' || row.outcome === 'error') { row.outcome = 'ignored'; row.raw_data = {}; row.normalized_data = null; count++; }
    return count;
  },
};

Object.assign(window, { importTestCount: () => created.size });
createRoot(document.getElementById('root')!).render(<AuthProvider><main><ImportDataWizard companyId="empresa-ficticia" userId="usuario-ficticio" region="BR" api={api} /></main></AuthProvider>);
