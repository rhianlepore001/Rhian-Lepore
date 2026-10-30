import { describe, expect, it } from 'vitest';
import { inferImportColumns, prepareImportRows } from '../../utils/importRows';

describe('preparo de arquivos fictícios', () => {
  it('reconhece colunas Trinks e mantém múltiplos telefones e dados extras', () => {
    const headers = ['Nome', 'Celular', 'Telefone', 'E-mail', 'Nascimento', 'Código Cliente', 'Observações', 'Informação adicional'];
    const mapping = inferImportColumns(headers, 'trinks', 'client');
    expect(mapping.phone).toEqual([1, 2]);
    const rows = prepareImportRows(headers, [{ line: 2, values: ['Ana Fictícia','11987654321','1133334444','ana@example.test','04/05/1991','A-10','Nota fictícia','Extra'] }], mapping, 'client', 'BR', 'arquivo-ficticio');
    expect(rows[0].normalized).toEqual(expect.objectContaining({ name: 'Ana Fictícia', phones: ['+5511987654321', '+551133334444'], email: 'ana@example.test', birth_date: '1991-05-04', source_id: 'A-10' }));
    expect(rows[0].raw).toEqual(expect.objectContaining({ values: expect.arrayContaining(['Extra']) }));
    expect(rows[0].issues).toEqual([]);
  });
  it('reconhece serviço Fresha e gera identificação estável quando não há ID', () => {
    const headers = ['Service name', 'Price', 'Duration'];
    const mapping = inferImportColumns(headers, 'fresha', 'service');
    const [row] = prepareImportRows(headers, [{ line: 2, values: ['Tratamento fictício','R$ 85,00','1h30'] }], mapping, 'service', 'BR', 'arquivo-ficticio');
    expect(row.normalized).toEqual(expect.objectContaining({ name:'Tratamento fictício', price:85, duration:90, source_id:'arquivo-ficticio:2' }));
    expect(row.issues).toEqual([]);
  });
  it('mantém linhas inválidas para revisão com motivo', () => {
    const headers = ['Nome', 'Telefone', 'Nascimento'];
    const [row] = prepareImportRows(headers, [{ line: 4, values: ['', '123', '31/02/2000'] }], inferImportColumns(headers, 'trinks', 'client'), 'client', 'BR', 'arquivo-ficticio');
    expect(row.issues.length).toBeGreaterThanOrEqual(3);
    expect(row.normalized.phoneText).toBe('123');
    expect(row.normalized.birth_date).toBe('31/02/2000');
    expect(row.line).toBe(4);
  });
  it('separa os vínculos por arquivo e aba com um escopo curto e estável', () => {
    const headers = ['Nome', 'ID'];
    const mapping = inferImportColumns(headers, 'spreadsheet', 'client');
    const hash = 'a'.repeat(64);
    const [first] = prepareImportRows(headers, [{ line: 2, values: ['Ana Fictícia', '7'] }], mapping, 'client', 'BR', `${hash}:0`);
    const [again] = prepareImportRows(headers, [{ line: 2, values: ['Ana Fictícia', '7'] }], mapping, 'client', 'BR', `${hash}:0`);
    const [other] = prepareImportRows(headers, [{ line: 2, values: ['Ana Fictícia', '7'] }], mapping, 'client', 'BR', `${'b'.repeat(64)}:0`);
    const [sheet] = prepareImportRows(headers, [{ line: 2, values: ['Ana Fictícia', '7'] }], mapping, 'client', 'BR', `${hash}:1`);
    expect(String(first.normalized.source_scope).length).toBeLessThanOrEqual(64);
    expect(first.normalized.source_id).toBe('7');
    expect(again.normalized.source_scope).toBe(first.normalized.source_scope);
    expect(other.normalized.source_scope).not.toBe(first.normalized.source_scope);
    expect(sheet.normalized.source_scope).not.toBe(first.normalized.source_scope);
  });
  it('guarda e-mail e observações vazios como vazio, não como texto', () => {
    const headers = ['Nome', 'E-mail', 'Observações'];
    const [row] = prepareImportRows(headers, [{ line: 2, values: ['Ana Fictícia', '', ''] }], inferImportColumns(headers, 'spreadsheet', 'client'), 'client', 'BR', 'x:0');
    expect(row.normalized.email).toBeNull();
    expect(row.normalized.notes).toBeNull();
  });
});
