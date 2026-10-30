import { describe, expect, it } from 'vitest';
import { decodeImportText, readImportFiles, vcardSheet } from '../../utils/importFiles';
import { readVcards } from '../../utils/importVcard';

describe('preparo de contatos', () => {
  it('mantém todos os telefones e propriedades de origem', () => {
    const cards = readVcards('BEGIN:VCARD\nVERSION:3.0\nFN:Ana Fictícia\nTEL;TYPE=CELL:+5511987654321\nTEL;TYPE=HOME:+551133334444\nEMAIL:ana@example.test\nX-INFO:informação fictícia\nEND:VCARD');
    const sheet = vcardSheet(cards);
    expect(sheet.headers).toEqual(['Nome','Telefone 1','Telefone 2','E-mail','Nascimento','Observações','ID']);
    expect(sheet.rows[0].values.slice(0,4)).toEqual(['Ana Fictícia','+5511987654321','+551133334444','ana@example.test']);
    expect(sheet.originals[0].properties).toEqual(cards[0].properties);
    expect(sheet.originals[0].originalLines).toContain('X-INFO:informação fictícia');
  });
});

describe('leitura de texto de arquivos antigos', () => {
  it('lê UTF-8 normalmente', () => {
    expect(decodeImportText(new TextEncoder().encode('Nome\nJosé Fictício')).text).toBe('Nome\nJosé Fictício');
    expect(decodeImportText(new TextEncoder().encode('Nome\nJosé')).legacy).toBe(false);
  });
  it('usa a codificação antiga do Windows quando o arquivo não é UTF-8', () => {
    const bytes = Uint8Array.from([0x4e, 0x6f, 0x6d, 0x65, 0x0a, 0x4a, 0x6f, 0x73, 0xe9, 0x20, 0x41, 0xe7, 0xe3, 0x6f]);
    const result = decodeImportText(bytes);
    expect(result.text).toBe('Nome\nJosé Ação');
    expect(result.legacy).toBe(true);
  });
  it('importa um CSV antigo e avisa para conferir os acentos', async () => {
    const bytes = Uint8Array.from([...new TextEncoder().encode('Nome,Celular\n'), 0x4a, 0x6f, 0x73, 0xe9, ...new TextEncoder().encode(' Fictício,11987654321')]);
    const file = { name: 'antigo.csv', size: bytes.byteLength, arrayBuffer: async () => Buffer.from(bytes) as unknown as ArrayBuffer } as unknown as File;
    const [sheet] = await readImportFiles([file]);
    expect(sheet.rows[0].values[0]).toMatch(/^José/);
    expect(sheet.warnings.join(' ')).toMatch(/acentos/);
    expect(sheet.warnings.join(' ')).not.toMatch(/UTF|codifica/i);
  });
});
