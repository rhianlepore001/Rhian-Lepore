import { describe, expect, it } from 'vitest';
import { autoMapColumns, findDuplicateCandidates, normalizeDate, normalizeDuration, normalizePhone, normalizePrice } from '../../utils/importPreparation';

describe('preparação de dados para importação', () => {
  it('reconhece apelidos e mantém ambiguidades para revisão', () => {
    expect(autoMapColumns(['Cliente', 'WhatsApp', 'Telefone', 'E-mail', 'ID externo', 'Campo novo'], 'client')).toEqual({
      mapping: { name: 0, email: 3, sourceId: 4 }, ambiguous: { phone: [1, 2] }, unmapped: [5],
    });
    expect(autoMapColumns(['Nome', 'Categoria', 'Valor', 'Duração'], 'service')).toEqual({
      mapping: { name: 0, category: 1, price: 2, duration: 3 }, ambiguous: {}, unmapped: [],
    });
  });

  it('normaliza telefones brasileiros e portugueses e recusa números incompletos', () => {
    expect(normalizePhone('(11) 98765-4321', 'BR')).toBe('+5511987654321');
    expect(normalizePhone('912 345 678', 'PT')).toBe('+351912345678');
    expect(normalizePhone('+351 912 345 678', 'BR')).toBe('+351912345678');
    expect(normalizePhone('123', 'BR')).toBeNull();
  });

  it('interpreta preço e duração sem truncar valores inválidos', () => {
    expect(normalizePrice('R$ 1.285,50')).toBe(1285.5);
    expect(normalizePrice('85,00')).toBe(85);
    expect(normalizePrice('-2')).toBeNull();
    expect(normalizePrice('1,2,3')).toBeNull();
    expect(normalizeDuration('1h30')).toBe(90);
    expect(normalizeDuration('45 min')).toBe(45);
    expect(normalizeDuration('1h90')).toBeNull();
  });

  it('normaliza datas válidas e preserva a dúvida sobre datas ambíguas', () => {
    expect(normalizeDate('29/02/2000')).toBe('2000-02-29');
    expect(normalizeDate('2024-12-31')).toBe('2024-12-31');
    expect(normalizeDate('31/02/2000')).toBeNull();
    expect(normalizeDate('')).toBeNull();
  });

  it('sugere possíveis duplicados sem escolher, inclusive por nome', () => {
    const existing = [
      { id: 'a', name: 'Ana Exemplo', phones: ['+5511987654321'] },
      { id: 'b', name: 'Ana Exemplo', phones: [] },
      { id: 'c', name: 'Outro Nome', phones: ['+5511987654321'] },
    ];
    expect(findDuplicateCandidates({ name: 'ana exemplo', phones: ['+5511987654321'] }, existing)).toEqual([
      { id: 'a', reason: 'phone' }, { id: 'b', reason: 'name' }, { id: 'c', reason: 'phone' },
    ]);
  });
});
