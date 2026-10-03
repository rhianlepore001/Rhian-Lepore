import { describe, expect, it } from 'vitest';
import { zonedDateTimeToDate } from '@/utils/businessTimezone';
import {
  mergeOccupying,
  serverSlotIsBusy,
  uiSlotIsBusy,
} from '@/utils/rescheduleOccupancy';

const TZ = 'Europe/Lisbon';
const DAY = '2026-08-24';
const PRO = 'pro-bob';
const SELF = 'apt-self';

const at = (hm: string) => zonedDateTimeToDate(DAY, hm, TZ).toISOString();

const appointments = [
  {
    id: SELF,
    professional_id: PRO,
    appointment_time: at('06:00'),
    duration_minutes: 30,
    status: 'Confirmed',
  },
  {
    id: 'apt-queue',
    professional_id: PRO,
    appointment_time: at('15:00'),
    duration_minutes: 30,
    status: 'Completed',
    origin: 'queue',
  },
  {
    id: 'apt-busy',
    professional_id: PRO,
    appointment_time: at('10:00'),
    duration_minutes: 60,
    status: 'Confirmed',
  },
];

const publicBookings = [
  {
    id: 'pb-pending',
    professional_id: PRO,
    appointment_time: at('14:00'),
    duration_minutes: 30,
    status: 'pending',
  },
];

describe('ocupação do modal vs regra da RPC', () => {
  const occupying = mergeOccupying({ appointments, publicBookings });

  const ui = (time: string) => uiSlotIsBusy({
    dateStr: DAY,
    time,
    durationMinutes: 30,
    occupying,
    professionalId: PRO,
    timeZone: TZ,
    ignoreAppointmentId: SELF,
  });

  const server = (time: string) => serverSlotIsBusy({
    startIso: at(time),
    durationMinutes: 30,
    professionalId: PRO,
    ignoreAppointmentId: SELF,
    appointments,
    publicBookings,
  });

  it('marca os mesmos slots que a RPC recusaria (fila, 60 min, pedido pending)', () => {
    const times = ['06:00', '09:30', '10:00', '10:30', '11:00', '14:00', '14:30', '15:00', '15:30'];
    for (const time of times) {
      expect(ui(time), time).toBe(server(time));
    }
    expect(ui('06:00')).toBe(false);
    expect(ui('10:00')).toBe(true);
    expect(ui('10:30')).toBe(true);
    expect(ui('11:00')).toBe(false);
    expect(ui('14:00')).toBe(true);
    expect(ui('15:00')).toBe(true);
    expect(ui('15:30')).toBe(false);
  });

  it('ignora o próprio pedido ligado (não marca o Atual como ocupado)', () => {
    const occupying = mergeOccupying({
      appointments,
      publicBookings: [
        ...publicBookings,
        {
          id: 'pb-self',
          professional_id: PRO,
          appointment_time: at('06:00'),
          duration_minutes: 30,
          status: 'confirmed',
        },
      ],
      ignorePublicBookingId: 'pb-self',
    });
    expect(uiSlotIsBusy({
      dateStr: DAY,
      time: '06:00',
      durationMinutes: 30,
      occupying,
      professionalId: PRO,
      timeZone: TZ,
      ignoreAppointmentId: SELF,
    })).toBe(false);
    expect(serverSlotIsBusy({
      startIso: at('06:00'),
      durationMinutes: 30,
      professionalId: PRO,
      ignoreAppointmentId: SELF,
      ignorePublicBookingId: 'pb-self',
      appointments,
      publicBookings: [
        ...publicBookings,
        {
          id: 'pb-self',
          professional_id: PRO,
          appointment_time: at('06:00'),
          duration_minutes: 30,
          status: 'confirmed',
        },
      ],
    })).toBe(false);
  });
});
