import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from './ui';
import { useBrutalTheme } from '../hooks/useBrutalTheme';
import * as importApi from '../services/importStaging';
import type { ImportCandidate, ImportCategory, ImportReport, ImportSource, StoredImportBatch, StoredImportRow } from '../services/importStaging';
import { IMPORT_SOURCES, getImportSource } from '../utils/importSources';
import { readImportFiles, type ImportSheet } from '../utils/importFiles';
import { inferImportColumns, prepareImportRows, type ImportColumns, type ImportField } from '../utils/importRows';
import { normalizeDate, normalizeDuration, normalizePhone, normalizePrice, type ImportKind } from '../utils/importPreparation';
import { escapeCsv } from '../utils/exporters';
import { findImportMatches, foldImportName, repeatedPhoneRows } from '../utils/importDuplicates';

type ImportWizardApi = Pick<typeof importApi, 'loadImportCandidates' | 'createImportBatch' | 'loadImportRows' | 'commitImportBatch' | 'undoImportBatch' | 'updateImportRow' | 'discardImportBatch' | 'saveImportMapping' | 'loadImportMapping' | 'loadImportBatches' | 'clearImportPending' | 'loadImportCategories' | 'loadImportSourceData' | 'clearImportSourceData' | 'purgeExpiredImportData'>;

interface Props {
  companyId: string;
  userId: string;
  region: 'BR' | 'PT';
  api?: ImportWizardApi;
  onClose?: () => void;
}
interface DocumentChoice { sheet: ImportSheet; kind: ImportKind; mapping: ImportColumns }
interface Work { batchId: string; name: string; kind: ImportKind; rows: StoredImportRow[]; candidates: ImportCandidate[]; categories: ImportCategory[]; report?: ImportReport; status?: string; incomplete?: boolean }
type Phase = 'source' | 'files' | 'mapping' | 'preview' | 'report';

const FIELDS: Record<ImportKind, { key: ImportField; label: string }[]> = {
  client: [ { key:'name', label:'Nome' }, { key:'phone', label:'Telefones' }, { key:'email', label:'E-mail' }, { key:'birth_date', label:'Nascimento' }, { key:'notes', label:'Observações' }, { key:'source_id', label:'Código no sistema anterior' } ],
  service: [ { key:'name', label:'Nome' }, { key:'category', label:'Categoria' }, { key:'price', label:'Preço' }, { key:'duration', label:'Duração' }, { key:'source_id', label:'Código no sistema anterior' } ],
};

const PHONE_EXISTS = 'Este telefone já está cadastrado em outro cliente. Vincule ao cadastro existente ou ignore esta linha.';
const PHONE_REPEATED = 'Este telefone aparece mais de uma vez neste arquivo. Ajuste o telefone ou ignore esta linha.';
const SIMILAR = 'Há um cadastro parecido. Escolha como continuar.';
function plural(count: number, one: string, many: string): string { return `${count} ${count === 1 ? one : many}`; }
function matches(row: Record<string, unknown>, candidates: ImportCandidate[], kind: ImportKind) { return findImportMatches(row, candidates, kind); }

function validateRow(data: Record<string, unknown>, kind: ImportKind, region: 'BR' | 'PT'): { data: Record<string, unknown>; issues: string[] } {
  const next = { ...data }, issues: string[] = [];
  const name = String(next.name || '').trim();
  if (!name || name.length > 200) issues.push('Confira o nome.');
  next.name = name;
  if (!String(next.source_id || '').trim() || String(next.source_id || '').trim().length > 255) issues.push('Confira o código desta linha.');
  if (kind === 'client') {
    const rawPhones = typeof next.phoneText === 'string' ? next.phoneText.split(/[;,/|]+/).map(value => value.trim()).filter(Boolean) : Array.isArray(next.phones) ? next.phones.map(String) : [];
    const phones = rawPhones.map(phone => normalizePhone(phone, region));
    if (phones.some(phone => !phone)) issues.push('Confira os telefones.');
    next.phones = phones.filter((phone): phone is string => phone !== null);
    delete next.phoneText;
    const email = String(next.email || '').trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) issues.push('Confira o e-mail.');
    next.email = email || null;
    const birth = String(next.birth_date || '').trim();
    if (birth && !normalizeDate(birth)) issues.push('Confira a data de nascimento.');
    next.birth_date = birth ? normalizeDate(birth) : null;
  } else {
    const price = normalizePrice(String(next.price ?? ''));
    const duration = normalizeDuration(String(next.duration ?? ''));
    if (price === null) issues.push('Confira o preço.');
    if (duration === null) issues.push('Confira a duração.');
    next.price = price; next.duration = duration;
  }
  next.issues = issues;
  return { data: next, issues };
}

function pendingCsv(work: Work): void {
  const lines = [['Linha', 'Nome', 'Motivo', 'Dados originais'], ...work.rows.filter(row => row.outcome === 'pending' || row.outcome === 'error').map(row => [String(row.row_number), String(row.normalized_data?.name || ''), row.reason || 'Confira os dados.', JSON.stringify(row.raw_data)])];
  const csv = lines.map(line => line.map(value => escapeCsv(value)).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type:'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = 'pendencias-importacao.csv'; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
}

export function ImportDataWizard({ companyId, userId, region, api = importApi, onClose }: Props) {
  const { colors } = useBrutalTheme();
  const [phase, setPhase] = useState<Phase>('source');
  const [source, setSource] = useState<ImportSource>('spreadsheet');
  const [files, setFiles] = useState<File[]>([]);
  const [documents, setDocuments] = useState<DocumentChoice[]>([]);
  const [works, setWorks] = useState<Work[]>([]);
  const [history, setHistory] = useState<StoredImportBatch[]>([]);
  const [historyError, setHistoryError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [edits, setEdits] = useState<Record<string, Record<string, unknown>>>({});
  const [outcome, setOutcome] = useState('');
  const [pendingUndo, setPendingUndo] = useState<string | null>(null);
  const [pendingClear, setPendingClear] = useState<string | null>(null);
  const [pendingSourceClear, setPendingSourceClear] = useState<string | null>(null);
  const refreshHistory = useCallback(async () => { try { setHistory(await api.loadImportBatches(companyId)); setHistoryError(false); } catch { setHistoryError(true); } }, [api, companyId]);
  useEffect(() => { void refreshHistory(); }, [refreshHistory]);
  useEffect(() => { void api.purgeExpiredImportData(); }, [api]);
  const readyCount = useMemo(() => works.reduce((sum, work) => sum + work.rows.filter(row => row.outcome === 'pending' && !row.reason).length, 0), [works]);
  const issueCount = useMemo(() => works.reduce((sum, work) => sum + work.rows.filter(row => (row.outcome === 'pending' && !!row.reason) || row.outcome === 'error').length, 0), [works]);
  const inputClass = `w-full rounded-lg border px-3 py-2 ${colors.border} ${colors.text}`;

  const analyze = async () => {
    setBusy(true); setMessage('');
    try {
      const sheets = await readImportFiles(files);
      const docs = await Promise.all(sheets.map(async sheet => {
        const kind: ImportKind = sheet.isContacts ? 'client' : /servi[cç]|service/i.test(sheet.name) ? 'service' : 'client';
        const inferred = inferImportColumns(sheet.headers, source, kind);
        const saved = await api.loadImportMapping(companyId, source, kind);
        const mapping = { ...inferred };
        if (saved) for (const [field, names] of Object.entries(saved)) {
          const positions = names.map(name => sheet.headers.indexOf(name));
          if (positions.length && positions.every((index, i) => index >= 0 && sheet.headers.indexOf(names[i], index + 1) < 0)) mapping[field as ImportField] = positions;
        }
        return { sheet, kind, mapping };
      }));
      setDocuments(docs); setPhase('mapping');
    } catch (error) { setMessage(error instanceof TypeError ? 'Não foi possível ler o arquivo. Salve-o novamente como CSV e tente outra vez.' : error instanceof Error ? error.message : 'Não foi possível analisar os arquivos.'); }
    finally { setBusy(false); }
  };

  const changeMapping = (docIndex: number, field: ImportField, indexes: number[]) => {
    setDocuments(current => current.map((doc, index) => index === docIndex ? { ...doc, mapping: { ...doc.mapping, [field]: indexes } } : doc));
  };

  const prepare = async () => {
    setBusy(true); setMessage('');
    const created: string[] = [];
    try {
      const result: Work[] = [];
      for (const doc of documents) {
        if (!doc.mapping.name?.length || (doc.kind === 'service' && (!doc.mapping.price?.length || !doc.mapping.duration?.length))) throw new Error('Escolha as colunas obrigatórias em cada arquivo.');
        const candidates = await api.loadImportCandidates(companyId, doc.kind);
        const categories = doc.kind === 'service' ? await api.loadImportCategories(companyId) : [];
        const prepared = prepareImportRows(doc.sheet.headers, doc.sheet.rows, doc.mapping, doc.kind, region, doc.sheet.identity);
        const repeated = doc.kind === 'client' ? repeatedPhoneRows(prepared.map((row, index) => ({ id: String(index), phones: row.normalized.phones }))) : new Set<string>();
        const rows = prepared.map((row, index) => ({
          rowNumber: row.line, raw: { ...row.raw, arquivo: doc.sheet.name, ...(doc.sheet.originals ? { propriedades: doc.sheet.originals[index] } : {}), ...(doc.sheet.formulas ? { formulas: Object.fromEntries(Object.entries(doc.sheet.formulas).filter(([cell]) => Number(cell.match(/[0-9]+$/)?.[0]) === row.line)) } : {}), ...(doc.sheet.cellSources ? { celulas_originais: Object.fromEntries(Object.entries(doc.sheet.cellSources).filter(([cell]) => Number(cell.match(/[0-9]+$/)?.[0]) === row.line)) } : {}), ...(doc.sheet.mergedRanges && index === 0 ? { celulas_mescladas: doc.sheet.mergedRanges } : {}) },
          normalized: row.normalized, issues: row.issues, reason: (() => {
            const found = matches(row.normalized, candidates, doc.kind);
            if (found.some(match => match.reason === 'phone')) return PHONE_EXISTS;
            if (repeated.has(String(index))) return PHONE_REPEATED;
            if (found.length) return SIMILAR;
            return categories.filter(category => foldImportName(category.name) === foldImportName(String(row.normalized.category || '')) && String(row.normalized.category || '')).length > 1 ? 'Escolha uma categoria para este serviço.' : undefined;
          })(),
        }));
        if (!rows.length) continue;
        const batchId = await api.createImportBatch({ companyId, userId, source, kind: doc.kind, fileName: doc.sheet.name, rows });
        created.push(batchId);
        const mapping = Object.fromEntries(Object.entries(doc.mapping).map(([field, indexes]) => [field, (indexes || []).map(index => doc.sheet.headers[index])]));
        await api.saveImportMapping(companyId, source, doc.kind, mapping);
        const storedRows = await api.loadImportRows(companyId, batchId);
        if (storedRows.length !== rows.length) throw new Error('A preparação ficou incompleta. Tente novamente.');
        result.push({ batchId, name: doc.sheet.name, kind: doc.kind, rows: storedRows, candidates, categories });
      }
      if (!result.length) throw new Error('Os arquivos não contêm linhas para analisar.');
      setWorks(result); setPhase('preview');
    } catch (error) {
      const partial = error && typeof error === 'object' && 'batchId' in error && typeof error.batchId === 'string' ? error.batchId : null;
      const ids = partial ? [...created, partial] : created;
      const cleanup = await Promise.allSettled(ids.map(id => api.discardImportBatch(companyId, id)));
      setMessage(cleanup.some(item => item.status === 'rejected') ? 'Não foi possível remover toda a preparação. Tente novamente mais tarde.' : error instanceof Error ? error.message : 'Não foi possível preparar os dados.');
    } finally { setBusy(false); }
  };

  const editRow = (row: StoredImportRow, field: string, value: string) => {
    setEdits(current => ({ ...current, [row.id]: { ...(current[row.id] || row.normalized_data || {}), [field]: value, ...(field === 'category' ? { category_id: '' } : {}) } }));
  };
  const saveRow = async (workIndex: number, row: StoredImportRow) => {
    const data = edits[row.id] || row.normalized_data || {};
    const { data: normalized, issues } = validateRow(data, works[workIndex].kind, region);
    if (normalized.decision !== 'skip' && issues.length) { setMessage(issues.join(' ')); return; }
    if (normalized.decision === 'create' && works[workIndex].kind === 'client'
      && (matches(normalized, works[workIndex].candidates, 'client').some(match => match.reason === 'phone') || repeatedPhoneRows(works[workIndex].rows.map(item => ({ id: item.id, phones: item.id === row.id ? normalized.phones : item.normalized_data?.phones }))).has(row.id))) {
      setMessage(PHONE_EXISTS); return;
    }
    setBusy(true); setMessage('');
    try {
      await api.updateImportRow(companyId, works[workIndex].batchId, row.id, normalized);
      const rows = await api.loadImportRows(companyId, works[workIndex].batchId);
      setWorks(current => current.map((work, index) => index === workIndex ? { ...work, rows } : work));
      setEdits(current => { const next = { ...current }; delete next[row.id]; return next; });
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível salvar a escolha.'); }
    finally { setBusy(false); }
  };
  const confirm = async () => {
    setBusy(true); setMessage('');
    try {
      const updated: Work[] = [];
      for (const work of works) {
        const report = await api.commitImportBatch(work.batchId);
        const rows = await api.loadImportRows(companyId, work.batchId);
        const candidates = await api.loadImportCandidates(companyId, work.kind);
        const categories = work.kind === 'service' ? await api.loadImportCategories(companyId) : [];
        updated.push({ ...work, report, rows, candidates, categories, status:'completed' });
      }
      setWorks(updated); setFiles([]); setDocuments([]); setPhase('report'); void refreshHistory();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível concluir a importação.'); }
    finally { setBusy(false); }
  };
  const openHistory = async (batch: StoredImportBatch) => {
    setBusy(true); setMessage('');
    try {
      const rows = await api.loadImportRows(companyId, batch.id);
      const candidates = await api.loadImportCandidates(companyId, batch.kind);
      const categories = batch.kind === 'service' ? await api.loadImportCategories(companyId) : [];
      const report: ImportReport = { total:rows.length, imported:rows.filter(row => row.outcome === 'imported').length, updated:rows.filter(row => row.outcome === 'updated').length, ignored:rows.filter(row => row.outcome === 'ignored').length, pending:rows.filter(row => row.outcome === 'pending').length, error:rows.filter(row => row.outcome === 'error').length, remaining:0 };
      setWorks([{ batchId:batch.id, name:batch.file_name || getImportSource(batch.source).label, kind:batch.kind, rows, candidates, categories, report, status:batch.status, incomplete:batch.expected_rows == null || batch.expected_rows !== rows.length }]); setPhase(batch.status === 'preparing' || batch.status === 'review' ? 'preview' : 'report');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível carregar a importação.'); }
    finally { setBusy(false); }
  };
  const undo = async (work: Work) => {
    setBusy(true); setMessage('');
    try {
      const report = await api.undoImportBatch(work.batchId);
      setOutcome(`${plural(report.undone, 'removido', 'removidos')} ou ${report.undone === 1 ? 'desvinculado' : 'desvinculados'}. ${plural(report.preserved, 'preservado', 'preservados')} por ${report.preserved === 1 ? 'ter sido alterado ou utilizado' : 'terem sido alterados ou utilizados'}.`);
      if (!report.preserved) setWorks(current => current.map(item => item.batchId === work.batchId ? { ...item, status:'undone' } : item));
      setPendingUndo(null);
      void refreshHistory();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível desfazer a importação.'); }
    finally { setBusy(false); }
  };
  const clearPending = async (work: Work) => {
    setBusy(true); setMessage('');
    try {
      const count = await api.clearImportPending(work.batchId);
      const rows = await api.loadImportRows(companyId, work.batchId);
      const report: ImportReport = { total:rows.length, imported:rows.filter(row => row.outcome === 'imported').length, updated:rows.filter(row => row.outcome === 'updated').length, ignored:rows.filter(row => row.outcome === 'ignored').length, pending:rows.filter(row => row.outcome === 'pending').length, error:rows.filter(row => row.outcome === 'error').length, remaining:0 };
      setWorks(current => current.map(item => item.batchId === work.batchId ? { ...item, rows, report } : item));
      setPendingClear(null); setOutcome(`${plural(count, 'pendência removida', 'pendências removidas')}.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível remover as pendências.'); }
    finally { setBusy(false); }
  };
  const downloadSource = async (work: Work) => {
    setBusy(true); setMessage('');
    try {
      const records = (await api.loadImportSourceData(companyId, work.batchId)).filter(record => Object.keys(record.source_data).length);
      if (!records.length) { setMessage('Não há dados de origem disponíveis para esta importação.'); return; }
      const lines = [['Linha', 'Dados de origem'], ...records.map(record => [String(work.rows.find(row => row.id === record.row_id)?.row_number || ''), JSON.stringify(record.source_data)])];
      const csv = lines.map(line => line.map(value => escapeCsv(/^[=+\-@\t\r]/.test(value) ? `'${value}` : value)).join(',')).join('\r\n');
      const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type:'text/csv;charset=utf-8' }));
      const link = document.createElement('a'); link.href = url; link.download = 'dados-origem-importacao.csv'; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível carregar os dados de origem.'); }
    finally { setBusy(false); }
  };
  const clearSource = async (work: Work) => {
    setBusy(true); setMessage('');
    try {
      const count = await api.clearImportSourceData(work.batchId);
      setPendingSourceClear(null); setOutcome(`Dados de origem removidos de ${plural(count, 'linha', 'linhas')}.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível remover os dados de origem.'); }
    finally { setBusy(false); }
  };
  const restart = async () => {
    if (phase === 'preview') {
      setBusy(true);
      const results = await Promise.allSettled(works.filter(work => work.status !== 'completed' && work.status !== 'undone').map(work => api.discardImportBatch(companyId, work.batchId)));
      setBusy(false);
      if (results.some(result => result.status === 'rejected')) { setMessage('Não foi possível remover a preparação. Se a importação já começou, retome pelo histórico.'); return; }
    }
    setWorks([]); setDocuments([]); setFiles([]); setEdits({}); setOutcome(''); setMessage(''); setPhase('source');
  };

  return <div className={`space-y-5 ${colors.text}`}>
    <div><h2 className="text-lg font-bold">Trazer meus dados de outro aplicativo</h2><p className={`text-sm ${colors.textMuted}`}>Traga clientes e serviços e confira as informações antes de concluir.</p></div>
    {message && <p role="alert" className="text-sm">{message}</p>}
    {onClose && phase !== 'preview' && phase !== 'report' && <Button variant="ghost" disabled={busy} onClick={onClose}>Fechar</Button>}
    {phase === 'source' && <div className="space-y-4">
      <p>De onde vêm seus dados?</p><div className="flex flex-wrap gap-2">{IMPORT_SOURCES.map(item => <Button key={item.id} variant="secondary" onClick={() => { setSource(item.id); setPhase('files'); }}>{item.label}</Button>)}</div>
      {historyError && <p role="alert">Não foi possível carregar as importações anteriores. <button className="underline" onClick={() => void refreshHistory()}>Tentar novamente</button></p>}
      {history.length > 0 && <div className="space-y-2"><h3 className="font-semibold">Importações anteriores</h3>{history.map(batch => <div key={batch.id}><button className="underline" onClick={() => void openHistory(batch)}>{batch.file_name || getImportSource(batch.source).label} · {new Date(batch.created_at).toLocaleDateString('pt-BR')} · {batch.status === 'undone' ? 'Desfeita' : batch.status === 'completed' ? 'Concluída' : 'Em preparação'}</button></div>)}</div>}
    </div>}
    {phase === 'files' && <div className="space-y-4">
      <h3 className="font-semibold">{getImportSource(source).label}</h3><p>{getImportSource(source).instructions}</p>
      {getImportSource(source).supportRequest && <blockquote className={`p-3 border rounded-lg ${colors.border}`}>{getImportSource(source).supportRequest}</blockquote>}
      <label htmlFor="import-files" className="block font-semibold">Escolher arquivos</label><input id="import-files" type="file" multiple accept=".csv,.xlsx,.vcf" onChange={event => setFiles(Array.from(event.target.files || []))} />
      <p className={`text-sm ${colors.textMuted}`}>Até 10 arquivos, com até 5 MB cada e 10.000 linhas ao todo.</p>
      <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => setPhase('source')}>Voltar</Button><Button disabled={!files.length} loading={busy} onClick={() => void analyze()}>Analisar arquivos</Button></div>
    </div>}
    {phase === 'mapping' && <div className="space-y-5">
      <p>Confira o tipo de cada arquivo e as informações identificadas. Ajuste apenas o que precisar.</p>
      {documents.map((doc, index) => <section key={`${doc.sheet.identity}-${index}`} className={`space-y-3 p-4 border rounded-lg ${colors.border}`}>
        <h3 className="font-semibold break-words">{doc.sheet.name}</h3>
        {doc.sheet.warnings.map(warning => <p key={warning}>{warning}</p>)}
        <label className="block">Tipo de dados<select className={inputClass} value={doc.kind} disabled={doc.sheet.isContacts} onChange={event => { const kind = event.target.value as ImportKind; setDocuments(current => current.map((item, i) => i === index ? { ...item, kind, mapping:inferImportColumns(item.sheet.headers, source, kind) } : item)); }}><option value="client">Clientes</option><option value="service">Serviços</option></select></label>
        <p className={`text-sm ${colors.textMuted}`}>{plural(doc.sheet.rows.length, 'linha', 'linhas')}. Colunas não usadas serão preservadas junto aos dados de origem.</p>
        <details open={!doc.mapping.name?.length || (doc.kind === 'service' && (!doc.mapping.price?.length || !doc.mapping.duration?.length))}><summary className="cursor-pointer font-semibold">Conferir as colunas</summary><div className="grid gap-3 sm:grid-cols-2 mt-3">{FIELDS[doc.kind].map(field => <label key={field.key} className="block text-sm">{field.label}{field.key === 'phone' ? <select className={inputClass} multiple value={(doc.mapping.phone || []).map(String)} onChange={event => changeMapping(index, 'phone', Array.from(event.target.selectedOptions, option => Number(option.value)))}>{doc.sheet.headers.map((header, column) => <option key={column} value={column}>{header || `Coluna ${column + 1}`}</option>)}</select> : <select className={inputClass} value={doc.mapping[field.key]?.[0] ?? ''} onChange={event => changeMapping(index, field.key, event.target.value === '' ? [] : [Number(event.target.value)])}><option value="">Não informado</option>{doc.sheet.headers.map((header, column) => <option key={column} value={column}>{header || `Coluna ${column + 1}`}</option>)}</select>}</label>)}</div></details>
      </section>)}
      <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => setPhase('files')}>Voltar</Button><Button loading={busy} onClick={() => void prepare()}>Preparar revisão</Button></div>
    </div>}
    {phase === 'preview' && <div className="space-y-4">
      {works.some(work => work.incomplete) && <p role="alert">Esta preparação ficou incompleta. Cancele e selecione os arquivos novamente.</p>}
      <p><strong>{readyCount} {readyCount === 1 ? 'linha pronta' : 'linhas prontas'}</strong> · {issueCount} {issueCount === 1 ? 'precisa' : 'precisam'} de atenção.</p>
      <p className={`text-sm ${colors.textMuted}`}>Nenhum cadastro será criado antes da confirmação. A importação não envia mensagens nem autoriza campanhas.</p>
      {works.map((work, workIndex) => <section key={work.batchId} className={`space-y-3 p-4 border rounded-lg ${colors.border}`}><h3 className="font-semibold">{work.name}</h3>
        <details><summary className="cursor-pointer">Ver todas as linhas</summary><ul className="max-h-64 overflow-y-auto mt-2 space-y-1">{work.rows.map(row => <li key={row.id}>Linha {row.row_number}: {String(row.normalized_data?.name || row.display_name || 'Sem nome')} · {row.reason || 'Pronto para importar'}</li>)}</ul></details>
        {work.rows.filter(row => (row.outcome === 'pending' && !!row.reason) || row.outcome === 'error').map(row => {
          const data = edits[row.id] || row.normalized_data || {}, found = matches(data, work.candidates, work.kind);
          const phoneTaken = work.kind === 'client' && (found.some(match => match.reason === 'phone') || repeatedPhoneRows(work.rows.map(item => ({ id: item.id, phones: item.id === row.id ? data.phones : item.normalized_data?.phones }))).has(row.id));
          const candidates = work.candidates.filter(candidate => found.some(match => match.id === candidate.id));
          return <div key={row.id} className={`space-y-2 border-t pt-3 ${colors.border}`}><p className="font-semibold">Linha {row.row_number} · {row.reason || 'Confira os dados.'}</p>{phoneTaken && row.reason !== PHONE_EXISTS && row.reason !== PHONE_REPEATED && <p role="alert" className="text-sm">{found.some(match => match.reason === 'phone') ? PHONE_EXISTS : PHONE_REPEATED}</p>}
            <label className="block text-sm">Nome<input className={inputClass} value={String(data.name || '')} onChange={event => editRow(row, 'name', event.target.value)} /></label>
            {work.kind === 'client' ? <><label className="block text-sm">Telefones<input className={inputClass} value={String(data.phoneText ?? (Array.isArray(data.phones) ? data.phones.join(', ') : ''))} onChange={event => editRow(row, 'phoneText', event.target.value)} /></label><label className="block text-sm">E-mail<input className={inputClass} value={String(data.email || '')} onChange={event => editRow(row, 'email', event.target.value)} /></label><label className="block text-sm">Nascimento<input className={inputClass} value={String(data.birth_date || '')} onChange={event => editRow(row, 'birth_date', event.target.value)} placeholder="dia/mês/ano" /></label></> : <><label className="block text-sm">Preço<input className={inputClass} value={String(data.price ?? '')} onChange={event => editRow(row, 'price', event.target.value)} /></label><label className="block text-sm">Duração<input className={inputClass} value={String(data.duration ?? '')} onChange={event => editRow(row, 'duration', event.target.value)} placeholder="Ex.: 1h30" /></label><label className="block text-sm">Categoria<input className={inputClass} value={String(data.category || '')} onChange={event => editRow(row, 'category', event.target.value)} /></label><label className="block text-sm">Categoria existente<select className={inputClass} value={String(data.category_id || '')} onChange={event => editRow(row, 'category_id', event.target.value)}><option value="">Usar o nome informado</option>{work.categories.map((category, index) => <option key={category.id} value={category.id}>{category.name} · opção {index + 1}</option>)}</select></label></>}
            <details><summary className="cursor-pointer text-sm">Código no sistema anterior</summary><input aria-label="Código no sistema anterior" className={inputClass} value={String(data.source_id || '')} onChange={event => editRow(row, 'source_id', event.target.value)} /></details>
            <label className="block text-sm">Como continuar?<select className={`${inputClass} min-w-0`} value={String(data.decision === 'link' ? `link:${data.target_id}` : data.decision || '')} onChange={event => { const value = event.target.value; setEdits(current => ({ ...current, [row.id]: { ...(current[row.id] || row.normalized_data || {}), decision:value.startsWith('link:') ? 'link' : value, target_id:value.startsWith('link:') ? value.slice(5) : '' } })); }}><option value="">Escolha uma opção</option>{!phoneTaken && <option value="create">Criar novo cadastro</option>}{candidates.map(candidate => <option key={candidate.id} value={`link:${candidate.id}`}>Vincular a {candidate.name}{candidate.phone ? ` · ${candidate.phone}` : ''}</option>)}<option value="skip">Não importar esta linha</option></select></label>
            <Button variant="secondary" loading={busy} onClick={() => void saveRow(workIndex, row)}>Salvar escolha</Button>
          </div>;
        })}
      </section>)}
      <div className="flex flex-wrap gap-2"><Button variant="secondary" disabled={busy} onClick={() => void restart()}>Cancelar</Button><Button loading={busy} disabled={works.some(work => work.incomplete)} onClick={() => void confirm()}>Confirmar importação</Button></div>
    </div>}
    {phase === 'report' && <div className="space-y-4">
      <h3 className="font-semibold">Resultado da importação</h3>{outcome && <p role="status">{outcome}</p>}
      {works.map(work => <section key={work.batchId} className={`space-y-2 p-4 border rounded-lg ${colors.border}`}><h4 className="font-semibold">{work.name}</h4><p>{plural(work.report?.total || 0, 'linha', 'linhas')} · {plural(work.report?.imported || 0, 'importado', 'importados')} · {plural(work.report?.updated || 0, 'atualizado', 'atualizados')} · {plural(work.report?.ignored || 0, 'ignorado', 'ignorados')} · {plural((work.report?.pending || 0) + (work.report?.error || 0), 'pendente', 'pendentes')}</p>
        <details><summary className="cursor-pointer">Ver resultado de cada linha</summary><ul className="max-h-64 overflow-y-auto mt-2 space-y-1">{work.rows.map(row => <li key={row.id}>Linha {row.row_number}: {row.display_name || String(row.normalized_data?.name || 'Sem nome')} · {row.reason || 'Pendente de revisão.'}</li>)}</ul></details>
        {work.rows.some(row => row.outcome === 'pending' || row.outcome === 'error') && <div className="space-y-2"><p className={`text-sm ${colors.textMuted}`}>As pendências ficam salvas para revisão até você removê-las.</p><div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => pendingCsv(work)}>Baixar pendências</Button>{work.status !== 'undone' && <Button variant="secondary" onClick={() => setPhase('preview')}>Revisar pendências</Button>}{pendingClear !== work.batchId && <Button variant="secondary" onClick={() => setPendingClear(work.batchId)}>Remover pendências</Button>}</div>{pendingClear === work.batchId && <div className="space-y-2"><p>Deseja remover os dados das pendências? Baixe uma cópia antes, se precisar.</p><div className="flex gap-2"><Button variant="secondary" onClick={() => setPendingClear(null)}>Voltar</Button><Button variant="danger" loading={busy} onClick={() => void clearPending(work)}>Confirmar remoção</Button></div></div>}</div>}
        <p className={`text-sm ${colors.textMuted}`}>Os dados adicionais de origem ficam disponíveis apenas para o responsável. Você pode baixá-los ou removê-los.</p>
        <div className="flex flex-wrap gap-2"><Button variant="secondary" loading={busy} onClick={() => void downloadSource(work)}>Baixar dados de origem</Button>{pendingSourceClear !== work.batchId && <Button variant="secondary" onClick={() => setPendingSourceClear(work.batchId)}>Remover dados de origem</Button>}</div>
        {pendingSourceClear === work.batchId && <div className="space-y-2"><p>Deseja remover os dados adicionais de origem? Baixe uma cópia antes, se precisar. Os cadastros importados serão mantidos.</p><div className="flex gap-2"><Button variant="secondary" onClick={() => setPendingSourceClear(null)}>Voltar</Button><Button variant="danger" loading={busy} onClick={() => void clearSource(work)}>Confirmar remoção dos dados de origem</Button></div></div>}
        {work.status !== 'undone' && (pendingUndo === work.batchId ? <div className="space-y-2"><p>Deseja desfazer? Cadastros alterados ou utilizados depois serão preservados.</p><div className="flex flex-wrap gap-2"><Button variant="secondary" disabled={busy} onClick={() => setPendingUndo(null)}>Voltar</Button><Button variant="danger" loading={busy} onClick={() => void undo(work)}>Confirmar desfazer</Button></div></div> : <Button variant="secondary" loading={busy} onClick={() => setPendingUndo(work.batchId)}>Desfazer esta importação</Button>)}</section>)}
      <Button variant="secondary" onClick={() => { if (onClose) onClose(); else void restart(); }}>Concluir</Button>
    </div>}
  </div>;
}
