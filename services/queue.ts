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

export const QUEUE_PHONE_PROOF_KEY = (entryId: string) => `queue_proof_phone_${entryId}`;

export function storeQueuePhoneProof(entryId: string, phone: string): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(QUEUE_PHONE_PROOF_KEY(entryId), sanitizeQueuePhone(phone));
}

export function readQueuePhoneProof(entryId: string): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  return sessionStorage.getItem(QUEUE_PHONE_PROOF_KEY(entryId));
}

export async function findActiveQueueEntryByPhone(
  businessId: string,
  phone: string,
): Promise<QueueRecord | null> {
  const normalizedPhone = sanitizeQueuePhone(phone);
  if (!normalizedPhone) return null;

  const { data, error } = await supabase.rpc('find_active_queue_entry_by_phone', {
    p_business_id: businessId,
    p_phone: phone,
  });

  if (error) throw error;
  const entry = data?.[0];
  return entry ? queueEntrySchema.parse(entry) : null;
}

export async function joinQueue(input: JoinQueueInput): Promise<QueueRecord> {
  const parsed = joinQueueInputSchema.parse(input);
  const duplicate = await findActiveQueueEntryByPhone(parsed.businessId, parsed.clientPhone);

  if (duplicate) {
    throw new Error('Este telefone já está na fila.');
  }

  const slug = parsed.slug ?? await fetchBusinessSlug(parsed.businessId);
  if (!slug) {
    throw new Error('Estabelecimento sem link público.');
  }

  const { data, error } = await supabase.rpc('join_queue_entry', {
    p_slug: slug,
    p_client_name: parsed.clientName,
    p_client_phone: parsed.clientPhone,
    p_service_id: parsed.serviceId ?? null,
    p_professional_id: parsed.professionalId ?? null,
    p_payment_method: parsed.paymentMethod ?? 'cash',
  });

  if (error) throw error;

  const created = await findActiveQueueEntryByPhone(parsed.businessId, parsed.clientPhone);
  if (!created) {
    const joinedId = (data as { id?: string } | null)?.id;
    if (!joinedId) {
      throw new Error('Queue entry created but could not be retrieved');
    }
    storeQueuePhoneProof(joinedId, parsed.clientPhone);
    return queueEntrySchema.parse({
      id: joinedId,
      business_id: parsed.businessId,
      client_name: parsed.clientName,
      client_phone: parsed.clientPhone,
      service_id: parsed.serviceId ?? null,
      professional_id: parsed.professionalId ?? null,
      status: 'waiting',
      joined_at: new Date().toISOString(),
    });
  }

  storeQueuePhoneProof(created.id, parsed.clientPhone);
  return created;
}

export async function addManualQueueEntry(input: ManualQueueInput): Promise<QueueRecord> {
  const parsed = manualQueueInputSchema.parse(input);
  const duplicate = await findActiveQueueEntryByPhone(parsed.businessId, parsed.clientPhone);

  if (duplicate) {
    throw new Error('Este telefone já está na fila.');
  }

  const { data, error } = await supabase.rpc('add_manual_queue_entry', {
    p_client_name: parsed.clientName,
    p_client_phone: parsed.clientPhone,
    p_service_id: parsed.serviceId ?? null,
    p_professional_id: parsed.professionalId ?? null,
    p_payment_method: parsed.paymentMethod ?? 'cash',
  });

  if (error) throw error;
  const created = await findActiveQueueEntryByPhone(parsed.businessId, parsed.clientPhone);
  if (created) return created;

  return queueEntrySchema.parse({
    id: (data as { id?: string })?.id ?? 'pending',
    business_id: parsed.businessId,
    client_name: parsed.clientName,
    client_phone: parsed.clientPhone,
    service_id: parsed.serviceId ?? null,
    professional_id: parsed.professionalId ?? null,
    status: 'waiting',
    joined_at: new Date().toISOString(),
  });
}

export async function updateQueueStatus(input: UpdateQueueStatusInput): Promise<void> {
  const parsed = updateQueueStatusInputSchema.parse(input);
  const { error } = await supabase.rpc('update_queue_status', {
    p_entry_id: parsed.entryId,
    p_status: parsed.status,
  });

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

export async function fetchQueuePublicBoard(entryId: string, phone: string) {
  const { data, error } = await supabase.rpc('get_queue_public_board', {
    p_entry_id: entryId,
    p_phone: phone,
  });
  if (error) throw error;
  return data;
}

export async function confirmQueuePayment(entryId: string) {
  const { error } = await supabase.rpc('confirm_queue_payment', { p_entry_id: entryId });
  if (error) throw error;
}

export async function cancelQueuePayment(entryId: string) {
  const { error } = await supabase.rpc('cancel_queue_payment', { p_entry_id: entryId });
  if (error) throw error;
}

export async function closeQueueTicket(entryId: string) {
  const { error } = await supabase.rpc('close_queue_ticket', { p_entry_id: entryId });
  if (error) throw error;
}

export async function settleQueueTicket(input: {
  entryId: string;
  serviceName?: string | null;
  finalPrice?: number | null;
  professionalId?: string | null;
  paymentMethod?: string | null;
}) {
  const { error } = await supabase.rpc('settle_queue_ticket', {
    p_entry_id: input.entryId,
    p_service_name: input.serviceName ?? null,
    p_final_price: input.finalPrice ?? null,
    p_professional_id: input.professionalId ?? null,
    p_payment_method: input.paymentMethod ?? null,
  });
  if (error) throw error;
}

export async function fetchQueueSettings() {
  const { data, error } = await supabase.rpc('fetch_queue_settings');
  if (error) throw error;
  return data;
}

export async function updateQueueSettings(allowLeave: boolean, lateMinutes: number) {
  const { error } = await supabase.rpc('update_queue_settings', {
    p_allow_leave: allowLeave,
    p_late_minutes: lateMinutes,
  });
  if (error) throw error;
}

export async function setQueueMode(mode: 'shared' | 'per_professional') {
  const { error } = await supabase.rpc('set_queue_mode', { p_mode: mode });
  if (error) throw error;
}

export async function fetchQueueEntries(businessId: string) {
  await resetExpiredCallingEntries(businessId);

  const { data, error } = await supabase
    .from('queue_entries')
    .select('*')
    .eq('business_id', businessId)
    .in('status', ['waiting', 'calling', 'serving', 'completed'])
    .gte('joined_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
    .order('joined_at', { ascending: true });

  if (error) throw error;
  return data as QueueRecord[];
}

export async function fetchBusinessSlug(businessId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('business_slug')
    .eq('id', businessId)
    .single();

  if (error) throw error;
  return data?.business_slug ?? null;
}

export async function fetchQueueTeamMembers(businessId: string) {
  const { data, error } = await supabase
    .from('team_members')
    .select('id, name, commission_rate')
    .eq('user_id', businessId)
    .eq('active', true);

  if (error) throw error;
  return data as { id: string; name: string; commission_rate?: number }[];
}

export async function fetchServiceById(serviceId: string, businessId: string) {
  const { data, error } = await supabase
    .from('services')
    .select('price, name')
    .eq('id', serviceId)
    .eq('user_id', businessId)
    .single();

  if (error) throw error;
  return data as { price: number; name: string } | null;
}

export interface QueueBusinessProfile {
  id: string;
  business_name: string | null;
  user_type: string | null;
}

export interface QueueStatusSnapshot {
  entry: QueueRecord;
  business: QueueBusinessProfile | null;
  position: number | null;
}

export async function fetchQueueEntry(entryId: string, phone: string): Promise<QueueRecord> {
  const { data, error } = await supabase.rpc('get_queue_entry_public', {
    p_entry_id: entryId,
    p_phone: phone,
  });

  if (error) throw error;
  const entry = data?.[0];
  if (!entry) {
    throw new Error('Queue entry not found');
  }
  return queueEntrySchema.parse(entry);
}

export async function cancelQueueEntryPublic(entryId: string, phone: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('cancel_queue_entry_public', {
    p_entry_id: entryId,
    p_phone: phone,
  });

  if (error) throw error;
  return data === true;
}

export async function fetchQueueBusinessProfile(businessId: string): Promise<QueueBusinessProfile | null> {
  const { data, error } = await supabase.rpc('get_public_business_profile_minimal', {
    p_business_id: businessId,
  });

  if (error) throw error;
  const profile = data?.[0];
  return profile ? (profile as QueueBusinessProfile) : null;
}

export async function resolveQueuePosition(entry: QueueRecord): Promise<number | null> {
  if (entry.status !== 'waiting') return null;

  const { data: posData, error: rpcError } = await supabase.rpc('get_queue_position', {
    p_queue_id: entry.id,
    p_business_id: entry.business_id,
  });

  if (!rpcError && posData !== null) {
    return posData as number;
  }

  const { count, error } = await supabase
    .from('queue_entries')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', entry.business_id)
    .eq('status', 'waiting')
    .lte('joined_at', entry.joined_at);

  if (error) throw error;
  return count;
}

export async function fetchQueueStatusSnapshot(entryId: string, phone: string): Promise<QueueStatusSnapshot> {
  const entry = await fetchQueueEntry(entryId, phone);
  const business = await fetchQueueBusinessProfile(entry.business_id);
  const position = await resolveQueuePosition(entry);

  return { entry, business, position };
}
