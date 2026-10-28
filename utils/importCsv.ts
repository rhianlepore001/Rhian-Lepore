export interface CsvRecord { line: number; values: string[] }

function detectSeparator(text: string): string {
  let quoted = false, commas = 0, semicolons = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') i++;
      else quoted = !quoted;
    } else if (!quoted && (char === '\n' || char === '\r')) break;
    else if (!quoted && char === ',') commas++;
    else if (!quoted && char === ';') semicolons++;
  }
  return semicolons > commas ? ';' : ',';
}

export function readImportCsv(input: string): CsvRecord[] {
  const text = input.replace(/^\uFEFF/, '');
  const separator = detectSeparator(text);
  const rows: CsvRecord[] = [];
  let values: string[] = [], field = '', line = 1, start = 1, quoted = false, closed = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (char === '"') { quoted = false; closed = true; }
      else {
        field += char;
        if (char === '\n' || (char === '\r' && text[i + 1] !== '\n')) line++;
      }
    } else if (char === '"') {
      if (field || closed) throw new Error('Confira as aspas do arquivo.');
      quoted = true;
    } else if (char === separator) {
      values.push(field); field = ''; closed = false;
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      values.push(field); rows.push({ line: start, values });
      values = []; field = ''; closed = false; line++; start = line;
    } else {
      if (closed) throw new Error('Confira as aspas do arquivo.');
      field += char;
    }
  }
  if (quoted) throw new Error('Confira as aspas do arquivo.');
  if (field || values.length || closed) { values.push(field); rows.push({ line: start, values }); }
  return rows;
}
