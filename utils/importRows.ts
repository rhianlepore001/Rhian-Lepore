import type { ImportKind } from './importPreparation';
import { normalizeDate, normalizeDuration, normalizePhone, normalizePrice } from './importPreparation';
import type { CsvRecord } from './importCsv';
import type { ImportSource } from '@/services/importStaging';

export type ImportField = 'name' | 'phone' | 'email' | 'birth_date' | 'notes' | 'source_id' | 'category' | 'price' | 'duration';
export type ImportColumns = Partial<Record<ImportField, number[]>>;
export interface PreparedImportRow { line: number; raw: Record<string, unknown>; normalized: Record<string, unknown>; issues: string[] }

const aliases: Record<ImportField, string[]> = {
  name: ['nome', 'nomecompleto', 'cliente', 'nomedocliente', 'servico', 'nomedoservico', 'name', 'clientname', 'servicename'],
  phone: ['telefone', 'celular', 'whatsapp', 'telemovel', 'telefonecelular', 'telefonefixo', 'phone', 'mobile', 'mobilenumber', 'phonenumber', 'cellphone', 'mobilephone', 'fone', 'tel'],
  email: ['email', 'correioeletronico', 'emailaddress'],
  birth_date: ['nascimento', 'datadenascimento', 'aniversario', 'birthday', 'dateofbirth', 'birthdate'],
  notes: ['observacao', 'observacoes', 'notas', 'notes', 'clientnotes', 'obs', 'anotacoes'],
  source_id: ['id', 'idexterno', 'idcliente', 'codigocliente', 'codigodoservico', 'idservico', 'clientid', 'serviceid'],
  category: ['categoria', 'categoriadoservico', 'category', 'servicecategory', 'grupo', 'grupodoservico'],
  price: ['preco', 'valor', 'price', 'serviceprice'],
  duration: ['duracao', 'duracaominutos', 'duration', 'durationminutes', 'tempo', 'tempodoservico', 'duracaoemminutos'],
};

function key(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Chaves possíveis de um cabeçalho: completa e sem o trecho entre parênteses, como "Preço (R$)" ou "Tempo (min)". */
function keys(value: string): string[] {
  const full = key(value), short = key(value.replace(/\([^)]*\)/g, ''));
  return short && short !== full ? [full, short] : [full];
}

const firstNameKeys = ['nome', 'name', 'firstname', 'primeironome', 'givenname'];
const lastNameKeys = ['sobrenome', 'surname', 'lastname', 'familyname', 'ultimonome'];

/** Ignora linhas em que todas as células estão vazias (linhas em branco no meio ou no fim da planilha). */
export function dropEmptyImportRows(records: CsvRecord[]): CsvRecord[] {
  return records.filter(record => record.values.some(value => (value || '').trim() !== ''));
}

export function inferImportColumns(headers: string[], source: ImportSource, kind: ImportKind): ImportColumns {
  const fields: ImportField[] = kind === 'client' ? ['name','phone','email','birth_date','notes','source_id'] : ['name','category','price','duration','source_id'];
  const result: ImportColumns = {};
  for (const field of fields) {
    const matches = headers.flatMap((header, index) => (keys(header).some(candidate => aliases[field].includes(candidate)) || (field === 'phone' && /^(telefone|celular|telemovel|phone|mobile)[0-9]+$/.test(key(header)))) ? [index] : []);
    if (field === 'phone' && matches.length) result[field] = matches;
    else if (matches.length === 1) result[field] = matches;
  }
  if (source === 'fresha' && kind === 'client' && !result.name) {
    const first = headers.findIndex(header => key(header) === 'firstname');
    const last = headers.findIndex(header => key(header) === 'lastname');
    if (first >= 0) result.name = last >= 0 ? [first, last] : [first];
  } else if (kind === 'client' && result.name?.length === 1 && firstNameKeys.includes(key(headers[result.name[0]]))) {
    const lastColumns = headers.flatMap((header, index) => lastNameKeys.includes(key(header)) ? [index] : []);
    if (lastColumns.length === 1) result.name = [result.name[0], lastColumns[0]];
  }
  return result;
}

/** Escopo curto (até 64 caracteres) que separa os códigos de arquivos e abas diferentes. */
export function sourceScope(fileIdentity: string): string {
  const cut = fileIdentity.lastIndexOf(':');
  if (cut < 0) return fileIdentity.slice(0, 64);
  return `${fileIdentity.slice(0, cut).slice(0, 48)}:${fileIdentity.slice(cut + 1).slice(0, 12)}`;
}

export function prepareImportRows(headers: string[], records: CsvRecord[], mapping: ImportColumns, kind: ImportKind, region: 'BR' | 'PT', fileIdentity: string): PreparedImportRow[] {
  return records.map(record => {
    const get = (field: ImportField) => (mapping[field] || []).map(index => (record.values[index] || '').trim()).filter(Boolean);
    const name = get('name').join(' '), sourceId = get('source_id')[0] || `${fileIdentity}:${record.line}`;
    const normalized: Record<string, unknown> = { name, source_id: sourceId, source_scope: sourceScope(fileIdentity) };
    const issues: string[] = [];
    if (!name || name.length > 200) issues.push('Confira o nome.');
    if (sourceId.length > 255) issues.push('Confira o código desta linha.');
    if (kind === 'client') {
      const phones = get('phone').flatMap(value => value.split(/[;,/|]+/).map(part => part.trim()).filter(Boolean));
      const parsed = phones.map(phone => normalizePhone(phone, region));
      if (parsed.some(phone => !phone)) { issues.push('Confira os telefones.'); normalized.phoneText = phones.join(', '); }
      normalized.phones = parsed.filter((phone): phone is string => phone !== null);
      const email = get('email')[0] || '';
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) issues.push('Confira o e-mail.');
      normalized.email = email || null;
      const birth = get('birth_date')[0] || '';
      if (birth && !normalizeDate(birth)) issues.push('Confira a data de nascimento.');
      normalized.birth_date = birth ? normalizeDate(birth) || birth : null;
      normalized.notes = get('notes').join('\n') || null;
    } else {
      const originalPrice = get('price')[0] || '', originalDuration = get('duration')[0] || '';
      const price = normalizePrice(originalPrice), duration = normalizeDuration(originalDuration);
      if (price === null) issues.push('Confira o preço.');
      if (duration === null) issues.push('Confira a duração.');
      normalized.price = price ?? originalPrice;
      normalized.duration = duration ?? originalDuration;
      normalized.category = get('category')[0] || '';
    }
    return { line: record.line, raw: { headers, values: record.values }, normalized, issues };
  });
}
