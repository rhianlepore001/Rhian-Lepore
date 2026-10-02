import { supabase } from '@/lib/supabase';
import type { AgendaBlock, CreateAgendaBlockResult } from '@/types/agendaBlocks';

export async function fetchAgendaBlocks(
  companyId: string,
  fromIso: string,
  toIso: string,
): Promise<AgendaBlock[]> {
  const { data, error } = await supabase
    .from('agenda_blocks')
    .select('id, user_id, professional_id, starts_at, ends_at, created_by, created_at')
    .eq('user_id', companyId)
    .lt('starts_at', toIso)
    .gt('ends_at', fromIso)
    .order('starts_at');

  if (error) throw error;
  return (data ?? []) as AgendaBlock[];
}

export async function createAgendaBlock(input: {
  professionalId: string;
  startsAt: string;
  endsAt: string;
  acknowledgeConflicts?: boolean;
}): Promise<CreateAgendaBlockResult> {
  const { data, error } = await supabase.rpc('create_agenda_block', {
    p_professional_id: input.professionalId,
    p_starts_at: input.startsAt,
    p_ends_at: input.endsAt,
    p_acknowledge_conflicts: input.acknowledgeConflicts ?? false,
  });
  if (error) throw error;
  return data as CreateAgendaBlockResult;
}

export async function deleteAgendaBlock(blockId: string): Promise<void> {
  const { data, error } = await supabase.rpc('delete_agenda_block', {
    p_block_id: blockId,
  });
  if (error) throw error;
  const result = data as { success?: boolean; code?: string } | null;
  if (result && result.success === false) {
    throw new Error(result.code ?? 'delete_agenda_block_failed');
  }
}
