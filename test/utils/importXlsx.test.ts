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
  it('apresenta o valor salvo de fórmulas e solicita revisão', async () => {
    const bytes = readFileSync(resolve('test/fixtures/import/formula-ficticia.xlsx'));
    const sheets = await readImportXlsx(bytes);
    expect(sheets[0].rows[1].values[3]).toBe('3');
    expect(sheets[0].formulas?.D2).toBe('SUM(1,2)');
    expect(sheets[0].warnings).toContain('A planilha contém fórmulas; confira os valores apresentados.');
  });
  it('interpreta datas e durações formatadas no Excel', async () => {
    const bytes = readFileSync(resolve('test/fixtures/import/datas-ficticias.xlsx'));
    const sheets = await readImportXlsx(bytes);
    expect(sheets[0].rows[1].values).toEqual(['Cliente fictício','1991-05-04','90 min']);
    expect(sheets[0].cellSources?.B2.raw).toBe('33362');
  });
  it('recusa arquivos inválidos e maiores que o limite', async () => {
    await expect(readImportXlsx(new Uint8Array([0, 1, 2]))).rejects.toThrow();
    const corrupted = new Uint8Array(readFileSync(resolve('test/fixtures/import/ficticio.xlsx')));
    corrupted[30] ^= 1;
    await expect(readImportXlsx(corrupted)).rejects.toThrow();
    await expect(readImportXlsx(new Uint8Array(5 * 1024 * 1024 + 1))).rejects.toThrow();
  });
});
