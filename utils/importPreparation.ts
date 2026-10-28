import { getPhoneCountry, isValidPhone, toE164 } from './phoneCountry';

export type ImportKind = 'client' | 'service';
type Field = 'name' | 'phone' | 'email' | 'birthDate' | 'notes' | 'sourceId' | 'category' | 'price' | 'duration';

const aliases: Record<ImportKind, Partial<Record<Field, string[]>>> = {
  client: {
    name: ['nome', 'cliente', 'nomedocliente'], phone: ['telefone', 'celular', 'whatsapp', 'telemovel'],
    email: ['email', 'correioeletronico'], birthDate: ['nascimento', 'datadenascimento', 'aniversario'],
    notes: ['observacao', 'observacoes', 'notas'], sourceId: ['id', 'idexterno', 'idcliente', 'codigocliente'],
  },
  service: {
    name: ['nome', 'servico', 'nomedoservico'], category: ['categoria', 'categoriadoservico'],
    price: ['preco', 'valor'], duration: ['duracao', 'duracaominutos'], sourceId: ['id', 'idexterno', 'idservico', 'codigoservico'],
  },
};

function key(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function autoMapColumns(columns: string[], kind: ImportKind): {
  mapping: Partial<Record<Field, number>>;
  ambiguous: Partial<Record<Field, number[]>>;
  unmapped: number[];
} {
  const mapping: Partial<Record<Field, number>> = {};
  const ambiguous: Partial<Record<Field, number[]>> = {};
  const recognized = new Set<number>();
  for (const [field, names] of Object.entries(aliases[kind]) as [Field, string[]][]) {
    const indexes = columns.flatMap((column, index) => names.includes(key(column)) ? [index] : []);
    indexes.forEach(index => recognized.add(index));
    if (indexes.length === 1) mapping[field] = indexes[0];
    else if (indexes.length > 1) ambiguous[field] = indexes;
  }
  return { mapping, ambiguous, unmapped: columns.flatMap((_, index) => recognized.has(index) ? [] : [index]) };
}

export function normalizePhone(value: string, country: 'BR' | 'PT'): string | null {
  const input = value.trim();
  if (!/^[+()\d\s.-]+$/.test(input) || (input.includes('+') && !input.startsWith('+'))) return null;
  const detected = getPhoneCountry(input);
  if (input.startsWith('+') && !detected) return null;
  const selected = detected || country;
  return isValidPhone(input, selected) ? toE164(input, selected) : null;
}

export function normalizePrice(value: string): number | null {
  const raw = value.trim().replace(/^R\$\s*/, '').replace(/\s*€$/, '');
  if (!raw) return null;
  let normalized: string;
  if (/^\d{1,3}(\.\d{3})+,\d{1,2}$/.test(raw)) normalized = raw.replace(/\./g, '').replace(',', '.');
  else if (/^\d+(,\d{1,2})?$/.test(raw)) normalized = raw.replace(',', '.');
  else if (/^\d+(\.\d{1,2})?$/.test(raw)) normalized = raw;
  else return null;
  const amount = Number(normalized);
  return Number.isFinite(amount) && amount <= 99999999.99 ? amount : null;
}

export function normalizeDuration(value: string): number | null {
  const text = value.trim().toLowerCase();
  const hours = /^(\d+)\s*h(?:\s*(\d{1,2})(?:\s*min)?)?$/.exec(text);
  const minutes = /^(\d+)\s*(?:min(?:utos?)?)?$/.exec(text);
  if (hours && Number(hours[2] || 0) >= 60) return null;
  const total = hours ? Number(hours[1]) * 60 + Number(hours[2] || 0) : minutes ? Number(minutes[1]) : 0;
  return Number.isSafeInteger(total) && total > 0 && total <= 1440 ? total : null;
}

export function normalizeDate(value: string): string | null {
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!br && !iso) return null;
  const year = Number(br ? br[3] : iso![1]), month = Number(br ? br[2] : iso![2]), day = Number(br ? br[1] : iso![3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (year < 1900 || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

interface Candidate { id: string; name: string; phones: string[] }
export function findDuplicateCandidates(row: Omit<Candidate, 'id'>, existing: Candidate[]): { id: string; reason: 'phone' | 'name' }[] {
  const name = key(row.name);
  const phones = new Set(row.phones.filter(Boolean));
  return existing.flatMap<{ id: string; reason: 'phone' | 'name' }>(candidate => {
    if (candidate.phones.some(phone => phones.has(phone))) return [{ id: candidate.id, reason: 'phone' as const }];
    if (name && key(candidate.name) === name) return [{ id: candidate.id, reason: 'name' as const }];
    return [];
  });
}
