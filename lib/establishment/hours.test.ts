import { describe, expect, it } from 'vitest';
import { formatClock, openingStatus, parseHourBlocks, weekdayNumbers } from './hours';

const week = [
  { day: 'Segunda a sexta', hours: '09h às 20h' },
  { day: 'Sábado', hours: '09h às 18h' },
  { day: 'Domingo', hours: 'Fechado' },
];

describe('opening hours', () => {
  it('expands weekday ranges used in demos and cadastros', () => {
    expect(weekdayNumbers('Segunda a sexta')).toEqual([1, 2, 3, 4, 5]);
    expect(weekdayNumbers('Terça a sábado')).toEqual([2, 3, 4, 5, 6]);
    expect(weekdayNumbers('Domingo e segunda')).toEqual([0, 1]);
    expect(weekdayNumbers('Sábado')).toEqual([6]);
  });

  it('reads both spoken hours and timetable blocks', () => {
    expect(parseHourBlocks('09h às 20h')).toEqual([{ start: 9 * 60, end: 20 * 60 }]);
    expect(parseHourBlocks('09:00–12:00 / 14:00–19:00')).toEqual([{ start: 540, end: 720 }, { start: 840, end: 1140 }]);
    expect(parseHourBlocks('Fechado')).toEqual([]);
  });

  it('says the house is open until closing time during the week', () => {
    const now = new Date('2026-11-24T18:00:00Z');
    expect(openingStatus(week, now, 'America/Sao_Paulo')).toEqual({ open: true, label: 'Aberto hoje até 20h' });
  });

  it('announces opening, lunch break and closing without inventing a next day', () => {
    const split = [{ day: 'Terça', hours: '09:00–12:00 / 14:00–19:00' }];
    expect(openingStatus(split, new Date('2026-11-24T11:00:00Z'), 'America/Sao_Paulo')?.label).toBe('Abre hoje às 9h');
    expect(openingStatus(split, new Date('2026-11-24T16:30:00Z'), 'America/Sao_Paulo')?.label).toBe('Volta às 14h');
    expect(openingStatus(split, new Date('2026-11-24T17:30:00Z'), 'America/Sao_Paulo')).toEqual({ open: true, label: 'Aberto hoje até 19h' });
    expect(openingStatus(split, new Date('2026-11-24T23:00:00Z'), 'America/Sao_Paulo')?.label).toBe('Fechado agora');
  });

  it('marks Sunday as closed and returns nothing without hours', () => {
    expect(openingStatus(week, new Date('2026-11-22T15:00:00Z'), 'America/Sao_Paulo')).toEqual({ open: false, label: 'Fechado hoje' });
    expect(openingStatus([], new Date('2026-11-24T18:00:00Z'))).toBeNull();
  });

  it('formats clocks without trailing zeros', () => {
    expect(formatClock(20 * 60)).toBe('20h');
    expect(formatClock(9 * 60 + 30)).toBe('9h30');
  });
});
