import { describe, expect, it } from 'vitest';
import {
  formatServiceDuration,
  minutesFromSelection,
  selectionFromDurationMinutes,
} from '../../utils/serviceDuration';

describe('selectionFromDurationMinutes', () => {
  it('uses presets when possible', () => {
    expect(selectionFromDurationMinutes(30)).toEqual({
      selectValue: '30',
      customHours: '0',
      customMinutes: '0',
    });
  });

  it('falls back to custom for values outside presets', () => {
    expect(selectionFromDurationMinutes(75)).toEqual({
      selectValue: 'custom',
      customHours: '1',
      customMinutes: '15',
    });
    expect(selectionFromDurationMinutes(90)).toEqual({
      selectValue: 'custom',
      customHours: '1',
      customMinutes: '30',
    });
  });
});

describe('minutesFromSelection', () => {
  it('reads presets', () => {
    expect(minutesFromSelection('60', '0', '0')).toBe(60);
  });

  it('computes custom duration', () => {
    expect(minutesFromSelection('custom', '1', '15')).toBe(75);
    expect(minutesFromSelection('custom', '2', '0')).toBe(120);
  });

  it('rejects zero or invalid custom', () => {
    expect(() => minutesFromSelection('custom', '0', '0')).toThrow(/maior que zero/i);
    expect(() => minutesFromSelection('custom', '0', '60')).toThrow(/0 a 59/i);
  });
});

describe('formatServiceDuration', () => {
  it('formats under and over one hour', () => {
    expect(formatServiceDuration(45)).toBe('45 min');
    expect(formatServiceDuration(60)).toBe('1h');
    expect(formatServiceDuration(75)).toBe('1h15');
    expect(formatServiceDuration(120)).toBe('2h');
  });
});
