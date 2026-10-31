import { describe, expect, it } from 'vitest';
import { readImportCsv } from '../../utils/importCsv';

describe('leitura de planilha CSV', () => {
  it('preserva todas as colunas, linhas vazias e posição das linhas', () => {
    expect(readImportCsv('\uFEFFCliente;Contato;Campo extra\r\n"Ana, Exemplo";"11\n99999";valor\r\n;;\r\nBia;912345678;outro')).toEqual([
      { line: 1, values: ['Cliente', 'Contato', 'Campo extra'] },
      { line: 2, values: ['Ana, Exemplo', '11\n99999', 'valor'] },
      { line: 4, values: ['', '', ''] },
      { line: 5, values: ['Bia', '912345678', 'outro'] },
    ]);
  });
  it('aceita CSV com vírgula e aspas escapadas', () => {
    expect(readImportCsv('Nome,Contato\n"Ana ""Exemplo""",11999990000')[1].values).toEqual(['Ana "Exemplo"', '11999990000']);
  });
  it('recusa aspas incompletas ou caracteres após o fechamento', () => {
    expect(() => readImportCsv('Nome,Telefone\n"Ana,123')).toThrow();
    expect(() => readImportCsv('Nome,Telefone\n"Ana"erro,123')).toThrow();
  });
});
