import type { CsvRecord } from './importCsv';

export interface SpreadsheetSheet { name: string; rows: CsvRecord[] }
const MAX_ARCHIVE = 5 * 1024 * 1024;
const MAX_EXPANDED = 20 * 1024 * 1024;
const MAX_ENTRIES = 200;

function fail(): never { throw new Error('Não foi possível ler a planilha. Confira o arquivo e tente novamente.'); }

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

async function inflate(data: Uint8Array, size: number): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') throw new Error('Este navegador não consegue abrir esta planilha. Atualize o navegador e tente novamente.');
  const stream = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(data); controller.close(); } });
  let reader: ReadableStreamDefaultReader<Uint8Array>;
  try { reader = stream.pipeThrough(new DecompressionStream('deflate-raw')).getReader(); } catch { return fail(); }
  const parts: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > size || length > MAX_EXPANDED) { await reader.cancel(); return fail(); }
      parts.push(value);
    }
  } catch { return fail(); }
  if (length !== size) return fail();
  const result = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) { result.set(part, offset); offset += part.length; }
  return result;
}

interface ZipEntry { path: string; method: number; compressed: number; size: number; crc: number; offset: number }
async function unzip(bytes: Uint8Array): Promise<Map<string, Uint8Array>> {
  if (bytes.length > MAX_ARCHIVE || bytes.length < 22) return fail();
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50 && i + 22 + view.getUint16(i + 20, true) === bytes.length) { end = i; break; }
  }
  if (end < 0 || view.getUint16(end + 4, true) || view.getUint16(end + 6, true)) return fail();
  const count = view.getUint16(end + 10, true), centralOffset = view.getUint32(end + 16, true), centralSize = view.getUint32(end + 12, true);
  if (count > MAX_ENTRIES || count !== view.getUint16(end + 8, true) || centralOffset + centralSize > end) return fail();
  const entries: ZipEntry[] = [];
  const names = new Set<string>();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let cursor = centralOffset, total = 0;
  try {
    for (let n = 0; n < count; n++) {
      if (cursor + 46 > end || view.getUint32(cursor, true) !== 0x02014b50) return fail();
      const flags = view.getUint16(cursor + 8, true), method = view.getUint16(cursor + 10, true);
      const crc = view.getUint32(cursor + 16, true), compressed = view.getUint32(cursor + 20, true), size = view.getUint32(cursor + 24, true);
      const nameLength = view.getUint16(cursor + 28, true), extra = view.getUint16(cursor + 30, true), comment = view.getUint16(cursor + 32, true);
      const offset = view.getUint32(cursor + 42, true), next = cursor + 46 + nameLength + extra + comment;
      if (next > centralOffset + centralSize || (flags & 1) || ![0, 8].includes(method) || size > MAX_EXPANDED || offset + 30 > centralOffset) return fail();
      const path = decoder.decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength));
      if (!path || path.startsWith('/') || path.includes('\\') || path.split('/').includes('..') || names.has(path)) return fail();
      names.add(path); total += size;
      if (total > MAX_EXPANDED) return fail();
      entries.push({ path, method, compressed, size, crc, offset });
      cursor = next;
    }
    if (cursor !== centralOffset + centralSize) return fail();
    const result = new Map<string, Uint8Array>();
    for (const entry of entries) {
      const offset = entry.offset;
      if (view.getUint32(offset, true) !== 0x04034b50) return fail();
      const nameLength = view.getUint16(offset + 26, true), extraLength = view.getUint16(offset + 28, true);
      const start = offset + 30 + nameLength + extraLength;
      if (start + entry.compressed > centralOffset || view.getUint16(offset + 8, true) !== entry.method
        || (view.getUint16(offset + 6, true) & 1) || decoder.decode(bytes.subarray(offset + 30, offset + 30 + nameLength)) !== entry.path) return fail();
      const data = bytes.subarray(start, start + entry.compressed);
      const content = entry.method === 0 ? data : await inflate(data, entry.size);
      if (content.length !== entry.size || crc32(content) !== entry.crc) return fail();
      result.set(entry.path, content);
    }
    return result;
  } catch { return fail(); }
}

function parseXml(bytes: Uint8Array | undefined): Document {
  if (!bytes) return fail();
  let text: string;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { return fail(); }
  if (/<!DOCTYPE|<!ENTITY/i.test(text)) return fail();
  const document = new DOMParser().parseFromString(text, 'application/xml');
  if (document.getElementsByTagName('parsererror').length) return fail();
  return document;
}

function elements(element: Document | Element, tag: string): Element[] {
  return Array.from(element.getElementsByTagNameNS('*', tag));
}

function columnNumber(reference: string): number {
  const match = /^([A-Z]+)[1-9][0-9]*$/.exec(reference);
  if (!match) return fail();
  let result = 0;
  for (const char of match[1]) result = result * 26 + char.charCodeAt(0) - 64;
  if (result > 2048) return fail();
  return result - 1;
}

export async function readImportXlsx(bytes: Uint8Array): Promise<SpreadsheetSheet[]> {
  const zip = await unzip(bytes);
  const workbook = parseXml(zip.get('xl/workbook.xml'));
  const relationships = parseXml(zip.get('xl/_rels/workbook.xml.rels'));
  const shared = zip.has('xl/sharedStrings.xml')
    ? elements(parseXml(zip.get('xl/sharedStrings.xml')), 'si').map(item => elements(item, 't').map(part => part.textContent || '').join('')) : [];
  const relations = new Map<string, string>();
  for (const relation of elements(relationships, 'Relationship')) {
    if (relation.getAttribute('TargetMode') === 'External') continue;
    const id = relation.getAttribute('Id'), target = relation.getAttribute('Target');
    if (!id || !target || target.includes('..') || target.includes('\\')) return fail();
    relations.set(id, target.startsWith('/') ? target.slice(1) : `xl/${target}`);
  }
  const result: SpreadsheetSheet[] = [];
  let totalRows = 0;
  for (const sheet of elements(workbook, 'sheet')) {
    const name = sheet.getAttribute('name');
    const id = sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
    if (!name || !id || !relations.has(id)) return fail();
    const document = parseXml(zip.get(relations.get(id)!));
    if (elements(document, 'mergeCell').length || elements(document, 'f').length) throw new Error('A planilha contém células mescladas ou fórmulas. Salve uma cópia apenas com valores antes de continuar.');
    const rows: CsvRecord[] = [];
    let previousLine = 0;
    for (const row of elements(document, 'row')) {
      const line = Number(row.getAttribute('r'));
      if (!Number.isSafeInteger(line) || line < 1 || line <= previousLine || line > 1000000) return fail();
      previousLine = line;
      const values: string[] = [];
      let previousColumn = -1;
      for (const cell of elements(row, 'c')) {
        const reference = cell.getAttribute('r') || '';
        const column = columnNumber(reference);
        if (column <= previousColumn || Number(reference.match(/[0-9]+$/)?.[0]) !== line) return fail();
        previousColumn = column;
        while (values.length < column) values.push('');
        const type = cell.getAttribute('t');
        const raw = elements(cell, 'v')[0]?.textContent ?? '';
        if (type === 'e') return fail();
        if (type === 's') {
          if (!/^\d+$/.test(raw) || Number(raw) >= shared.length) return fail();
          values.push(shared[Number(raw)]);
        } else if (type === 'inlineStr') values.push(elements(cell, 't').map(part => part.textContent || '').join(''));
        else values.push(raw);
      }
      rows.push({ line, values });
      if (++totalRows > 10000) throw new Error('A planilha contém linhas demais.');
    }
    result.push({ name, rows });
  }
  if (!result.length) return fail();
  return result;
}
