import { describe, expect, it } from 'vitest';
import { dropEmptyImportRows, inferImportColumns, prepareImportRows } from '../../utils/importRows';

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
  it('reconhece cabeçalhos reais do Booksy: celular e sobrenome juntos ao nome', () => {
    const headers = ['Name', 'Surname', 'Cell phone', 'Email', 'Birthday', 'Notes'];
    const mapping = inferImportColumns(headers, 'booksy', 'client');
    expect(mapping).toEqual(expect.objectContaining({ name: [0, 1], phone: [2], email: [3], birth_date: [4], notes: [5] }));
    const [row] = prepareImportRows(headers, [{ line: 2, values: ['Priscila', 'Pinto Batista', '5585969845238', 'p@example.test', '1992-10-21', 'PIX'] }], mapping, 'client', 'BR', 'booksy');
    expect(row.normalized).toEqual(expect.objectContaining({ name: 'Priscila Pinto Batista', phones: ['+5585969845238'] }));
    expect(row.issues).toEqual([]);
  });
  it('junta Nome e Sobrenome de qualquer origem, sem mexer em quem já tem nome completo', () => {
    expect(inferImportColumns(['Nome', 'Sobrenome', 'Telefone'], 'trinks', 'client').name).toEqual([0, 1]);
    expect(inferImportColumns(['Nome completo', 'Sobrenome'], 'trinks', 'client').name).toEqual([0]);
  });
  it('reconhece Fresha: celular e notas do cliente, data com traços', () => {
    const headers = ['First name', 'Last name', 'Email', 'Mobile phone', 'Birthday', 'Client notes'];
    const mapping = inferImportColumns(headers, 'fresha', 'client');
    expect(mapping).toEqual(expect.objectContaining({ name: [0, 1], phone: [3], notes: [5] }));
    const [row] = prepareImportRows(headers, [{ line: 2, values: ['Ana', 'Souza', 'a@example.test', '11987654321', '04-05-1991', 'Nota'] }], mapping, 'client', 'BR', 'fresha');
    expect(row.normalized).toEqual(expect.objectContaining({ birth_date: '1991-05-04', notes: 'Nota' }));
    expect(row.issues).toEqual([]);
  });
  it('reconhece serviço com cabeçalhos entre parênteses (Avec) e duração em horas:minutos', () => {
    const headers = ['SERVIÇO', 'GRUPO', 'TEMPO (MIN)', 'PREÇO (R$)'];
    const mapping = inferImportColumns(headers, 'avec', 'service');
    expect(mapping).toEqual({ name: [0], category: [1], duration: [2], price: [3] });
    const [row] = prepareImportRows(headers, [{ line: 2, values: ['Corte', 'Cabelo', '45', '65,00'] }], mapping, 'service', 'BR', 'avec');
    expect(row.normalized).toEqual(expect.objectContaining({ price: 65, duration: 45, category: 'Cabelo' }));
    expect(row.issues).toEqual([]);
  });
  it('ignora linhas totalmente vazias e mantém o número original das demais', () => {
    const records = [{ line: 2, values: ['Ana', '1'] }, { line: 3, values: ['', ' '] }, { line: 4, values: ['Bia', '2'] }, { line: 5, values: [] }];
    expect(dropEmptyImportRows(records).map(record => record.line)).toEqual([2, 4]);
    expect(dropEmptyImportRows([{ line: 2, values: ['', '123'] }])).toHaveLength(1);
  });
});
