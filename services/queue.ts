import { supabase } from '@/lib/supabase';
import {
  finishQueueEntryInputSchema,
  joinQueueInputSchema,
  manualQueueInputSchema,
  queueEntrySchema,
  updateQueueStatusInputSchema,
  type FinishQueueEntryInput,
  type JoinQueueInput,
  type ManualQueueInput,
  type QueueRecord,
  type QueueStatus,
  type UpdateQueueStatusInput,
} from '@/types/queue';

const ACTIVE_QUEUE_STATUSES: QueueStatus[] = ['waiting', 'calling', 'serving'];
const CALLING_TIMEOUT_MINUTES = 5;
const ESTIMATED_WAIT_MINUTES_PER_POSITION = 20;

export function calcEstimatedWaitMinutes(position: number): number {
  return Math.max(position, 0) * ESTIMATED_WAIT_MINUTES_PER_POSITION;
}

export function isCallingExpired(joinedAt: string, now = new Date()): boolean {
  const joinedTime = new Date(joinedAt).getTime();
  if (Number.isNaN(joinedTime)) return false;
  return now.getTime() - joinedTime >= CALLING_TIMEOUT_MINUTES * 60 * 1000;
}

export function sanitizeQueuePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

export async function findActiveQueueEntryByPhone(
  businessId: string,
  phone: string,
): Promise<QueueRecord | null> {
  const normalizedPhone = sanitizeQueuePhone(phone);
  if (!normalizedPhone) return null;

  const { data, error } = await supabase
    .from('queue_entries')
    .select('*')
    .eq('business_id', businessId)
    .in('status', ACTIVE_QUEUE_STATUSES)
    .or(`client_phone.eq.${phone},client_phone.eq.${normalizedPhone}`)
    .maybeSingle();

  if (error) throw error;
  return data ? queueEntrySchema.parse(data) : null;
}

export async function joinQueue(input: JoinQueueInput): Promise<QueueRecord> {
  const parsed = joinQueueInputSchema.parse(input);
  const duplicate = await findActiveQueueEntryByPhone(parsed.businessId, parsed.clientPhone);

  if (duplicate) {
    throw new Error('Este telefone ja esta na fila.');
  }

  const { data, error } = await supabase
    .from('queue_entries')
    .insert({
      business_id: parsed.businessId,
      client_name: parsed.clientName,
      client_phone: parsed.clientPhone,
      service_id: parsed.serviceId ?? null,
      professional_id: parsed.professionalId ?? null,
      status: 'waiting',
    })
    .select()
    .single();

  if (error) throw error;
  return queueEntrySchema.parse(data);
}

export async function addManualQueueEntry(input: ManualQueueInput): Promise<QueueRecord> {
  const parsed = manualQueueInputSchema.parse(input);
  const duplicate = await findActiveQueueEntryByPhone(parsed.businessId, parsed.clientPhone);

  if (duplicate) {
    throw new Error('Este telefone ja esta na fila.');
  }

  const { data, error } = await supabase
    .from('queue_entries')
    .insert({
      business_id: parsed.businessId,
      client_name: parsed.clientName,
      client_phone: parsed.clientPhone,
      status: 'waiting',
      joined_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return queueEntrySchema.parse(data);
}

export async function updateQueueStatus(input: UpdateQueueStatusInput): Promise<void> {
  const parsed = updateQueueStatusInputSchema.parse(input);
  const changes: { status: QueueStatus; called_at?: string | null } = {
    status: parsed.status,
  };

  if (parsed.status === 'calling') {
    changes.called_at = new Date().toISOString();
  } else {
    changes.called_at = null;
  }

  const { error } = await supabase
    .from('queue_entries')
    .update(changes)
    .eq('id', parsed.entryId)
    .eq('business_id', parsed.businessId);

  if (error) throw error;
}

export async function resetExpiredCallingEntries(businessId: string): Promise<void> {
  const timeoutDate = new Date(Date.now() - CALLING_TIMEOUT_MINUTES * 60 * 1000).toISOString();

  const { error } = await supabase
    .from('queue_entries')
    .update({ status: 'waiting' })
    .eq('business_id', businessId)
    .eq('status', 'calling')
    .not('called_at', 'is', null)
    .lte('called_at', timeoutDate);

  if (error) throw error;
}

export async function finishQueueEntry(input: FinishQueueEntryInput): Promise<void> {
  const parsed = finishQueueEntryInputSchema.parse(input);

  const { error } = await supabase.rpc('finish_queue_entry', {
    p_queue_entry_id: parsed.entryId,
    p_service_name: parsed.serviceName,
    p_final_price: parsed.finalPrice,
    p_professional_id: parsed.professionalId ?? null,
  });

  if (error) throw error;
}
