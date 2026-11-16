import { describe, expect, it } from 'vitest';
import { hasOpenBusinessHours, setupProgress, setupProgressLabel } from '@/utils/hourlyResultsSetup';

describe('hourlyResultsSetup', () => {
  it('nada configurado → 0 de 4', () => {
    const p = setupProgress({ hasActiveCost: false, hasOpenHours: false, hasMaterial: false, marginSaved: false });
    expect(p.configured).toBe(0);
    expect(p.total).toBe(4);
    expect(setupProgressLabel(p.configured)).toBe('0 de 4 configurados');
    expect(p.blocks.costs).toBe(false);
    expect(p.blocks.hours).toBe(false);
    expect(p.blocks.materials).toBe(false);
    expect(p.blocks.margin).toBe(false);
  });

  it('contas e horários → 2 de 4', () => {
    const p = setupProgress({ hasActiveCost: true, hasOpenHours: true, hasMaterial: false, marginSaved: false });
    expect(p.configured).toBe(2);
    expect(setupProgressLabel(p.configured)).toBe('2 de 4 configurados');
  });

  it('marginSaved false mesmo quando o default conceitual seria 20%', () => {
    const p = setupProgress({ hasActiveCost: true, hasOpenHours: true, hasMaterial: true, marginSaved: false });
    expect(p.blocks.margin).toBe(false);
    expect(p.configured).toBe(3);
  });

  it('hasOpenBusinessHours detecta bloco com início antes do fim', () => {
    expect(hasOpenBusinessHours({ mon: { isOpen: true, blocks: [{ start: '09:00', end: '18:00' }] } })).toBe(true);
    expect(hasOpenBusinessHours({ mon: { isOpen: true, blocks: [{ start: '18:00', end: '09:00' }] } })).toBe(false);
    expect(hasOpenBusinessHours({ mon: { isOpen: false, blocks: [{ start: '09:00', end: '18:00' }] } })).toBe(false);
    expect(hasOpenBusinessHours(null)).toBe(false);
    expect(hasOpenBusinessHours(undefined)).toBe(false);
  });
});