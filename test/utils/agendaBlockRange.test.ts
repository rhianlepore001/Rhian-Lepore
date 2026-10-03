import { describe, expect, it } from 'vitest';
import {
  BLOCK_ALREADY_FINISHED_MESSAGE,
  BLOCK_START_ADJUSTED_MESSAGE,
  blockToSlotRange,
  ceilToNextMinute,
  formatAdjustedBlockEnd,
  blockToSlotRangeOnViewDay,
  buildAgendaBlockRange,
  classifyAgendaBlockStart,
  formatBlockRangeLabel,
  intervalsOverlap,
  slotOverlapsBlocks,
  slotOverlapsOccupying,
} from '@/utils/agendaBlockRange';

const SP = 'America/Sao_Paulo';

describe('intervalsOverlap (meio-aberto)', () => {
  it('12–13 e 13–14 não se tocam; 12–13 e 12:30–13:30 se cruzam', () => {
    expect(intervalsOverlap(
      '2026-10-05T12:00:00-03:00',
      '2026-10-05T13:00:00-03:00',
      '2026-10-05T13:00:00-03:00',
      '2026-10-05T14:00:00-03:00',
    )).toBe(false);
    expect(intervalsOverlap(
      '2026-10-05T12:00:00-03:00',
      '2026-10-05T13:00:00-03:00',
      '2026-10-05T12:30:00-03:00',
      '2026-10-05T13:30:00-03:00',
    )).toBe(true);
  });
});

describe('buildAgendaBlockRange', () => {
  it('horas no mesmo dia, fuso do negócio', () => {
    const r = buildAgendaBlockRange({
      kind: 'hours',
      startDate: '2026-10-05',
      startTime: '12:00',
      endTime: '13:00',
      timeZone: SP,
    });
    expect(r.startsAt).toBe(new Date('2026-10-05T12:00:00-03:00').toISOString());
    expect(r.endsAt).toBe(new Date('2026-10-05T13:00:00-03:00').toISOString());
  });

  it('dia inteiro é [00:00, dia seguinte 00:00)', () => {
    const r = buildAgendaBlockRange({
      kind: 'full_day',
      startDate: '2026-10-05',
      timeZone: SP,
    });
    expect(r.startsAt).toBe(new Date('2026-10-05T00:00:00-03:00').toISOString());
    expect(r.endsAt).toBe(new Date('2026-10-06T00:00:00-03:00').toISOString());
  });

  it('vários dias incluem o último dia', () => {
    const r = buildAgendaBlockRange({
      kind: 'multi_day',
      startDate: '2026-10-05',
      endDate: '2026-10-07',
      timeZone: SP,
    });
    expect(r.startsAt).toBe(new Date('2026-10-05T00:00:00-03:00').toISOString());
    expect(r.endsAt).toBe(new Date('2026-10-08T00:00:00-03:00').toISOString());
  });

  it('recusa fim <= início', () => {
    expect(() => buildAgendaBlockRange({
      kind: 'hours',
      startDate: '2026-10-05',
      startTime: '13:00',
      endTime: '12:00',
      timeZone: SP,
    })).toThrow(/invalid_block_interval/);
  });
});

describe('blockToSlotRangeOnViewDay', () => {
  const slots = ['08:00', '08:30', '09:00'];
  it('08:00–09:00 cobre dois slots do dia visível', () => {
    expect(blockToSlotRangeOnViewDay(
      { starts_at: '2026-01-05T08:00:00', ends_at: '2026-01-05T09:00:00' },
      '2026-01-05',
      slots,
    )).toEqual({ startIdx: 0, span: 2 });
  });
});

describe('blockToSlotRange', () => {
  const slots = ['11:00', '11:30', '12:00', '12:30', '13:00', '13:30'];

  it('almoço 12–13 cobre dois slots', () => {
    const range = blockToSlotRange(
      { starts_at: '2026-10-05T12:00:00-03:00', ends_at: '2026-10-05T13:00:00-03:00' },
      '2026-10-05',
      slots,
      SP,
    );
    expect(range).toEqual({ startIdx: 2, span: 2 });
  });

  it('bloqueio de outro dia não aparece', () => {
    expect(blockToSlotRange(
      { starts_at: '2026-10-06T12:00:00-03:00', ends_at: '2026-10-06T13:00:00-03:00' },
      '2026-10-05',
      slots,
      SP,
    )).toBeNull();
  });
});

describe('slotOverlapsBlocks', () => {
  const blocks = [{
    starts_at: '2026-10-05T12:00:00-03:00',
    ends_at: '2026-10-05T13:00:00-03:00',
    professional_id: 'pro-1',
  }];

  it('12:00 e 12:30 do mesmo profissional cruzam; 13:00 não', () => {
    expect(slotOverlapsBlocks('2026-10-05', '12:00', 30, blocks, 'pro-1', SP)).toBe(true);
    expect(slotOverlapsBlocks('2026-10-05', '12:30', 30, blocks, 'pro-1', SP)).toBe(true);
    expect(slotOverlapsBlocks('2026-10-05', '13:00', 30, blocks, 'pro-1', SP)).toBe(false);
    expect(slotOverlapsBlocks('2026-10-05', '12:00', 30, blocks, 'pro-2', SP)).toBe(false);
  });
});

describe('slotOverlapsOccupying', () => {
  const occupying = [{
    id: 'apt-1',
    professional_id: 'pro-1',
    appointment_time: '2026-10-05T10:00:00-03:00',
    duration_minutes: 60,
    status: 'Confirmed',
  }];

  it('duração real ocupa 10:00 e 10:30; 11:00 encosta', () => {
    expect(slotOverlapsOccupying('2026-10-05', '10:00', 30, occupying, 'pro-1', SP, 'self')).toBe(true);
    expect(slotOverlapsOccupying('2026-10-05', '10:30', 30, occupying, 'pro-1', SP, 'self')).toBe(true);
    expect(slotOverlapsOccupying('2026-10-05', '11:00', 30, occupying, 'pro-1', SP, 'self')).toBe(false);
    expect(slotOverlapsOccupying('2026-10-05', '10:00', 30, occupying, 'pro-1', SP, 'apt-1')).toBe(false);
  });
});

describe('classifyAgendaBlockStart B-21/B-22', () => {
  const now = new Date('2026-10-03T15:30:20-03:00');

  it('dia inteiro de hoje pede ajuste para o próximo minuto', () => {
    const range = buildAgendaBlockRange({
      kind: 'full_day',
      startDate: '2026-10-03',
      timeZone: SP,
    });
    const decision = classifyAgendaBlockStart({ ...range, timeZone: SP, now });
    expect(decision.action).toBe('adjust');
    if (decision.action !== 'adjust') return;
    expect(decision.message).toBe(BLOCK_START_ADJUSTED_MESSAGE);
    expect(decision.startsAt).toBe(ceilToNextMinute(now).toISOString());
    expect(formatAdjustedBlockEnd(range.endsAt, SP)).toBe('até 00:00 de 04/10');
  });

  it('C-B10 arredonda 14:07:20 para 14:08', () => {
    const skewed = new Date('2026-10-03T14:07:20-03:00');
    expect(ceilToNextMinute(skewed).toISOString()).toBe(new Date('2026-10-03T14:08:00-03:00').toISOString());
    expect(ceilToNextMinute(new Date('2026-10-03T14:07:00-03:00')).toISOString())
      .toBe(new Date('2026-10-03T14:07:00-03:00').toISOString());
  });

  it('período 12:00 depois do meio-dia pede o mesmo ajuste', () => {
    const range = buildAgendaBlockRange({
      kind: 'hours',
      startDate: '2026-10-03',
      startTime: '12:00',
      endTime: '18:00',
      timeZone: SP,
    });
    const decision = classifyAgendaBlockStart({ ...range, timeZone: SP, now });
    expect(decision).toMatchObject({ action: 'adjust', message: BLOCK_START_ADJUSTED_MESSAGE });
  });

  it('vários dias começados ontem e ainda em curso pedem o mesmo ajuste', () => {
    const range = buildAgendaBlockRange({
      kind: 'multi_day',
      startDate: '2026-10-02',
      endDate: '2026-10-05',
      timeZone: SP,
    });
    const decision = classifyAgendaBlockStart({ ...range, timeZone: SP, now });
    expect(decision).toMatchObject({
      action: 'adjust',
      startsAt: ceilToNextMinute(now).toISOString(),
      message: BLOCK_START_ADJUSTED_MESSAGE,
    });
  });

  it('fim já passado recusa com a frase do bloqueio terminado', () => {
    const range = buildAgendaBlockRange({
      kind: 'full_day',
      startDate: '2026-09-01',
      timeZone: SP,
    });
    expect(classifyAgendaBlockStart({ ...range, timeZone: SP, now })).toEqual({
      action: 'refuse',
      message: BLOCK_ALREADY_FINISHED_MESSAGE,
    });
  });

  it('início dentro de 5 minutos segue direto', () => {
    const range = buildAgendaBlockRange({
      kind: 'hours',
      startDate: '2026-10-03',
      startTime: '15:27',
      endTime: '16:00',
      timeZone: SP,
    });
    expect(classifyAgendaBlockStart({ ...range, timeZone: SP, now }).action).toBe('submit');
  });
});

describe('formatBlockRangeLabel', () => {
  it('período no mesmo dia', () => {
    expect(formatBlockRangeLabel(
      '2026-10-05T12:00:00-03:00',
      '2026-10-05T13:00:00-03:00',
      SP,
    )).toMatch(/05\/10\/2026.*12:00.*13:00/);
  });
});
