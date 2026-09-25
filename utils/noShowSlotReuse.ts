/**
 * Falta (NoShow) -> "Usar este horário": reaproveita o horário que ficou livre
 * para um NOVO agendamento (qualquer cliente). Pré-preenche só profissional,
 * dia e horário; cliente e serviço ficam em branco. A falta nunca é alterada.
 */
import { isNoShowStatus } from './appointmentStatus';

export interface NoShowSlotSource {
  clientName?: string | null;
  professional_id?: string | null;
  appointment_time: string;
  status?: string | null;
  duration_minutes?: number | null;
}

export interface NoShowSlotPrefill {
  /** Profissional da falta (vazio se não está mais na equipe). */
  professionalId: string;
  /** Dia (00:00 local) do horário liberado. */
  date: Date;
  /** "HH:MM" local do horário liberado. */
  time: string;
  /** Frase curta no topo do wizard. */
  slotContext: string;
}

const pad = (n: number) => n.toString().padStart(2, '0');

/** "HH:MM" na hora local do dispositivo (como o resto da Agenda). */
export function localHHMM(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "Horário liberado pela falta de Aline Lima às 14:00". */
export function noShowSlotContext(apt: Pick<NoShowSlotSource, 'clientName' | 'appointment_time'>): string {
  const who = apt.clientName?.trim() || 'um cliente';
  const at = localHHMM(apt.appointment_time);
  return at ? `Horário liberado pela falta de ${who} às ${at}` : `Horário liberado pela falta de ${who}`;
}

/** Prefill do "Usar este horário" (detalhes da falta). */
export function buildNoShowSlotPrefill(
  apt: NoShowSlotSource,
  teamMembers: Array<{ id: string }>,
): NoShowSlotPrefill {
  const start = new Date(apt.appointment_time);
  const date = new Date(start);
  date.setHours(0, 0, 0, 0);
  const professionalId =
    apt.professional_id && teamMembers.some((m) => m.id === apt.professional_id) ? apt.professional_id : '';
  return {
    professionalId,
    date,
    time: localHHMM(apt.appointment_time),
    slotContext: noShowSlotContext(apt),
  };
}

/**
 * Falta do profissional que cobre a linha `time` do dia `day` (mesma regra da
 * grade: início <= linha < início + duração, mínimo 30 min). Usado pelo "+" ao
 * lado do card da falta. Se houver agendamento ativo cobrindo a linha, o "+"
 * nem aparece — então basta procurar a falta.
 */
export function findNoShowCoveringSlot<T extends NoShowSlotSource>(
  appointments: T[],
  professionalId: string,
  day: Date,
  time: string,
): T | undefined {
  const [h, m] = time.split(':').map(Number);
  const slot = new Date(day);
  slot.setHours(h, m || 0, 0, 0);
  const slotMs = slot.getTime();
  return appointments.find((a) => {
    if (!isNoShowStatus(a.status) || a.professional_id !== professionalId) return false;
    const start = new Date(a.appointment_time).getTime();
    const mins = a.duration_minutes && a.duration_minutes > 0 ? Math.max(a.duration_minutes, 30) : 30;
    return start <= slotMs && slotMs < start + mins * 60_000;
  });
}

/**
 * O horário da falta já terminou? (início + duração, padrão 30 min, antes de
 * `now`). Falta de hoje ainda em andamento ou futura continua reaproveitável;
 * falta de dia passado / já encerrada não oferece "Usar este horário" nem o "+".
 */
export function noShowSlotEnded(
  apt: Pick<NoShowSlotSource, 'appointment_time' | 'duration_minutes'>,
  now: Date = new Date(),
): boolean {
  const start = new Date(apt.appointment_time).getTime();
  if (Number.isNaN(start)) return true;
  const mins = apt.duration_minutes && apt.duration_minutes > 0 ? apt.duration_minutes : 30;
  return start + mins * 60_000 < now.getTime();
}

/** Mensagem padrão de create_secure_booking quando o horário está ocupado. */
const DB_BUSY_MESSAGE = /acabou de ser ocupado/i;

/**
 * Mensagem quando o banco recusa o horário. Genérica de propósito: o motivo
 * pode ser outro agendamento OU um pedido online pendente dentro da duração
 * escolhida (ex.: serviço de 60 min num horário liberado de 30 min).
 * Mensagens específicas do banco (não a de "ocupado") são mantidas.
 */
export function slotConflictMessage(
  durationMin: number,
  professionalName?: string | null,
  dbMessage?: string | null,
): string {
  if (dbMessage && dbMessage.trim() && !DB_BUSY_MESSAGE.test(dbMessage)) return dbMessage.trim();
  const who = professionalName?.trim() ? ` com ${professionalName.trim()}` : '';
  return `Esse horário não está livre para ${durationMin} min${who}. Escolha outro horário ou serviços mais curtos.`;
}
