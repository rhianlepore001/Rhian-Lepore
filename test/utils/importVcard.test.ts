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

describe('contatos exportados em formatos comuns', () => {
  it('interpreta texto quoted-printable com continuação e conjunto de caracteres', () => {
    const cards = readVcards('BEGIN:VCARD\r\nVERSION:2.1\r\nFN;CHARSET=UTF-8;ENCODING=QUOTED-PRINTABLE:Andr=C3=A9=\r\n Silva\r\nEND:VCARD');
    expect(cards[0].properties.find(p => p.name === 'FN')?.value).toBe('André Silva');
  });
  it('preserva anexos em base64 para revisão, sem descartá-los', () => {
    const cards = readVcards('BEGIN:VCARD\nVERSION:3.0\nFN:Ana Fictícia\nPHOTO;ENCODING=b;TYPE=JPEG:Zm90bw==\nEND:VCARD');
    expect(cards[0].properties.find(p => p.name === 'PHOTO')?.value).toBe('Zm90bw==');
  });
  it('aceita continuação base64 sem espaço em arquivos vCard 2.1', () => {
    const cards = readVcards('BEGIN:VCARD\nVERSION:2.1\nFN:Ana Fictícia\nPHOTO;ENCODING=BASE64:Zm90\nbw==\nEND:VCARD');
    expect(cards[0].properties.find(p => p.name === 'PHOTO')?.value).toBe('Zm90bw==');
  });
});
