import type { QueueMode } from '@/types/queue';

export interface QueueEtaPerson {
  id: string;
  joinedAt: string;
  durationMinutes: number;
  status: 'waiting' | 'calling' | 'serving';
  professionalId: string | null;
  servingAt?: string | null;
}

export interface CalcQueueEtaInput {
  mode: QueueMode;
  chairs: number;
  nowMs: number;
  targetId: string;
  people: QueueEtaPerson[];
  professionalId?: string | null;
}

function remainingServing(person: QueueEtaPerson, nowMs: number): number {
  const started = person.servingAt ? Date.parse(person.servingAt) : Date.parse(person.joinedAt);
  const elapsed = Number.isNaN(started) ? 0 : Math.max(0, (nowMs - started) / 60000);
  return Math.max(person.durationMinutes - elapsed, 0);
}

function sortQueue(people: QueueEtaPerson[]): QueueEtaPerson[] {
  return [...people].sort((a, b) => {
    const time = Date.parse(a.joinedAt) - Date.parse(b.joinedAt);
    if (time !== 0) return time;
    return a.id.localeCompare(b.id);
  });
}

/**
 * Simula cadeiras. Retorna minutos até a vez do target, ou null se não houver cadeira.
 */
export function calcQueueEtaMinutes(input: CalcQueueEtaInput): number | null {
  const chairs = Math.floor(input.chairs);
  if (chairs <= 0) return null;

  const scoped = input.mode === 'per_professional'
    ? input.people.filter((person) => person.professionalId === (input.professionalId ?? null))
    : input.people;

  const target = scoped.find((person) => person.id === input.targetId);
  if (!target || target.status === 'serving') return 0;

  const ordered = sortQueue(scoped);
  const targetIndex = ordered.findIndex((person) => person.id === input.targetId);
  if (targetIndex < 0) return null;

  const ahead = ordered.slice(0, targetIndex);
  const servingAhead = ahead.filter((person) => person.status === 'serving');
  const waitingAhead = ahead.filter((person) => person.status === 'waiting' || person.status === 'calling');

  const chairLoads = Array.from({ length: chairs }, () => 0);
  servingAhead.forEach((person, index) => {
    const chair = index % chairs;
    chairLoads[chair] += remainingServing(person, input.nowMs);
  });

  waitingAhead.forEach((person) => {
    let minChair = 0;
    for (let i = 1; i < chairs; i += 1) {
      if (chairLoads[i] < chairLoads[minChair]) minChair = i;
    }
    chairLoads[minChair] += person.durationMinutes;
  });

  return Math.ceil(Math.min(...chairLoads));
}
