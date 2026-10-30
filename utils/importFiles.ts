import type { CsvRecord } from './importCsv';
import { readImportCsv } from './importCsv';
import { readImportXlsx } from './importXlsx';
import { readVcards, type VcardRecord } from './importVcard';

export interface ImportSheet {
  name: string;
  identity: string;
  headers: string[];
  rows: CsvRecord[];
  warnings: string[];
  originals?: VcardRecord[];
  isContacts: boolean;
  formulas?: Record<string, string>;
  mergedRanges?: string[];
  cellSources?: Record<string, { raw: string; type: string; style: string; formula?: string }>;
}

export function vcardSheet(cards: VcardRecord[]): { headers: string[]; rows: CsvRecord[]; originals: VcardRecord[] } {
  const get = (card: VcardRecord, name: string) => card.properties.filter(property => property.name.split('.').pop() === name).map(property => property.value);
  const maximum = Math.max(0, ...cards.map(card => get(card, 'TEL').length));
  if (maximum > 100) throw new Error('Um contato tem telefones demais para ser analisado.');
  const headers = ['Nome', ...Array.from({ length: maximum }, (_, index) => `Telefone ${index + 1}`), 'E-mail', 'Nascimento', 'Observações', 'ID'];
  const rows = cards.map((card, index) => {
    const parts = (get(card, 'N')[0] || '').split(';');
    const name = get(card, 'FN')[0] || [parts[1], parts[0]].filter(Boolean).join(' ');
    const phones = get(card, 'TEL');
    const birth = get(card, 'BDAY')[0] || '';
    const isoBirth = /^\d{8}$/.test(birth) ? `${birth.slice(0,4)}-${birth.slice(4,6)}-${birth.slice(6,8)}` : birth;
    return { line: index + 1, values: [name, ...Array.from({ length: maximum }, (_, i) => phones[i] || ''), get(card, 'EMAIL')[0] || '', isoBirth, get(card, 'NOTE').join('\n'), get(card, 'UID')[0] || ''] };
  });
  return { headers, rows, originals: cards };
}

export async function readImportFiles(files: File[]): Promise<ImportSheet[]> {
  if (!files.length || files.length > 10 || files.some(file => file.size > 5 * 1024 * 1024) || files.reduce((sum, file) => sum + file.size, 0) > 20 * 1024 * 1024) {
    throw new Error('Escolha até 10 arquivos de até 5 MB cada, com total de até 20 MB.');
  }
  const sheets: ImportSheet[] = [];
  let count = 0;
  for (const file of files) {
    const bytes = await file.arrayBuffer();
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).map(value => value.toString(16).padStart(2, '0')).join('');
    const name = file.name.toLowerCase();
    if (name.endsWith('.vcf')) {
      const input = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      const parsed = vcardSheet(readVcards(input));
      sheets.push({ ...parsed, name: file.name, identity: `${hash}:0`, warnings: [], isContacts: true });
      count += parsed.rows.length;
    } else if (name.endsWith('.xlsx')) {
      const parsed = await readImportXlsx(new Uint8Array(bytes));
      parsed.forEach((sheet, index) => {
        if (!sheet.rows.length) return;
        sheets.push({ name: `${file.name} — ${sheet.name}`, identity: `${hash}:${index}`, headers: sheet.rows[0].values, rows: sheet.rows.slice(1), warnings: sheet.warnings || [], formulas: sheet.formulas, mergedRanges: sheet.mergedRanges, cellSources: sheet.cellSources, isContacts: false });
        count += Math.max(0, sheet.rows.length - 1);
      });
    } else if (name.endsWith('.csv')) {
      const records = readImportCsv(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
      if (records.length) sheets.push({ name: file.name, identity: `${hash}:0`, headers: records[0].values, rows: records.slice(1), warnings: [], isContacts: false });
      count += Math.max(0, records.length - 1);
    } else throw new Error('Escolha arquivos CSV, XLSX ou VCF.');
    if (count > 10000) throw new Error('Os arquivos podem ter até 10.000 registros ao todo.');
  }
  if (!count) throw new Error('Os arquivos não contêm registros para analisar.');
  return sheets;
}
