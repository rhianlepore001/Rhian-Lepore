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
  };
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
