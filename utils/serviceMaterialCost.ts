export type MaterialYieldMode = 'count' | 'quantity';

export interface MaterialCostLine {
  name: string;
  mode: MaterialYieldMode;
  packagePrice: number | null;
  yieldCount?: number | null;
  packageQty?: number | null;
  qtyPerService?: number | null;
}

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function costPerService(line: MaterialCostLine): number | null {
  if (!isFiniteNumber(line.packagePrice) || line.packagePrice < 0) return null;
  if (line.mode === 'count') {
    if (!isFiniteNumber(line.yieldCount) || line.yieldCount <= 0) return null;
    return line.packagePrice / line.yieldCount;
  }
  if (!isFiniteNumber(line.packageQty) || line.packageQty <= 0) return null;
  if (!isFiniteNumber(line.qtyPerService) || line.qtyPerService < 0) return null;
  return line.packagePrice * (line.qtyPerService / line.packageQty);
}

export function totalServiceMaterialCost(lines: MaterialCostLine[]): number | null {
  const values = lines.map(costPerService).filter((value): value is number => value !== null);
  if (!values.length) return null;
  return roundMoney(values.reduce((sum, value) => sum + value, 0));
}
