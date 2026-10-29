import { describe, expect, it } from 'vitest';
import { readVcards } from '../../utils/importVcard';

describe('leitura de contatos', () => {
  it('preserva vários telefones, dados adicionais e linhas dobradas', () => {
    const cards = readVcards('BEGIN:VCARD\r\nVERSION:3.0\r\nFN:Ana Fictícia\r\nTEL;TYPE=CELL:+5511987654321\r\nTEL;TYPE=HOME:+551133334444\r\nNOTE:Primeira linha\\nSegunda\r\n continuação\r\nX-CUSTOM:valor\r\nEND:VCARD\r\n');
    expect(cards).toHaveLength(1);
    expect(cards[0].properties).toEqual([
      { name: 'VERSION', parameters: '', value: '3.0' },
      { name: 'FN', parameters: '', value: 'Ana Fictícia' },
      { name: 'TEL', parameters: 'TYPE=CELL', value: '+5511987654321' },
      { name: 'TEL', parameters: 'TYPE=HOME', value: '+551133334444' },
      { name: 'NOTE', parameters: '', value: 'Primeira linha\nSegundacontinuação' },
      { name: 'X-CUSTOM', parameters: '', value: 'valor' },
    ]);
  });
  it('recusa contato incompleto ou formato codificado sem suporte', () => {
    expect(() => readVcards('BEGIN:VCARD\nFN:Ana')).toThrow();
    expect(() => readVcards('BEGIN:VCARD\nFN;ENCODING=QUOTED-PRINTABLE:=C1na\nEND:VCARD')).toThrow();
    expect(() => readVcards('BEGIN:VCARD\nFN:Ana\nBEGIN:VCARD\nEND:VCARD')).toThrow();
  });
  it('separa os contatos sem criar registros vazios', () => {
    expect(readVcards('BEGIN:VCARD\nFN:Ana\nEND:VCARD\nBEGIN:VCARD\nFN:Bruno\nEND:VCARD')).toHaveLength(2);
  });
});
