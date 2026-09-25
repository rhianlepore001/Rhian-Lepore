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
 * Mensagem clara quando o banco recusa o horário (create_secure_booking: outro
 * agendamento começa dentro de [início, início + duração) ou pedido online
 * sobrepõe). Ex.: serviço de 60 min num horário liberado de 30 min.
 */
export function slotConflictMessage(time: string, durationMin: number, professionalName?: string | null): string {
  const [h, m] = time.split(':').map(Number);
  const endMins = h * 60 + (m || 0) + durationMin;
  const end = `${pad(Math.floor(endMins / 60) % 24)}:${pad(endMins % 60)}`;
  const who = professionalName?.trim() ? `${professionalName.trim()} já tem` : 'já existe';
  return `Esse horário não está livre para ${durationMin} min: ${who} outro agendamento entre ${time} e ${end}. Escolha outro horário ou serviços mais curtos.`;
}
