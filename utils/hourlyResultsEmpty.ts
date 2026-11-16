import type { HourMetrics } from '@/hooks/useChairHour';

export type HourlyEmptyKind = 'setup' | 'no_attendance' | 'staff_no_hours' | 'unmeasurable' | null;

export function hourlyEmptyKind(args: {
  role: 'owner' | 'staff';
  item: HourMetrics | null | undefined;
  setupComplete?: boolean;
}): HourlyEmptyKind {
  const item = args.item;
  const worked = item?.worked_minutes ?? 0;
  const noSchedule = !item || (item.available_minutes == null && !(worked > 0));
  if (noSchedule) return args.role === 'staff' ? 'staff_no_hours' : 'setup';
  if (worked === 0) return 'no_attendance';
  const workedHour = item?.revenue_per_worked_hour;
  const openHour = item?.revenue_per_available_hour;
  if (workedHour === 0 || (workedHour == null && openHour === 0)) return 'unmeasurable';
  return null;
}

export function isMoneyHeroHidden(kind: HourlyEmptyKind): boolean {
  return kind !== null;
}
