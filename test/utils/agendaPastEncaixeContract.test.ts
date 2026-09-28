import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/** Contrato da Agenda (D1): grade segue o expediente e o passado aceita encaixe. */
const src = readFileSync(resolve(__dirname, '../../pages/Agenda.tsx'), 'utf8');

describe('Agenda — grade pelo horário de funcionamento', () => {
  it('monta as linhas com buildAgendaDayWindow (horário do dia + agendamentos + fuso do negócio)', () => {
    expect(src).toMatch(/buildAgendaDayWindow\(\{/);
    expect(src).toMatch(/businessHours: businessSettings\?\.business_hours/);
    expect(src).toMatch(/shopTimeZone/);
    expect(src).not.toMatch(/buildAgendaGridSlots\(/);
  });
  it('passa linhas fora do expediente e rótulo de fechamento para a grade', () => {
    expect(src).toMatch(/offHoursSlots=\{dayWindow\.offHours\}/);
    expect(src).toMatch(/endLabel=\{dayWindow\.endLabel\}/);
  });
  it('dia fechado mostra aviso (encaixe continua possível)', () => {
    expect(src).toMatch(/data-testid="agenda-closed-day"/);
  });
  it('wizard recebe o expediente para separar horários fora dele', () => {
    expect(src).toMatch(/businessHours=\{businessSettings\?\.business_hours/);
  });
});
