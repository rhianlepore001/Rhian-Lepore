// Textos e contas simples da hora de cadeira, escritos para quem não estuda gestão.
// Funções puras: sem efeitos e sem inventar números ausentes.

export const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/** "7 de cada 10": arredonda a ocupação para uma conta que qualquer pessoa entende. */
export function outOfTen(occupancy: number | null | undefined): string | null {
  if (!isNumber(occupancy) || occupancy < 0) return null;
  const tenths = Math.round(Math.min(occupancy, 1) * 10);
  if (tenths === 0 && occupancy > 0) return 'menos de 1 de cada 10';
  return `${tenths} de cada 10`;
}

export function formatHours(minutes: number | null | undefined): string | null {
  if (!isNumber(minutes) || minutes < 0) return null;
  const hours = minutes / 60;
  const rounded = hours >= 10 ? Math.round(hours) : Math.round(hours * 10) / 10;
  return `${rounded.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} h`;
}

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
const br = (value: string) => { const m = ISO.exec(value); return m ? `${m[3]}/${m[2]}/${m[1]}` : value; };

export function periodLabel(start: string, end: string | null): string {
  if (end) return `${br(start)} a ${br(end)}`;
  const m = ISO.exec(start);
  if (!m) return '';
  const name = MONTHS[Number(m[2]) - 1];
  return name ? `${name[0].toUpperCase()}${name.slice(1)} de ${m[1]}` : '';
}

const toDate = (value: string) => { const m = ISO.exec(value); return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null; };
const toIso = (date: Date) => date.toISOString().slice(0, 10);

/** Período imediatamente anterior, do mesmo tamanho, para comparar a pessoa com ela mesma. */
export function previousPeriod(start: string, end: string | null): { start: string; end: string | null } | null {
  const from = toDate(start);
  if (!from) return null;
  if (!end) return { start: toIso(new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() - 1, 1))), end: null };
  const to = toDate(end);
  if (!to || to < from) return null;
  const days = Math.round((to.getTime() - from.getTime()) / 86400000) + 1;
  const prevEnd = new Date(from.getTime() - 86400000);
  return { start: toIso(new Date(prevEnd.getTime() - (days - 1) * 86400000)), end: toIso(prevEnd) };
}

export interface TipInput {
  availableMinutes: number | null | undefined;
  occupancy: number | null | undefined;
  costPerHour: number | null | undefined;
  marginPerHour: number | null | undefined;
  lossService?: string | null;
}

/** Uma dica prática por vez, sempre apoiada nos números recebidos. */
export function pickTip({ availableMinutes, occupancy, costPerHour, marginPerHour, lossService }: TipInput): string | null {
  if (!isNumber(availableMinutes) || availableMinutes <= 0) return null;
  if (!isNumber(costPerHour)) return null;
  if (isNumber(marginPerHour) && marginPerHour < 0) {
    return lossService
      ? `As horas abertas ainda não pagam as contas. Encher os horários vazios ajuda mais rápido; depois, revise o preço de ${lossService}.`
      : 'As horas abertas ainda não pagam as contas. Encher os horários vazios é o caminho mais rápido.';
  }
  if (isNumber(occupancy) && occupancy < 0.6) return 'Muitos horários ficaram vazios. Avise seus clientes dos horários livres e ofereça encaixes.';
  if (lossService) return `Revise o preço de ${lossService}: do jeito que está, ele não cobre o custo da hora.`;
  return 'Bom ritmo. Manter a agenda cheia é o que faz cada hora render mais.';
}
