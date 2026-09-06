import { describe, expect, it } from 'vitest';
import { calcQueueEtaMinutes, type QueueEtaPerson } from '@/services/queueEta';

const T0 = Date.parse('2026-09-06T12:00:00.000Z');

function person(partial: Partial<QueueEtaPerson> & Pick<QueueEtaPerson, 'id' | 'status'>): QueueEtaPerson {
  return {
    joinedAt: '2026-09-06T11:00:00.000Z',
    durationMinutes: 30,
    professionalId: null,
    ...partial,
  };
}

describe('calcQueueEtaMinutes', () => {
  it('shared: dois waiting de 30 min e 1 cadeira livre → ~30 para o segundo', () => {
    const eta = calcQueueEtaMinutes({
      mode: 'shared',
      chairs: 1,
      nowMs: T0,
      targetId: 'b',
      people: [
        person({ id: 'a', status: 'waiting', joinedAt: '2026-09-06T11:00:00.000Z' }),
        person({ id: 'b', status: 'waiting', joinedAt: '2026-09-06T11:01:00.000Z' }),
      ],
    });
    expect(eta).toBe(30);
  });

  it('shared: serving ocupa a cadeira (não divide como se estivesse livre)', () => {
    const eta = calcQueueEtaMinutes({
      mode: 'shared',
      chairs: 1,
      nowMs: T0,
      targetId: 'b',
      people: [
        person({
          id: 'a',
          status: 'serving',
          joinedAt: '2026-09-06T11:30:00.000Z',
          servingAt: '2026-09-06T11:45:00.000Z',
          durationMinutes: 30,
        }),
        person({ id: 'b', status: 'waiting', joinedAt: '2026-09-06T11:50:00.000Z' }),
      ],
    });
    expect(eta).toBe(15);
  });

  it('shared: duas cadeiras livres e dois waiting de 30 → segundo ~0/30 paralelo', () => {
    const eta = calcQueueEtaMinutes({
      mode: 'shared',
      chairs: 2,
      nowMs: T0,
      targetId: 'b',
      people: [
        person({ id: 'a', status: 'waiting', joinedAt: '2026-09-06T11:00:00.000Z' }),
        person({ id: 'b', status: 'waiting', joinedAt: '2026-09-06T11:01:00.000Z' }),
      ],
    });
    expect(eta).toBe(0);
  });

  it('per_professional não mistura filas', () => {
    const eta = calcQueueEtaMinutes({
      mode: 'per_professional',
      chairs: 1,
      nowMs: T0,
      targetId: 'b',
      professionalId: 'pro-2',
      people: [
        person({ id: 'a', status: 'waiting', professionalId: 'pro-1', joinedAt: '2026-09-06T11:00:00.000Z' }),
        person({ id: 'b', status: 'waiting', professionalId: 'pro-2', joinedAt: '2026-09-06T11:02:00.000Z' }),
      ],
    });
    expect(eta).toBe(0);
  });

  it('zero cadeiras retorna null', () => {
    expect(calcQueueEtaMinutes({
      mode: 'shared',
      chairs: 0,
      nowMs: T0,
      targetId: 'a',
      people: [person({ id: 'a', status: 'waiting' })],
    })).toBeNull();
  });
});
