import { describe, expect, it } from 'vitest';
import {
  allServicesHaveMaterialDecision,
  firstPendingBlock,
  hasOpenBusinessHours,
  pendingSetupWarning,
  setupProgress,
  setupProgressLabel,
  wizardBlockFromLocation,
  type SetupBlockId,
} from '@/utils/hourlyResultsSetup';

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

  it('firstPendingBlock aponta o próximo incompleto na ordem', () => {
    expect(firstPendingBlock({ costs: false, hours: false, materials: false, margin: false })).toBe('costs');
    expect(firstPendingBlock({ costs: true, hours: true, materials: false, margin: false })).toBe('materials');
    expect(firstPendingBlock({ costs: true, hours: true, materials: true, margin: true })).toBeNull();
  });

  it('materiais só completos quando todo serviço tem decisão', () => {
    expect(allServicesHaveMaterialDecision([], [])).toBe(true);
    expect(allServicesHaveMaterialDecision([{ id: 's1' }], [])).toBe(false);
    expect(allServicesHaveMaterialDecision([{ id: 's1' }, { id: 's2' }], [{ service_id: 's1' }])).toBe(false);
    expect(allServicesHaveMaterialDecision([{ id: 's1' }, { id: 's2' }], [{ service_id: 's1' }, { service_id: 's2' }])).toBe(true);
  });

  it.each([
    ['#/configuracoes/financeiro#materiais', 'materials'],
    ['#/configuracoes/financeiro?bloco=contas', 'costs'],
    ['#contas', 'costs'],
    ['#/configuracoes/financeiro', null],
    ['#/configuracoes/financeiro#horarios', 'hours'],
    ['#/configuracoes/financeiro?bloco=margem', 'margin'],
  ] as const)('wizardBlockFromLocation(%s) → %s', (hash, expected) => {
    expect(wizardBlockFromLocation(hash)).toBe(expected);
  });

  it('pendingSetupWarning: só margem pendente', () => {
    const blocks: Record<SetupBlockId, boolean> = { costs: true, hours: true, materials: true, margin: false };
    const w = pendingSetupWarning(blocks);
    expect(w.kind).toBe('margin');
    expect(w.text).toMatch(/definir quando avisar/i);
    expect(w.text).not.toMatch(/custo da hora pode estar baixo/i);
    expect(w.pending).toEqual(['margin']);
  });

  it('pendingSetupWarning: contas e material pendentes', () => {
    const blocks: Record<SetupBlockId, boolean> = { costs: false, hours: true, materials: false, margin: true };
    const w = pendingSetupWarning(blocks);
    expect(w.kind).toBe('cost');
    expect(w.text).toMatch(/Faltam 2 de 4 ajustes/i);
    expect(w.text).toMatch(/contas do mês/i);
    expect(w.text).toMatch(/material/i);
    expect(w.text).toMatch(/custo da hora pode estar baixo/i);
    expect(w.pending).toEqual(expect.arrayContaining(['costs', 'materials']));
    expect(w.pending).toHaveLength(2);
  });

  it('pendingSetupWarning: contas e margem pendentes lista os dois itens', () => {
    const blocks: Record<SetupBlockId, boolean> = { costs: false, hours: true, materials: true, margin: false };
    const w = pendingSetupWarning(blocks);
    expect(w.kind).toBe('cost');
    expect(w.text).toMatch(/Faltam 2 de 4 ajustes/i);
    expect(w.text).toMatch(/contas do mês/i);
    expect(w.text).toMatch(/sobra pouco/i);
    expect(w.pending).toEqual(['costs', 'margin']);
  });

  it('pendingSetupWarning: tudo feito', () => {
    const blocks: Record<SetupBlockId, boolean> = { costs: true, hours: true, materials: true, margin: true };
    const w = pendingSetupWarning(blocks);
    expect(w.kind).toBeNull();
    expect(w.pending).toEqual([]);
  });

  it('hasOpenBusinessHours detecta bloco com início antes do fim', () => {
    expect(hasOpenBusinessHours({ mon: { isOpen: true, blocks: [{ start: '09:00', end: '18:00' }] } })).toBe(true);
    expect(hasOpenBusinessHours({ mon: { isOpen: true, blocks: [{ start: '18:00', end: '09:00' }] } })).toBe(false);
    expect(hasOpenBusinessHours({ mon: { isOpen: false, blocks: [{ start: '09:00', end: '18:00' }] } })).toBe(false);
    expect(hasOpenBusinessHours(null)).toBe(false);
    expect(hasOpenBusinessHours(undefined)).toBe(false);
  });
});