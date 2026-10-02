export interface AgendaBlock {
  id: string;
  user_id: string;
  professional_id: string;
  starts_at: string;
  ends_at: string;
  created_by?: string | null;
  created_at?: string;
}

export interface AgendaBlockConflict {
  id: string;
  kind: 'appointment' | 'public_booking';
  client_name: string;
  service: string | null;
  appointment_time: string;
  status: string;
}

export type CreateAgendaBlockResult =
  | { success: true; id: string }
  | { success: false; code: 'conflicts'; items: AgendaBlockConflict[] }
  | { success: false; code: string; message?: string };

export function isAgendaBlockConflictResult(
  result: CreateAgendaBlockResult,
): result is { success: false; code: 'conflicts'; items: AgendaBlockConflict[] } {
  return result.success === false
    && result.code === 'conflicts'
    && Array.isArray((result as { items?: unknown }).items);
}
