import { supabase } from '@/lib/supabase';
import type { AgendaBlock, CreateAgendaBlockResult } from '@/types/agendaBlocks';
import { isMissingRpcError } from '@/utils/supabaseRpc';

function isMissingAgendaBlocksRelation(error: { code?: string; message?: string } | null | undefined): boolean {
  const msg = (error?.message ?? '').toLowerCase();
  return error?.code === '42P01'
    || error?.code === 'PGRST205'
    || (msg.includes('agenda_blocks') && (msg.includes('does not exist') || msg.includes('schema cache')));
}

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

  if (error) {
    if (isMissingAgendaBlocksRelation(error)) return [];
    throw error;
  }
  return (data ?? []) as AgendaBlock[];
}

export async function createAgendaBlock(input: {
  professionalId: string;
  startsAt: string;
  endsAt: string;
  acknowledgeConflicts?: boolean;
  confirmedConflictIds?: string[];
}): Promise<CreateAgendaBlockResult> {
  const { data, error } = await supabase.rpc('create_agenda_block', {
    p_professional_id: input.professionalId,
    p_starts_at: input.startsAt,
    p_ends_at: input.endsAt,
    p_acknowledge_conflicts: input.acknowledgeConflicts ?? false,
    p_confirmed_conflict_ids: input.confirmedConflictIds ?? null,
  });
  if (error) {
    if (isMissingRpcError(error)) {
      return { success: false, code: 'unavailable', message: 'Bloqueio de agenda ainda não está disponível neste ambiente.' };
    }
    throw error;
  }
  return data as CreateAgendaBlockResult;
}

export async function deleteAgendaBlock(blockId: string): Promise<void> {
  const { data, error } = await supabase.rpc('delete_agenda_block', {
    p_block_id: blockId,
  });
  if (error) throw error;
  const result = data as { success?: boolean; code?: string; message?: string } | null;
  if (result && result.success === false) {
    const err = new Error(result.message ?? result.code ?? 'delete_agenda_block_failed') as Error & { code?: string };
    err.code = result.code;
    throw err;
  }
}
