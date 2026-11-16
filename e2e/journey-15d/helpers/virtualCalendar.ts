import { zonedDateTimeToDate } from '../../../utils/businessTimezone';

export const JOURNEY_TIMEZONE = 'America/Sao_Paulo';

export function journeyAnchor(): string {
  return process.env.E2E_ANCHOR_DATE || '2026-09-01';
}

export function virtualDayIso(virtualDay: number): string {
  const anchor = journeyAnchor();
  const civil = new Date(`${anchor}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(anchor) || Number.isNaN(civil.valueOf()) || civil.toISOString().slice(0, 10) !== anchor) {
    throw new Error(`Âncora civil inválida: ${anchor}`);
  }
  if (!Number.isInteger(virtualDay) || virtualDay < 1) throw new Error('Dia virtual deve ser um inteiro positivo');
  civil.setUTCDate(civil.getUTCDate() + virtualDay - 1);
  return civil.toISOString().slice(0, 10);
}

export function virtualDayTime(virtualDay: number, time = '09:00:00'): Date {
  return zonedDateTimeToDate(virtualDayIso(virtualDay), time, JOURNEY_TIMEZONE);
}

export function agendaUrl(base: string, virtualDay: number): string {
  return `${base.replace(/\/$/, '')}/#/agenda?date=${virtualDayIso(virtualDay)}`;
}
