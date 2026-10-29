import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readImportXlsx } from '../../utils/importXlsx';

describe('leitura de planilha XLSX', () => {
  it('lê todas as células preservando coluna vazia e posição da linha', async () => {
    const bytes = readFileSync(resolve('test/fixtures/import/ficticio.xlsx'));
    const sheets = await readImportXlsx(bytes);
    expect(sheets).toEqual([{ name: 'Clientes', rows: [
      { line: 1, values: ['Nome', 'Telefone'] },
      { line: 2, values: ['Ana Fictícia', '11987654321', '', '85.5'] },
    ] }]);
  });
  it('mantém cada aba disponível para revisão', async () => {
    const bytes = readFileSync(resolve('test/fixtures/import/duas-abas-ficticias.xlsx'));
    const sheets = await readImportXlsx(bytes);
    expect(sheets.map(sheet => sheet.name)).toEqual(['Clientes', 'Servicos']);
    expect(sheets[1].rows[0].values).toEqual(['Serviço fictício']);
  });
  it('lê um arquivo Excel com abas de clientes e serviços', async () => {
    const bytes = readFileSync(resolve('test/fixtures/import/planilha-ficticia-real.xlsx'));
    const sheets = await readImportXlsx(bytes);
    expect(sheets.map(sheet => sheet.name)).toEqual(['Clientes', 'Serviços']);
    expect(sheets[1].rows[1].values).toEqual(['Serviço fictício', '85.5', '90']);
  });
  it('recusa fórmulas para não importar um resultado sem revisão', async () => {
    const bytes = readFileSync(resolve('test/fixtures/import/formula-ficticia.xlsx'));
    await expect(readImportXlsx(bytes)).rejects.toThrow(/fórmulas/);
  });
  it('recusa arquivos inválidos e maiores que o limite', async () => {
    await expect(readImportXlsx(new Uint8Array([0, 1, 2]))).rejects.toThrow();
    const corrupted = new Uint8Array(readFileSync(resolve('test/fixtures/import/ficticio.xlsx')));
    corrupted[30] ^= 1;
    await expect(readImportXlsx(corrupted)).rejects.toThrow();
    await expect(readImportXlsx(new Uint8Array(5 * 1024 * 1024 + 1))).rejects.toThrow();
  });
});
