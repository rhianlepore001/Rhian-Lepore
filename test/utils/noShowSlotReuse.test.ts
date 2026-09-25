import { describe, expect, it } from 'vitest';
import {
  buildNoShowSlotPrefill,
  findNoShowCoveringSlot,
  localHHMM,
  noShowSlotContext,
  noShowSlotEnded,
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

describe('noShowSlotEnded (esconde "Usar este horário" quando o horário já acabou)', () => {
  const now = new Date(2026, 8, 25, 14, 20); // hoje 14:20
  const todayAt = (h: number, m = 0) => new Date(2026, 8, 25, h, m).toISOString();
  it('falta de hoje ainda em andamento ou futura: não terminou', () => {
    expect(noShowSlotEnded({ appointment_time: todayAt(14, 0) }, now)).toBe(false); // 14:00–14:30
    expect(noShowSlotEnded({ appointment_time: todayAt(13, 30), duration_minutes: 60 }, now)).toBe(false); // até 14:30
    expect(noShowSlotEnded({ appointment_time: todayAt(16, 0) }, now)).toBe(false);
  });
  it('falta encerrada (hoje mais cedo ou dia passado): terminou', () => {
    expect(noShowSlotEnded({ appointment_time: todayAt(13, 30) }, now)).toBe(true); // 13:30–14:00
    expect(noShowSlotEnded({ appointment_time: todayAt(13, 0), duration_minutes: 60 }, now)).toBe(true); // até 14:00
    expect(noShowSlotEnded({ appointment_time: at(6, 0) }, now)).toBe(true); // 23/08
    expect(noShowSlotEnded({ appointment_time: 'x' }, now)).toBe(true);
  });
});

describe('slotConflictMessage', () => {
  const busy = 'Desculpe, este horário acabou de ser ocupado. Por favor, escolha outro.';
  it('genérica (vale para agendamento ou pedido online pendente), com duração e profissional', () => {
    expect(slotConflictMessage(60, 'Bob', busy)).toBe(
      'Esse horário não está livre para 60 min com Bob. Escolha outro horário ou serviços mais curtos.',
    );
    expect(slotConflictMessage(30)).toBe('Esse horário não está livre para 30 min. Escolha outro horário ou serviços mais curtos.');
  });
  it('mantém mensagem específica do banco quando não é a de "ocupado"', () => {
    expect(slotConflictMessage(60, 'Bob', 'Horário fora do expediente.')).toBe('Horário fora do expediente.');
    expect(slotConflictMessage(60, 'Bob', '  ')).toMatch(/^Esse horário não está livre para 60 min com Bob\./);
  });
});
