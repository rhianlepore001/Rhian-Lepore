import { describe, expect, it } from 'vitest';
import { costPerService, roundMoney, totalServiceMaterialCost } from '@/utils/serviceMaterialCost';

describe('serviceMaterialCost', () => {
  it('modo rendimento: 20 / 40 = 0,5 por atendimento', () => {
    expect(costPerService({ name: 'Giletes', mode: 'count', packagePrice: 20, yieldCount: 40 })).toBe(0.5);
  });

  it('modo quantidade: 100 * (60 / 1000) = 6', () => {
    expect(costPerService({ name: 'Shampoo', mode: 'quantity', packagePrice: 100, packageQty: 1000, qtyPerService: 60 })).toBe(6);
  });

  it('soma duas linhas válidas sem arredondar cada linha antes do total', () => {
    expect(
      totalServiceMaterialCost([
        { name: 'A', mode: 'count', packagePrice: 20, yieldCount: 40 },
        { name: 'B', mode: 'quantity', packagePrice: 100, packageQty: 1000, qtyPerService: 60 },
      ]),
    ).toBe(6.5);
  });

  it('ignora linha inválida no total se outra for válida', () => {
    expect(
      totalServiceMaterialCost([
        { name: 'inv', mode: 'count', packagePrice: 20, yieldCount: 0 },
        { name: 'ok', mode: 'count', packagePrice: 20, yieldCount: 40 },
      ]),
    ).toBe(0.5);
  });

  it('todas inválidas → null (não informado)', () => {
    expect(totalServiceMaterialCost([{ name: 'x', mode: 'count', packagePrice: null, yieldCount: 40 }])).toBeNull();
    expect(totalServiceMaterialCost([])).toBeNull();
  });

  it('rendimento zero → null', () => {
    expect(costPerService({ name: 'x', mode: 'count', packagePrice: 20, yieldCount: 0 })).toBeNull();
  });

  it('preço zero com rendimento válido → 0 informado', () => {
    expect(costPerService({ name: 'x', mode: 'count', packagePrice: 0, yieldCount: 40 })).toBe(0);
  });

  it('roundMoney arredonda para duas casas', () => {
    expect(roundMoney(10 / 3)).toBe(3.33);
    expect(roundMoney(20 / 3)).toBe(6.67);
  });

  it('total arredonda só no final: três vezes 20/3 somam 20', () => {
    const line = { name: 'x', mode: 'count' as const, packagePrice: 20, yieldCount: 3 };
    expect(totalServiceMaterialCost([line, line, line])).toBe(20);
  });
});