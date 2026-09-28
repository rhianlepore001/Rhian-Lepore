import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const read = (p: string) => fs.readFileSync(path.resolve(__dirname, '../..', p), 'utf8');

describe('Contrato: após criar, a agenda vai até o agendamento (todas as entradas)', () => {
  const agenda = read('pages/Agenda.tsx');
  const wizard = read('components/AppointmentWizard.tsx');

  it('o wizard informa id + profissional do agendamento criado', () => {
    expect(wizard).toMatch(/onSuccess\(dateTime,\s*\{\s*id:\s*appointmentId,\s*professionalId:\s*selectedProId\s*\}\)/);
  });

  it('existe um único wizard na agenda (grade "+", botão, FAB/?new=true, "Usar este horário") e ele foca o criado', () => {
    expect(agenda.match(/<AppointmentWizard\b/g)).toHaveLength(1);
    expect(agenda).toMatch(/onSuccess=\{async \(date, created\)/);
    expect(agenda).toMatch(/focusCreated\(/);
    expect(agenda).toMatch(/ensureProfessionalVisible\(/);
    expect(agenda).toMatch(/highlightAppointmentId=\{highlightId\}/);
  });
});
