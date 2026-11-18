import { describe, expect, it } from 'vitest';
import { CHAIR_HOUR_COST_EXAMPLE, CHAIR_HOUR_COST_FORMULA } from '@/utils/chairHourFormulaCopy';

describe('chairHourFormulaCopy — alinhada ao get_chair_hour_v1', () => {
  it('divide as duas parcelas por horas abertas, inclui a taxa e calcula a sobra na hora aberta', () => {
    expect(CHAIR_HOUR_COST_FORMULA).toBe(
      'Custo da hora = contas do mês ÷ horas abertas + (material + comissão já cadastrada + taxa da maquininha) ÷ horas abertas. Sobra = o que a hora aberta rendeu − esse custo.',
    );
    expect(CHAIR_HOUR_COST_FORMULA).not.toMatch(/horas atendidas|hora atendida/i);
    expect(CHAIR_HOUR_COST_FORMULA).toMatch(/taxa da maquininha/);
  });

  it('exemplo numérico fecha com a mesma fórmula do SQL', () => {
    // contas 2.000 ÷ 160 h abertas
    expect(2000 / 160).toBe(12.5);
    // material + comissão + taxa 800 ÷ 160 h abertas
    expect(800 / 160).toBe(5);
    // custo da hora = 12,50 + 5,00
    expect(12.5 + 5).toBe(17.5);
    // sobra = rendimento por hora aberta − custo (50 − 17,50)
    expect(50 - 17.5).toBe(32.5);
    expect(CHAIR_HOUR_COST_EXAMPLE).toBe(
      'Hora aberta: na agenda, com ou sem cliente. Ex.: contas 2.000 ÷ 160 h abertas = 12,50; material, comissão e taxa 800 ÷ 160 = 5,00. Custo 17,50. Rendeu 50 por hora aberta, sobra 32,50.',
    );
    expect(CHAIR_HOUR_COST_EXAMPLE).not.toMatch(/horas atendidas|hora atendida|42,50|37,50/i);
  });
});
