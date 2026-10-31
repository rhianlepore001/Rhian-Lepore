export interface VcardProperty { name: string; parameters: string; value: string }
export interface VcardRecord { properties: VcardProperty[]; originalLines: string[] }

export function readVcards(input: string): VcardRecord[] {
  if (input.length > 5 * 1024 * 1024) throw new Error('O arquivo é maior que o permitido.');
  const physical = input.replace(/^\uFEFF/, '').split(/\r\n|\n|\r/);
  const lines: string[] = [];
  for (const line of physical) {
    if (lines.length && /(?:^|;)ENCODING=QUOTED-PRINTABLE(?:;|:)/i.test(lines[lines.length - 1]) && lines[lines.length - 1].endsWith('=')) {
      lines[lines.length - 1] = lines[lines.length - 1].slice(0, -1) + line;
    } else if (/^[ \t]/.test(line)) {
      if (!lines.length) throw new Error('Confira o arquivo de contatos.');
      lines[lines.length - 1] += line.slice(1);
    } else if (line && !line.includes(':') && lines.length && /(?:^|;)ENCODING=(?:B|BASE64)(?:;|:)/i.test(lines[lines.length - 1])) {
      lines[lines.length - 1] += line;
    } else lines.push(line);
  }
  const cards: VcardRecord[] = [];
  let current: VcardProperty[] | null = null;
  let originalLines: string[] = [];
  for (const line of lines) {
    if (!line) continue;
    if (line.toUpperCase() === 'BEGIN:VCARD') {
      if (current) throw new Error('Confira o arquivo de contatos.');
      current = []; originalLines = [line];
      continue;
    }
    if (line.toUpperCase() === 'END:VCARD') {
      if (!current) throw new Error('Confira o arquivo de contatos.');
      originalLines.push(line);
      cards.push({ properties: current, originalLines });
      if (cards.length > 10000) throw new Error('O arquivo contém contatos demais.');
      current = null;
      continue;
    }
    if (!current) throw new Error('Confira o arquivo de contatos.');
    originalLines.push(line);
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
    if (!/^[A-Z0-9.-]+$/.test(name)) throw new Error('Confira o arquivo de contatos.');
    const encoding = /(?:^|;)ENCODING\s*=\s*"?([^;"]+)/i.exec(parameters)?.[1]?.toUpperCase();
    const charset = /(?:^|;)CHARSET\s*=\s*"?([^;"]+)/i.exec(parameters)?.[1] || 'utf-8';
    const original = line.slice(colon + 1);
    let decoded = original;
    try {
      if (encoding === 'QUOTED-PRINTABLE') {
        const bytes: number[] = [];
        for (let i = 0; i < original.length; i++) {
          if (original[i] === '=') {
            const hex = original.slice(i + 1, i + 3);
            if (!/^[0-9a-f]{2}$/i.test(hex)) throw new Error('invalid');
            bytes.push(parseInt(hex, 16)); i += 2;
          } else {
            const code = original.charCodeAt(i);
            if (code > 127) throw new Error('invalid');
            bytes.push(code);
          }
        }
        decoded = new TextDecoder(charset, { fatal: true }).decode(new Uint8Array(bytes));
      } else if (encoding === 'B' || encoding === 'BASE64') {
        const binary = atob(original.replace(/\s/g, ''));
        if (!['PHOTO', 'LOGO', 'SOUND', 'KEY'].includes(name.split('.').pop() || name)) {
          decoded = new TextDecoder(charset, { fatal: true }).decode(Uint8Array.from(binary, char => char.charCodeAt(0)));
        }
      } else if (encoding && encoding !== '8BIT') throw new Error('invalid');
    } catch { throw new Error('Não foi possível ler todas as informações do arquivo de contatos.'); }
    const value = decoded.replace(/\\([nN,;\\])/g, (_, escaped: string) => escaped.toLowerCase() === 'n' ? '\n' : escaped);
    current.push({ name, parameters, value });
  }
  if (current || !cards.length) throw new Error('Confira o arquivo de contatos.');
  return cards;
}
