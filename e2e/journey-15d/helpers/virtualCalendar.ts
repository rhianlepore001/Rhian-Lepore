const TZ = process.env.E2E_TZ || 'America/Sao_Paulo';

/** Âncora do mês simulado (dia virtual 1 = esta data). */
export function journeyAnchor(): string {
  return process.env.E2E_ANCHOR_DATE || '2026-09-01';
}

/** Dia virtual 1..N → ISO YYYY-MM-DD no fuso do negócio. */
export function virtualDayIso(virtualDay: number): string {
  const anchor = journeyAnchor();
  const [y, m, d] = anchor.split('-').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + (virtualDay - 1)));
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(utc);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

export function agendaUrl(base: string, virtualDay: number): string {
  const date = virtualDayIso(virtualDay);
  const root = base.replace(/\/$/, '');
  return `${root}/#/agenda?date=${date}`;
}
