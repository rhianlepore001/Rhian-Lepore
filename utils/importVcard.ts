export interface VcardProperty { name: string; parameters: string; value: string }
export interface VcardRecord { properties: VcardProperty[] }

export function readVcards(input: string): VcardRecord[] {
  if (input.length > 5 * 1024 * 1024) throw new Error('O arquivo é maior que o permitido.');
  const physical = input.replace(/^\uFEFF/, '').split(/\r\n|\n|\r/);
  const lines: string[] = [];
  for (const line of physical) {
    if (/^[ \t]/.test(line)) {
      if (!lines.length) throw new Error('Confira o arquivo de contatos.');
      lines[lines.length - 1] += line.slice(1);
    } else lines.push(line);
  }
  const cards: VcardRecord[] = [];
  let current: VcardProperty[] | null = null;
  for (const line of lines) {
    if (!line) continue;
    if (line.toUpperCase() === 'BEGIN:VCARD') {
      if (current) throw new Error('Confira o arquivo de contatos.');
      current = [];
      continue;
    }
    if (line.toUpperCase() === 'END:VCARD') {
      if (!current) throw new Error('Confira o arquivo de contatos.');
      cards.push({ properties: current });
      if (cards.length > 10000) throw new Error('O arquivo contém contatos demais.');
      current = null;
      continue;
    }
    if (!current) throw new Error('Confira o arquivo de contatos.');
    let quoted = false, colon = -1;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') quoted = !quoted;
      if (line[i] === ':' && !quoted) { colon = i; break; }
    }
    if (colon < 1 || quoted) throw new Error('Confira o arquivo de contatos.');
    const header = line.slice(0, colon);
    const semicolon = header.indexOf(';');
    const name = (semicolon < 0 ? header : header.slice(0, semicolon)).toUpperCase();
    const parameters = semicolon < 0 ? '' : header.slice(semicolon + 1);
    if (!/^[A-Z0-9.-]+$/.test(name) || /(?:^|;)ENCODING\s*=\s*(?:QUOTED-PRINTABLE|B|BASE64)(?:;|$)/i.test(parameters)) {
      throw new Error('Este arquivo contém informações em um formato que ainda não é compatível.');
    }
    const value = line.slice(colon + 1).replace(/\\([nN,;\\])/g, (_, escaped: string) => escaped.toLowerCase() === 'n' ? '\n' : escaped);
    current.push({ name, parameters, value });
  }
  if (current || !cards.length) throw new Error('Confira o arquivo de contatos.');
  return cards;
}
