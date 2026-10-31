// Conferência de cadastros parecidos feita no navegador.
// Segue as mesmas regras do servidor (import_fold_text e normalização de telefone),
// para que a prévia mostre o mesmo resultado que a confirmação.

export interface ImportMatchCandidate {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  additional_phones?: string[] | null;
}

export type ImportMatchReason = 'phone' | 'email' | 'name';

/** Nome sem acentos, em minúsculas e sem espaços repetidos. */
export function foldImportName(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}

/** Telefone completo (com DDD), com e sem o código do país do Brasil (55) ou de Portugal (351). */
export function phoneKeys(value: string): string[] {
  const digits = value.replace(/\D/g, '');
  if (!digits) return [];
  const keys = [digits];
  if (/^55\d{10,11}$/.test(digits)) keys.push(digits.slice(2));
  else if (/^351\d{9}$/.test(digits)) keys.push(digits.slice(3));
  return keys;
}

function phoneSet(values: unknown[]): Set<string> {
  return new Set(values.flatMap(value => phoneKeys(String(value ?? ''))));
}

export function findImportMatches(
  row: { name?: unknown; phones?: unknown; email?: unknown },
  candidates: ImportMatchCandidate[],
  kind: 'client' | 'service',
): { id: string; reason: ImportMatchReason }[] {
  const name = foldImportName(String(row.name || ''));
  const email = String(row.email || '').trim().toLowerCase();
  const wanted = kind === 'client' ? phoneSet(Array.isArray(row.phones) ? row.phones : []) : new Set<string>();
  const found: { id: string; reason: ImportMatchReason }[] = [];
  for (const candidate of candidates) {
    if (kind === 'client') {
      const own = [candidate.phone, ...(candidate.additional_phones || [])].flatMap(value => {
        const digits = String(value ?? '').replace(/\D/g, '');
        return digits ? [digits] : [];
      });
      if (own.some(digits => wanted.has(digits))) { found.push({ id: candidate.id, reason: 'phone' }); continue; }
      if (email && email === (candidate.email || '').trim().toLowerCase()) { found.push({ id: candidate.id, reason: 'email' }); continue; }
    }
    if (name && foldImportName(candidate.name) === name) found.push({ id: candidate.id, reason: 'name' });
  }
  return found;
}

/** Linhas cujo telefone já apareceu em uma linha anterior do mesmo arquivo. */
export function repeatedPhoneRows(rows: { id: string; phones?: unknown }[]): Set<string> {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const row of rows) {
    const own = new Set<string>();
    for (const value of Array.isArray(row.phones) ? row.phones : []) {
      const keys = phoneKeys(String(value ?? ''));
      // Uma chave com o código do país e outra sem representam o mesmo número.
      const canonical = keys[keys.length - 1];
      if (canonical) own.add(canonical);
    }
    if ([...own].some(key => seen.has(key))) repeated.add(row.id);
    own.forEach(key => seen.add(key));
  }
  return repeated;
}
