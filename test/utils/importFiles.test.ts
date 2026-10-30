import { describe, expect, it } from 'vitest';
import { vcardSheet } from '../../utils/importFiles';
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
