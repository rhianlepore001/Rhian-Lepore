/**
 * "Reagendar" de uma falta (NoShow): monta o pré-preenchimento do wizard de
 * NOVO agendamento (mesmo cliente/serviço/profissional, novo horário).
 * O agendamento com falta nunca é alterado — continua no histórico.
 */
export interface NoShowAppointmentLike {
  client_id?: string | null;
  clientName?: string | null;
  service?: string | null;
  professional_id?: string | null;
  appointment_time: string;
}

export interface RescheduleServiceLike {
  id: string;
  name: string;
}

export interface RescheduleMemberLike {
  id: string;
}

export interface RescheduleClientLike {
  id: string;
}

export type WizardStep = 1 | 2 | 3 | 4;

export interface NoShowReschedulePrefill {
  clientId: string;
  serviceIds: string[];
  /** Nomes do serviço original que não existem mais no catálogo (ex.: personalizado). */
  unmatchedServiceNames: string[];
  professionalId: string;
  /** Dia inicial do wizard (hoje, ou o dia da falta se ainda for futuro). */
  date: Date;
  notes: string;
  /** Primeiro passo que ainda precisa de escolha: 1 cliente, 2 serviços, 3 horário. */
  startStep: WizardStep;
  /** Frase curta mostrada no topo do wizard. */
  contextLabel: string;
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

/** "23/08 às 06:00" na hora local do dispositivo (como o resto da Agenda). */
export function formatNoShowWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} às ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "Corte, Barba + Sobrancelha" -> ["Corte", "Barba", "Sobrancelha"]. */
export function splitServiceNames(service: string | null | undefined): string[] {
  return (service ?? '')
    .split(/,|\s\+\s/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function buildNoShowReschedulePrefill(
  appointment: NoShowAppointmentLike,
  catalog: {
    services: RescheduleServiceLike[];
    teamMembers: RescheduleMemberLike[];
    clients: RescheduleClientLike[];
  },
  now: Date = new Date(),
): NoShowReschedulePrefill {
  const byName = new Map(catalog.services.map((s) => [s.name.trim().toLowerCase(), s.id]));
  const serviceIds: string[] = [];
  const unmatchedServiceNames: string[] = [];
  for (const name of splitServiceNames(appointment.service)) {
    const id = byName.get(name.toLowerCase());
    if (id && !serviceIds.includes(id)) serviceIds.push(id);
    else if (!id) unmatchedServiceNames.push(name);
  }

  const clientId =
    appointment.client_id && catalog.clients.some((c) => c.id === appointment.client_id)
      ? appointment.client_id
      : '';
  const professionalId =
    appointment.professional_id && catalog.teamMembers.some((m) => m.id === appointment.professional_id)
      ? appointment.professional_id
      : '';

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const noShowDay = new Date(appointment.appointment_time);
  noShowDay.setHours(0, 0, 0, 0);
  const date = !Number.isNaN(noShowDay.getTime()) && noShowDay > today ? noShowDay : today;

  const when = formatNoShowWhen(appointment.appointment_time);
  const startStep: WizardStep = !clientId ? 1 : serviceIds.length === 0 || unmatchedServiceNames.length > 0 ? 2 : 3;
  const who = appointment.clientName?.trim() || 'O cliente';

  return {
    clientId,
    serviceIds,
    unmatchedServiceNames,
    professionalId,
    date,
    notes: when ? `Reagendamento da falta de ${when}.` : 'Reagendamento de falta.',
    startStep,
    contextLabel:
      (when
        ? `${who} faltou em ${when}. Escolha o novo horário — a falta continua no histórico.`
        : 'Escolha o novo horário — a falta continua no histórico.') +
      (startStep === 2 ? ' Confira os serviços.' : startStep === 1 ? ' Selecione o cliente.' : ''),
  };
}
