import { supabase } from '@/lib/supabase';
import {
  getDayKey,
  parseTimeToMinutes,
  getPeriodDates,
  type BusinessHours,
} from './occupancy';

export interface EmptySlot {
  date: string;
  weekday: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  severity: 'critical' | 'warning' | 'ok';
  suggestion: string;
}

export interface CriticalEmptySlotsResult {
  totalEmptyMinutes: number;
  criticalSlots: EmptySlot[];
  bestDayToFill: string | null;
  worstDay: string | null;
  daysAnalyzed: number;
}

const WEEKDAY_LABELS: Record<string, string> = {
  sun: 'Domingo',
  mon: 'Segunda',
  tue: 'Terça',
  wed: 'Quarta',
  thu: 'Quinta',
  fri: 'Sexta',
  sat: 'Sábado',
};

export async function fetchCriticalEmptySlots(
  companyId: string,
  daysAhead = 7,
  now: Date = new Date(),
): Promise<CriticalEmptySlotsResult> {
  const [settingsRes, teamRes, apptsRes] = await Promise.all([
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
      .in('status', ['Confirmed', 'Completed']),
  ]);

  if (settingsRes.error) throw settingsRes.error;
  if (teamRes.error) throw teamRes.error;
  if (apptsRes.error) throw apptsRes.error;

  const businessHours = (settingsRes.data?.business_hours as BusinessHours) || null;
  const teamCount = Math.max(1, teamRes.count ?? 1);
  const appointments = apptsRes.data || [];

  return analyzeEmptySlots(businessHours, teamCount, appointments, now, daysAhead);
}

export function analyzeEmptySlots(
  businessHours: BusinessHours | null,
  teamCount: number,
  appointments: { appointment_time: string; duration_minutes: number; status: string }[],
  now: Date,
  daysAhead: number,
): CriticalEmptySlotsResult {
  const result: CriticalEmptySlotsResult = {
    totalEmptyMinutes: 0,
    criticalSlots: [],
    bestDayToFill: null,
    worstDay: null,
    daysAnalyzed: daysAhead,
  };

  if (!businessHours) return result;

  const dayStats: Record<string, { date: string; total: number; busy: number; empty: number }> = {};

  for (let i = 0; i < daysAhead; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() + i);
    date.setHours(0, 0, 0, 0);

    const dayKey = getDayKey(date);
    const dayConfig = businessHours[dayKey];
    const dateStr = date.toISOString().split('T')[0];

    if (!dayConfig?.isOpen || !dayConfig.blocks?.length) {
      dayStats[dateStr] = { date: dateStr, total: 0, busy: 0, empty: 0 };
      continue;
    }

    const totalMinutes = dayConfig.blocks.reduce((sum, b) => {
      return sum + Math.max(0, parseTimeToMinutes(b.end) - parseTimeToMinutes(b.start));
    }, 0) * teamCount;

    const dayStart = new Date(date);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const busyMinutes = appointments
      .filter((apt) => {
        const aptDate = new Date(apt.appointment_time);
        return aptDate >= dayStart && aptDate <= dayEnd;
      })
      .reduce((sum, apt) => sum + Math.max(0, Number(apt.duration_minutes) || 30), 0);

    const emptyMinutes = Math.max(0, totalMinutes - busyMinutes);
    const emptyRate = totalMinutes > 0 ? emptyMinutes / totalMinutes : 0;

    dayStats[dateStr] = {
      date: dateStr,
      total: totalMinutes,
      busy: busyMinutes,
      empty: emptyMinutes,
    };

    result.totalEmptyMinutes += emptyMinutes;

    if (dayConfig.blocks.length > 0 && emptyRate >= 0.5) {
      const longest = dayConfig.blocks.reduce<{ start: string; end: string; duration: number }>(
        (acc, b) => {
          const dur = parseTimeToMinutes(b.end) - parseTimeToMinutes(b.start);
          return dur > acc.duration ? { start: b.start, end: b.end, duration: dur } : acc;
        },
        { start: dayConfig.blocks[0].start, end: dayConfig.blocks[0].end, duration: 0 },
      );

      const severity: EmptySlot['severity'] = emptyRate >= 0.75 ? 'critical' : 'warning';
      const suggestion = severity === 'critical'
        ? `${WEEKDAY_LABELS[dayKey]} tem ${Math.round(emptyRate * 100)}% ocioso. Criar campanha?`
        : `${WEEKDAY_LABELS[dayKey]} com ${Math.round(emptyRate * 100)}% livre. Considere promoção.`;

      result.criticalSlots.push({
        date: dateStr,
        weekday: WEEKDAY_LABELS[dayKey],
        startTime: longest.start,
        endTime: longest.end,
        durationMinutes: longest.duration,
        severity,
        suggestion,
      });
    }
  }

  const days = Object.values(dayStats).filter((d) => d.total > 0);
  if (days.length > 0) {
    const best = days.reduce((a, b) => (b.empty > a.empty ? b : a));
    const worst = days.reduce((a, b) => (b.empty < a.empty ? b : a));
    result.bestDayToFill = best.date;
    result.worstDay = worst.date;
  }

  result.criticalSlots.sort((a, b) => a.date.localeCompare(b.date));

  return result;
}
