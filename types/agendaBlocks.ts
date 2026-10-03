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
  | { success: false; code: 'conflicts' | 'block_conflicts_changed'; items: AgendaBlockConflict[]; message?: string }
  | { success: false; code: string; message?: string; starts_at?: string; ends_at?: string };

export function isAgendaBlockConflictResult(
  result: CreateAgendaBlockResult,
): result is { success: false; code: 'conflicts' | 'block_conflicts_changed'; items: AgendaBlockConflict[]; message?: string } {
  return result.success === false
    && (result.code === 'conflicts' || result.code === 'block_conflicts_changed')
    && Array.isArray((result as { items?: unknown }).items);
}
