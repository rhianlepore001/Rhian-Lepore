import { zonedDateTimeToIso } from '../../utils/businessTimezone';
import type { DemoTables } from './seed';

export function demoSlots(tables: DemoTables, args: Record<string, any>) {
  const professionals = tables.team_members.filter(p => !args.p_professional_id || p.id === args.p_professional_id);
  const slots: string[] = [];
  for (let minutes = 8 * 60; minutes + (args.p_duration_min ?? 30) <= 20 * 60; minutes += 30) {
    const time = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
    const start = new Date(zonedDateTimeToIso(args.p_date, time, 'America/Sao_Paulo')).getTime();
    const end = start + (args.p_duration_min ?? 30) * 60000;
    const available = start > Date.now() && professionals.some(p => !tables.appointments.some(a => {
      const when = new Date(a.appointment_time).getTime();
      return a.professional_id === p.id && !['Cancelled', 'NoShow'].includes(a.status) && start < when + a.duration_minutes * 60000 && end > when;
    }));
    if (available) slots.push(time);
  }
  return { slots, lead_time_hours: 0, lead_time_minutes: 0, empty_reason: null };
}
