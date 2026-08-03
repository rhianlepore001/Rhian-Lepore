import { describe, it, expect } from 'vitest';
import {
  pickNextAppointment,
  pickUpcomingAfter,
  getCockpitAgendaStatus,
  countActiveToday,
  estimateFreeSlots,
} from '@/utils/dashboardCockpit';
import type { DashboardAppointment } from '@/types/dashboard';

function apt(
  partial: Partial<DashboardAppointment> & Pick<DashboardAppointment, 'id' | 'status' | 'appointment_time'>,
): DashboardAppointment {
  return {
    clientName: 'Cliente',
    service: 'Corte',
    time: '10:00',
    date: '03/08',
    rawDate: '2026-08-03',
    price: 50,
    professional_id: null,
    ...partial,
  };
}

describe('dashboardCockpit', () => {
  const noon = new Date('2026-08-03T12:00:00');

  it('pickNextAppointment ignora concluídos e cancelados', () => {
    const list = [
      apt({ id: '1', status: 'Completed', appointment_time: '2026-08-03T11:00:00' }),
      apt({ id: '2', status: 'Confirmed', appointment_time: '2026-08-03T13:00:00' }),
      apt({ id: '3', status: 'Cancelled', appointment_time: '2026-08-03T12:30:00' }),
    ];
    expect(pickNextAppointment(list, noon)?.id).toBe('2');
  });

  it('pickUpcomingAfter devolve os seguintes ativos', () => {
    const list = [
      apt({ id: '1', status: 'Confirmed', appointment_time: '2026-08-03T13:00:00' }),
      apt({ id: '2', status: 'Pending', appointment_time: '2026-08-03T14:00:00' }),
      apt({ id: '3', status: 'Confirmed', appointment_time: '2026-08-03T15:00:00' }),
    ];
    expect(pickUpcomingAfter(list, '1', 2).map((a) => a.id)).toEqual(['2', '3']);
  });

  it('getCockpitAgendaStatus marca agora no próximo dentro da janela', () => {
    const next = apt({
      id: 'n',
      status: 'Confirmed',
      appointment_time: '2026-08-03T12:10:00',
    });
    expect(getCockpitAgendaStatus(next, 'n', noon).key).toBe('now');
  });

  it('getCockpitAgendaStatus usa Confirmar para Pending', () => {
    const pending = apt({
      id: 'p',
      status: 'Pending',
      appointment_time: '2026-08-03T16:00:00',
    });
    expect(getCockpitAgendaStatus(pending, 'other', noon).key).toBe('confirm');
  });

  it('countActiveToday exclui cancelados', () => {
    const list = [
      apt({ id: '1', status: 'Confirmed', appointment_time: '2026-08-03T10:00:00' }),
      apt({ id: '2', status: 'Cancelled', appointment_time: '2026-08-03T11:00:00' }),
    ];
    expect(countActiveToday(list)).toBe(1);
  });

  it('estimateFreeSlots arredonda para baixo por slot', () => {
    expect(estimateFreeSlots(120, 30, 30)).toBe(3);
    expect(estimateFreeSlots(0, 0, 30)).toBe(0);
  });
});
