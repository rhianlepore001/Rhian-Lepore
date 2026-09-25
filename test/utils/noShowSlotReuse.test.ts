import { describe, expect, it } from 'vitest';
import {
  buildNoShowSlotPrefill,
  findNoShowCoveringSlot,
  localHHMM,
  noShowSlotContext,
  slotConflictMessage,
} from '@/utils/noShowSlotReuse';
import { appointmentFreesSlot, isNoShowStatus } from '@/utils/appointmentStatus';

const at = (h: number, m = 0, day = 23) => new Date(2026, 7, day, h, m).toISOString();

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

describe('buildNoShowSlotPrefill ("Usar este horário")', () => {
  it('mesmo profissional, dia e horário; nada de cliente/serviço', () => {
    const p = buildNoShowSlotPrefill(
      { clientName: 'Aline Lima', professional_id: 'pro-bob', appointment_time: at(14, 0) },
      [{ id: 'pro-bob' }],
    );
    expect(p).toEqual({
      professionalId: 'pro-bob',
      date: new Date(2026, 7, 23),
      time: '14:00',
      slotContext: 'Horário liberado pela falta de Aline Lima às 14:00',
    });
    expect(Object.keys(p)).not.toContain('clientId');
    expect(Object.keys(p)).not.toContain('serviceIds');
  });

  it('profissional removido da equipe -> sem profissional; horário quebrado mantido', () => {
    const p = buildNoShowSlotPrefill({ professional_id: 'pro-x', appointment_time: at(14, 15) }, [{ id: 'pro-bob' }]);
    expect(p.professionalId).toBe('');
    expect(p.time).toBe('14:15');
    expect(p.slotContext).toBe('Horário liberado pela falta de um cliente às 14:15');
  });

  it('helpers de texto', () => {
    expect(localHHMM(at(6, 5))).toBe('06:05');
    expect(localHHMM('x')).toBe('');
    expect(noShowSlotContext({ clientName: '  ', appointment_time: at(9) })).toBe('Horário liberado pela falta de um cliente às 09:00');
  });
});

describe('findNoShowCoveringSlot ("+" ao lado da falta)', () => {
  const day = new Date(2026, 7, 23);
  const apts = [
    { id: 'ns', status: 'NoShow', professional_id: 'pro-bob', appointment_time: at(14, 0), duration_minutes: 60, clientName: 'Aline' },
    { id: 'cx', status: 'Cancelled', professional_id: 'pro-bob', appointment_time: at(16, 0), clientName: 'Caio' },
    { id: 'ok', status: 'Confirmed', professional_id: 'pro-bob', appointment_time: at(17, 0), clientName: 'Duda' },
    { id: 'ns-ana', status: 'NoShow', professional_id: 'pro-ana', appointment_time: at(18, 0), clientName: 'Eva' },
  ];
  it('acha a falta que cobre a linha (início e linhas seguintes da duração)', () => {
    expect(findNoShowCoveringSlot(apts, 'pro-bob', day, '14:00')?.id).toBe('ns');
    expect(findNoShowCoveringSlot(apts, 'pro-bob', day, '14:30')?.id).toBe('ns');
    expect(findNoShowCoveringSlot(apts, 'pro-bob', day, '15:00')).toBeUndefined();
  });
  it('ignora cancelado, ativo, outro profissional e outro dia', () => {
    expect(findNoShowCoveringSlot(apts, 'pro-bob', day, '16:00')).toBeUndefined();
    expect(findNoShowCoveringSlot(apts, 'pro-bob', day, '17:00')).toBeUndefined();
    expect(findNoShowCoveringSlot(apts, 'pro-bob', day, '18:00')).toBeUndefined();
    expect(findNoShowCoveringSlot(apts, 'pro-bob', new Date(2026, 7, 24), '14:00')).toBeUndefined();
  });
});

describe('slotConflictMessage', () => {
  it('explica intervalo e duração', () => {
    expect(slotConflictMessage('14:00', 60, 'Bob')).toBe(
      'Esse horário não está livre para 60 min: Bob já tem outro agendamento entre 14:00 e 15:00. Escolha outro horário ou serviços mais curtos.',
    );
    expect(slotConflictMessage('23:30', 60)).toBe(
      'Esse horário não está livre para 60 min: já existe outro agendamento entre 23:30 e 00:30. Escolha outro horário ou serviços mais curtos.',
    );
  });
});
