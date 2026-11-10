/**
 * Regra de reconhecimento de receita (Financeiro, Dashboard, comissões, hora de cadeira):
 * a receita de um atendimento entra na data em que ele foi concluído/pago (`completed_at`),
 * não na data em que estava marcado. Atendimentos antigos sem `completed_at` caem na data
 * marcada (comportamento legado). Mesma regra das RPCs: COALESCE(completed_at, appointment_time).
 */
export interface RecognizableAppointment {
  appointment_time: string;
  completed_at?: string | null;
}

export function revenueRecognizedAt(apt: RecognizableAppointment): string {
  return apt.completed_at || apt.appointment_time;
}

/** Filtro `.or()` do PostgREST para "receita reconhecida entre from e to" (inclusive). */
export function recognizedInRangeFilter(fromIso: string, toIso: string): string {
  return (
    `and(completed_at.gte.${fromIso},completed_at.lte.${toIso}),` +
    `and(completed_at.is.null,appointment_time.gte.${fromIso},appointment_time.lte.${toIso})`
  );
}
