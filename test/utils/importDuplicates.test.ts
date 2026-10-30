import { describe, expect, it } from 'vitest';
import { foldImportName, findImportMatches, phoneKeys, repeatedPhoneRows } from '../../utils/importDuplicates';

const existing = [
  { id: 'a', name: 'José Fictício', phone: '(11) 99999-7777', email: 'jose@example.test', additional_phones: ['(21) 98888-6666'] },
  { id: 'b', name: 'Outra Pessoa Fictícia', phone: '5511977770000', email: null, additional_phones: null },
  { id: 'c', name: 'Maria Fictícia', phone: '912 345 678', email: null, additional_phones: [] },
];

describe('conferência de cadastros parecidos', () => {
  it('compara nomes sem acento, sem maiúsculas e sem espaços repetidos', () => {
    expect(foldImportName('  JOSÉ   Fictício ')).toBe('jose ficticio');
    expect(foldImportName('Ação')).toBe(foldImportName('acao'));
  });
  it('usa o telefone completo, com DDD, com ou sem o código do país', () => {
    expect(phoneKeys('+5511999997777')).toEqual(['5511999997777', '11999997777']);
    expect(phoneKeys('+351912345678')).toEqual(['351912345678', '912345678']);
    expect(phoneKeys('11 99999-7777')).toEqual(['11999997777']);
  });
  it('encontra o telefone formatado de forma diferente', () => {
    expect(findImportMatches({ name: 'Nome Diferente', phones: ['+5511999997777'] }, existing, 'client')).toEqual([{ id: 'a', reason: 'phone' }]);
    expect(findImportMatches({ name: 'Nome Diferente', phones: ['+5511977770000'] }, existing, 'client')).toEqual([{ id: 'b', reason: 'phone' }]);
    expect(findImportMatches({ name: 'Nome Diferente', phones: ['+351912345678'] }, existing, 'client')).toEqual([{ id: 'c', reason: 'phone' }]);
    expect(findImportMatches({ name: 'Nome Diferente', phones: ['+5521988886666'] }, existing, 'client')).toEqual([{ id: 'a', reason: 'phone' }]);
  });
  it('não confunde telefones com os mesmos últimos dígitos e DDD diferente', () => {
    expect(findImportMatches({ name: 'Nome Diferente', phones: ['+5521999997777'] }, existing, 'client')).toEqual([]);
  });
  it('encontra pelo nome sem acento e pelo e-mail em qualquer caixa', () => {
    expect(findImportMatches({ name: 'jose ficticio', phones: [] }, existing, 'client')).toEqual([{ id: 'a', reason: 'name' }]);
    expect(findImportMatches({ name: 'Nome Diferente', phones: [], email: 'JOSE@example.test' }, existing, 'client')).toEqual([{ id: 'a', reason: 'email' }]);
  });
  it('serviços comparam apenas o nome', () => {
    expect(findImportMatches({ name: 'JOSÉ fictício', phones: ['+5511999997777'] }, existing, 'service')).toEqual([{ id: 'a', reason: 'name' }]);
  });
  it('indica as linhas que repetem um telefone do mesmo arquivo', () => {
    const rows = [
      { id: '1', phones: ['+5511977771111'] },
      { id: '2', phones: ['+5511977772222'] },
      { id: '3', phones: ['+5511977771111'] },
      { id: '4', phones: ['11977771111'] },
      { id: '5', phones: [] },
    ];
    expect([...repeatedPhoneRows(rows)]).toEqual(['3', '4']);
  });
});
