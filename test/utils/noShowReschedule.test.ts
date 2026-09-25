import { describe, expect, it } from 'vitest';
import { buildNoShowReschedulePrefill, formatNoShowWhen, splitServiceNames } from '@/utils/noShowReschedule';
import { appointmentFreesSlot, isNoShowStatus } from '@/utils/appointmentStatus';

const catalog = {
  services: [
    { id: 's-corte', name: 'Corte Masculino' },
    { id: 's-barba', name: 'Barba' },
  ],
  teamMembers: [{ id: 'pro-bob' }, { id: 'pro-ana' }],
  clients: [{ id: 'cli-aline' }],
};
// 23/08/2026 06:00 no fuso do teste (TZ do vitest)
const noShowIso = new Date(2026, 7, 23, 6, 0).toISOString();
const now = new Date(2026, 8, 25, 13, 30);

describe('appointmentFreesSlot / isNoShowStatus (mesma regra do banco)', () => {
  it('falta e cancelado liberam o horário; os demais ocupam', () => {
    expect(appointmentFreesSlot('NoShow')).toBe(true);
    expect(appointmentFreesSlot('no_show')).toBe(true);
    expect(appointmentFreesSlot('Cancelled')).toBe(true);
    for (const s of ['Confirmed', 'Pending', 'Completed', '', null, undefined]) {
      expect(appointmentFreesSlot(s as string)).toBe(false);
    }
    expect(isNoShowStatus('NoShow')).toBe(true);
    expect(isNoShowStatus('Cancelled')).toBe(false);
  });
});

describe('buildNoShowReschedulePrefill', () => {
  it('mesmo cliente, serviço e profissional; começa no passo Horário, hoje', () => {
    const p = buildNoShowReschedulePrefill(
      { client_id: 'cli-aline', clientName: 'Aline Lima', service: 'Corte Masculino', professional_id: 'pro-bob', appointment_time: noShowIso },
      catalog,
      now,
    );
    expect(p.clientId).toBe('cli-aline');
    expect(p.serviceIds).toEqual(['s-corte']);
    expect(p.unmatchedServiceNames).toEqual([]);
    expect(p.professionalId).toBe('pro-bob');
    expect(p.startStep).toBe(3);
    expect(p.date.getFullYear()).toBe(2026);
    expect(p.date.getMonth()).toBe(8);
    expect(p.date.getDate()).toBe(25);
    expect(p.notes).toBe('Reagendamento da falta de 23/08 às 06:00.');
    expect(p.contextLabel).toBe('Aline Lima faltou em 23/08 às 06:00. Escolha o novo horário — a falta continua no histórico.');
  });

  it('vários serviços ("A, B") viram vários ids', () => {
    const p = buildNoShowReschedulePrefill(
      { client_id: 'cli-aline', service: 'Corte Masculino, Barba', professional_id: 'pro-ana', appointment_time: noShowIso },
      catalog,
      now,
    );
    expect(p.serviceIds).toEqual(['s-corte', 's-barba']);
    expect(p.startStep).toBe(3);
  });

  it('serviço que não existe mais (ex.: personalizado) -> passo Serviços com o que casou', () => {
    const p = buildNoShowReschedulePrefill(
      { client_id: 'cli-aline', service: 'Corte Masculino + Pigmentação', professional_id: 'pro-bob', appointment_time: noShowIso },
      catalog,
      now,
    );
    expect(p.serviceIds).toEqual(['s-corte']);
    expect(p.unmatchedServiceNames).toEqual(['Pigmentação']);
    expect(p.startStep).toBe(2);
    expect(p.contextLabel).toMatch(/Confira os serviços\.$/);
  });

  it('cliente fora da lista -> passo Cliente; profissional removido -> sem profissional', () => {
    const p = buildNoShowReschedulePrefill(
      { client_id: 'cli-x', service: 'Barba', professional_id: 'pro-removido', appointment_time: noShowIso },
      catalog,
      now,
    );
    expect(p.clientId).toBe('');
    expect(p.professionalId).toBe('');
    expect(p.startStep).toBe(1);
  });

  it('falta num dia futuro mantém aquele dia como sugestão', () => {
    const future = new Date(2026, 9, 2, 10, 0).toISOString();
    const p = buildNoShowReschedulePrefill({ client_id: 'cli-aline', service: 'Barba', appointment_time: future }, catalog, now);
    expect(p.date.getDate()).toBe(2);
    expect(p.date.getMonth()).toBe(9);
  });

  it('helpers de texto', () => {
    expect(splitServiceNames(' Corte , Barba + Sobrancelha ')).toEqual(['Corte', 'Barba', 'Sobrancelha']);
    expect(splitServiceNames(null)).toEqual([]);
    expect(formatNoShowWhen(noShowIso)).toBe('23/08 às 06:00');
    expect(formatNoShowWhen('x')).toBe('');
  });
});
