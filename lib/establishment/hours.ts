export interface OpeningStatus {
  open: boolean;
  label: string;
}

const dayIndex: Record<string, number> = {
  domingo: 0,
  segunda: 1,
  terca: 2,
  quarta: 3,
  quinta: 4,
  sexta: 5,
  sabado: 6,
};

function strip(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

function parseDayName(token: string): number | undefined {
  const key = strip(token).replace(/-feira/g, '').trim();
  return dayIndex[key];
}

export function weekdayNumbers(label: string): number[] {
  const cleaned = label.replace(/-feira/gi, '');
  const range = cleaned.split(/\s+a\s+/i);
  if (range.length === 2) {
    const from = parseDayName(range[0]);
    const to = parseDayName(range[1]);
    if (from == null || to == null) return [];
    const days: number[] = [];
    for (let day = from; days.length <= 7; day = (day + 1) % 7) {
      days.push(day);
      if (day === to) break;
    }
    return days;
  }
  return cleaned.split(/\s+e\s+/i).flatMap(part => {
    const day = parseDayName(part);
    return day == null ? [] : [day];
  });
}

function parseClock(token: string): number | undefined {
  const match = token.trim().match(/^(\d{1,2})(?:[:h](\d{2}))?h?$/i);
  if (!match) return undefined;
  const hours = Number(match[1]);
  const minutes = Number(match[2] || '0');
  if (hours > 23 || minutes > 59) return undefined;
  return hours * 60 + minutes;
}

export function formatClock(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h${String(rest).padStart(2, '0')}` : `${hours}h`;
}

export function parseHourBlocks(hours: string): Array<{ start: number; end: number }> {
  if (/fechad/i.test(hours)) return [];
  return hours.split(/\s*\/\s*/).flatMap(chunk => {
    const parts = chunk.split(/\s*(?:às|as|–|-|—)\s*/i);
    if (parts.length < 2) return [];
    const start = parseClock(parts[0]);
    const end = parseClock(parts[parts.length - 1]);
    if (start == null || end == null || end <= start) return [];
    return [{ start, end }];
  });
}

function zoneParts(now: Date, timeZone: string): { weekday: number; minutes: number } {
  const formatter = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const parts = Object.fromEntries(formatter.formatToParts(now).map(part => [part.type, part.value]));
  const weekdays: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { weekday: weekdays[parts.weekday] ?? 0, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

export function openingStatus(
  hours: Array<{ day: string; hours: string }>,
  now = new Date(),
  timeZone = 'America/Sao_Paulo',
): OpeningStatus | null {
  if (!hours.length) return null;
  const { weekday, minutes } = zoneParts(now, timeZone);
  const today = hours.filter(row => weekdayNumbers(row.day).includes(weekday));
  if (!today.length) return null;
  const blocks = today.flatMap(row => parseHourBlocks(row.hours)).sort((a, b) => a.start - b.start);
  if (!blocks.length) return { open: false, label: 'Fechado hoje' };
  if (blocks.some(block => minutes >= block.start && minutes < block.end)) {
    return { open: true, label: `Aberto hoje até ${formatClock(Math.max(...blocks.map(block => block.end)))}` };
  }
  const next = blocks.find(block => minutes < block.start);
  if (next) {
    return { open: false, label: minutes < blocks[0].start ? `Abre hoje às ${formatClock(next.start)}` : `Volta às ${formatClock(next.start)}` };
  }
  return { open: false, label: 'Fechado agora' };
}

export function timezoneForRegion(region: 'BR' | 'PT'): string {
  return region === 'PT' ? 'Europe/Lisbon' : 'America/Sao_Paulo';
}
