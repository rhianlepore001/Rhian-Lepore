import { describe, expect, it } from 'vitest';
import { autoMapColumns, normalizeDate, normalizeDuration, normalizePhone, normalizePrice } from '../../utils/importPreparation';

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

  it('aceita dia e mês com um dígito e mantém a dúvida nos casos ambíguos', () => {
    expect(normalizeDate('5/3/1990')).toBe('1990-03-05');
    expect(normalizeDate('05/3/1990')).toBe('1990-03-05');
    expect(normalizeDate(' 5/03/1990 ')).toBe('1990-03-05');
    expect(normalizeDate('5/3/90')).toBeNull();
    expect(normalizeDate('0/3/1990')).toBeNull();
    expect(normalizeDate('31/4/1990')).toBeNull();
  });

  it('aceita preços com símbolo, com ou sem espaço, e recusa o que é ambíguo', () => {
    expect(normalizePrice('R$ 12')).toBe(12);
    expect(normalizePrice('R$12')).toBe(12);
    expect(normalizePrice('r$ 12,5')).toBe(12.5);
    expect(normalizePrice('R$\u00a012,00')).toBe(12);
    expect(normalizePrice('12 €')).toBe(12);
    expect(normalizePrice('€ 12,50')).toBe(12.5);
    expect(normalizePrice('R$ 1.200')).toBeNull();
    expect(normalizePrice('R$ 1,200.50')).toBeNull();
    expect(normalizePrice('R$')).toBeNull();
  });
});
