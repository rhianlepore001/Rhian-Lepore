import { supabase } from '@/lib/supabase';

export interface BusinessHours {
  [day: string]: {
    isOpen: boolean;
    blocks: { start: string; end: string }[];
  };
}

export interface OccupancyResult {
  occupiedMinutes: number;
  availableMinutes: number;
  occupancyRate: number;
  totalAppointments: number;
  /** Presente apenas quando o período é um único dia: mapa hora a hora do expediente. */
  hourlySlots?: { hour: number; busy: boolean }[];
}

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export function getDayKey(date: Date): string {
  return DAY_KEYS[date.getDay()];
}

export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function calculateDayAvailableMinutes(
  businessHours: BusinessHours,
  activeProfessionalsCount: number,
  date: Date,
): number {
  const dayKey = getDayKey(date);
  const dayConfig = businessHours[dayKey];

  if (!dayConfig?.isOpen || !dayConfig.blocks?.length) return 0;

  const minutes = dayConfig.blocks.reduce((sum, block) => {
    const start = parseTimeToMinutes(block.start);
    const end = parseTimeToMinutes(block.end);
    return sum + Math.max(0, end - start);
  }, 0);

  return minutes * Math.max(1, activeProfessionalsCount);
}

export async function fetchOccupancyData(
  companyId: string,
  startDate: Date,
  endDate: Date,
): Promise<{
  businessHours: BusinessHours | null;
  activeProfessionalsCount: number;
  appointments: { appointment_time: string; duration_minutes: number; status: string }[];
}> {
  const startIso = startDate.toISOString();
  const endIso = endDate.toISOString();

  const [settingsRes, professionalsRes, appointmentsRes] = await Promise.all([
    supabase
      .from('business_settings')
      .select('business_hours')
      .eq('user_id', companyId)
      .maybeSingle(),
    supabase
      .from('team_members')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', companyId)
      .eq('active', true),
    supabase
      .from('appointments')
      .select('appointment_time, duration_minutes, status')
      .eq('user_id', companyId)
      .gte('appointment_time', startIso)
      .lte('appointment_time', endIso)
      .in('status', ['Confirmed', 'Completed']),
  ]);

  if (settingsRes.error) throw settingsRes.error;
  if (professionalsRes.error) throw professionalsRes.error;
  if (appointmentsRes.error) throw appointmentsRes.error;

  return {
    businessHours: (settingsRes.data?.business_hours as BusinessHours) || null,
    activeProfessionalsCount: professionalsRes.count ?? 1,
    appointments: appointmentsRes.data || [],
  };
}

export function calculateOccupancy(
  businessHours: BusinessHours | null,
  activeProfessionalsCount: number,
  appointments: { appointment_time: string; duration_minutes: number; status: string }[],
  startDate: Date,
  endDate: Date,
): OccupancyResult {
  if (!businessHours) {
    return {
      occupiedMinutes: 0,
      availableMinutes: 0,
      occupancyRate: 0,
      totalAppointments: 0,
    };
  }

  let availableMinutes = 0;
  const current = new Date(startDate);
  const last = new Date(endDate);

  while (current <= last) {
    availableMinutes += calculateDayAvailableMinutes(
      businessHours,
      activeProfessionalsCount,
      current,
    );
    current.setDate(current.getDate() + 1);
  }

  const occupiedMinutes = appointments.reduce((sum, apt) => {
    return sum + Math.max(0, Number(apt.duration_minutes) || 30);
  }, 0);

  const occupancyRate = availableMinutes > 0
    ? Math.min(100, Math.round((occupiedMinutes / availableMinutes) * 100))
    : 0;

  return {
    occupiedMinutes,
    availableMinutes,
    occupancyRate,
    totalAppointments: appointments.length,
    hourlySlots: buildHourlySlots(businessHours, appointments, startDate, endDate),
  };
}

/** Slots por hora do expediente — só para período de 1 dia (visualização do card). */
function buildHourlySlots(
  businessHours: BusinessHours,
  appointments: { appointment_time: string; duration_minutes: number }[],
  startDate: Date,
  endDate: Date,
): { hour: number; busy: boolean }[] | undefined {
  const sameDay = startDate.toDateString() === endDate.toDateString();
  if (!sameDay) return undefined;

  const dayConfig = businessHours[getDayKey(startDate)];
  if (!dayConfig?.isOpen || !dayConfig.blocks?.length) return undefined;

  const openStart = Math.min(...dayConfig.blocks.map(b => parseTimeToMinutes(b.start)));
  const openEnd = Math.max(...dayConfig.blocks.map(b => parseTimeToMinutes(b.end)));
  const firstHour = Math.floor(openStart / 60);
  const lastHour = Math.ceil(openEnd / 60);
  if (lastHour <= firstHour) return undefined;

  const busyHours = new Set<number>();
  for (const apt of appointments) {
    const t = new Date(apt.appointment_time);
    if (t.toDateString() !== startDate.toDateString()) continue;
    const startMin = t.getHours() * 60 + t.getMinutes();
    const endMin = startMin + Math.max(0, Number(apt.duration_minutes) || 30);
    for (let h = Math.floor(startMin / 60); h < Math.ceil(endMin / 60); h++) {
      busyHours.add(h);
    }
  }

  return Array.from({ length: lastHour - firstHour }, (_, i) => {
    const hour = firstHour + i;
    return { hour, busy: busyHours.has(hour) };
  });
}

export async function fetchOccupancyRate(
  companyId: string,
  startDate: Date,
  endDate: Date,
): Promise<OccupancyResult> {
  const data = await fetchOccupancyData(companyId, startDate, endDate);
  return calculateOccupancy(
    data.businessHours,
    data.activeProfessionalsCount,
    data.appointments,
    startDate,
    endDate,
  );
}

export function getPeriodDates(
  mode: 'today' | 'week' | 'month',
  referenceDate = new Date(),
): { start: Date; end: Date } {
  const start = new Date(referenceDate);
  const end = new Date(referenceDate);

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  if (mode === 'today') {
    return { start, end };
  }

  if (mode === 'week') {
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    end.setDate(start.getDate() + 6);
    return { start, end };
  }

  start.setDate(1);
  end.setMonth(start.getMonth() + 1, 0);
  return { start, end };
}
