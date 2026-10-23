import { ZodError } from 'zod';
import { supabase } from '@/lib/supabase';
import { calcQueueEtaMinutes, type QueueEtaPerson } from '@/services/queueEta';
import {
  finishQueueEntryInputSchema,
  joinQueueInputSchema,
  manualQueueInputSchema,
  queueEntrySchema,
  queuePublicBoardSchema,
  queueSettingsSchema,
  updateQueueStatusInputSchema,
  type FinishQueueEntryInput,
  type JoinQueueInput,
  type ManualQueueInput,
  type QueueMode,
  type QueuePublicBoard,
  type QueueRecord,
  type QueueStatus,
  type QueueTicketItem,
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

export const QUEUE_LAST_SLUG_KEY = 'queue_last_business_slug';
export const QUEUE_TICKET_KEY = (businessId: string) => `queue_ticket_${businessId}`;
const QUEUE_TOKEN_KEY = (entryId: string) => `queue_token_${entryId}`;

export interface QueueTicketSession {
  businessId: string;
  entryId: string;
  token?: string;
  phone?: string;
  slug: string;
}

function writeStorage(storage: Storage | undefined, key: string, value: string): void {
  if (!storage) return;
  storage.setItem(key, value);
}

function readStorage(storage: Storage | undefined, key: string): string | null {
  if (!storage) return null;
  return storage.getItem(key);
}

export function storeQueueBusinessSlug(slug: string): void {
  writeStorage(typeof sessionStorage === 'undefined' ? undefined : sessionStorage, QUEUE_LAST_SLUG_KEY, slug);
  writeStorage(typeof localStorage === 'undefined' ? undefined : localStorage, QUEUE_LAST_SLUG_KEY, slug);
}

export function readQueueBusinessSlug(): string | null {
  return readStorage(typeof sessionStorage === 'undefined' ? undefined : sessionStorage, QUEUE_LAST_SLUG_KEY)
    ?? readStorage(typeof localStorage === 'undefined' ? undefined : localStorage, QUEUE_LAST_SLUG_KEY);
}

export function readQueueToken(entryId: string): string | null {
  return readStorage(typeof localStorage === 'undefined' ? undefined : localStorage, QUEUE_TOKEN_KEY(entryId));
}

export function storeQueueTicket(ticket: QueueTicketSession): void {
  if (typeof localStorage === 'undefined' || !ticket.token) return;
  const payload = { businessId: ticket.businessId, entryId: ticket.entryId, token: ticket.token, slug: ticket.slug };
  localStorage.setItem(QUEUE_TICKET_KEY(ticket.businessId), JSON.stringify(payload));
  localStorage.setItem(QUEUE_TOKEN_KEY(ticket.entryId), ticket.token);
  if (ticket.slug) storeQueueBusinessSlug(ticket.slug);
}

export function readQueueTicket(businessId: string): QueueTicketSession | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const parsed = JSON.parse(localStorage.getItem(QUEUE_TICKET_KEY(businessId)) ?? 'null') as QueueTicketSession | null;
    return parsed?.businessId === businessId && parsed.entryId && /^[a-f0-9]{64}$/.test(parsed.token ?? '') ? parsed : null;
  } catch {
    return null;
  }
}

export function clearQueueTicket(businessId: string): void {
  if (typeof localStorage === 'undefined') return;
  const ticket = readQueueTicket(businessId);
  localStorage.removeItem(QUEUE_TICKET_KEY(businessId));
  if (ticket) localStorage.removeItem(QUEUE_TOKEN_KEY(ticket.entryId));
}

export function isActiveQueueStatus(status: QueueStatus): boolean {
  return status === 'waiting' || status === 'calling' || status === 'serving';
}

const QUEUE_QR_VISIT_KEY = (slug: string) => `queue_qr_visit_${slug}`;

/** Marca, só para esta sessão do navegador, que o cliente chegou pelo QR desta casa. */
export function markQueueQrVisit(slug: string): void {
  writeStorage(typeof sessionStorage === 'undefined' ? undefined : sessionStorage, QUEUE_QR_VISIT_KEY(slug), '1');
}

export function hasQueueQrVisit(slug: string | null | undefined): boolean {
  if (!slug) return false;
  return readStorage(typeof sessionStorage === 'undefined' ? undefined : sessionStorage, QUEUE_QR_VISIT_KEY(slug)) === '1';
}

const RECENT_CLOSED_WINDOW_MS = 12 * 60 * 60 * 1000;

/**
 * Senha encerrada recentemente (concluída / não compareceu). Usa janela fixa de 12h
 * em vez de "hoje" para não depender do fuso do aparelho vs. do servidor.
 */
export function isRecentClosedQueueEntry(entry: QueueRecord, now = new Date()): boolean {
  if (entry.status !== 'completed' && entry.status !== 'no_show') return false;
  const joined = Date.parse(entry.joined_at);
  if (Number.isNaN(joined)) return false;
  const elapsed = now.getTime() - joined;
  return elapsed >= 0 && elapsed <= RECENT_CLOSED_WINDOW_MS;
}

/** O telefone já tem uma senha ativa nesta casa; `entry` é a senha existente (já guardada localmente). */
export class QueueAlreadyActiveError extends Error {
  constructor(readonly entry: QueueRecord) {
    super('Você já está nesta fila.');
    this.name = 'QueueAlreadyActiveError';
  }
}

export class QueueLookupError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'QueueLookupError';
  }
}

function isQueueEntryNotFound(error: unknown): boolean {
  return error instanceof Error && error.message === 'Queue entry not found';
}

function parseQueueRecord(entry: unknown): QueueRecord | null {
  const parsed = queueEntrySchema.safeParse(entry);
  return parsed.success ? parsed.data : null;
}

function rpcErrorText(error: unknown): string {
  if (!error || typeof error !== 'object') return String(error ?? '');
  const record = error as { message?: unknown; details?: unknown; hint?: unknown };
  return [record.message, record.details, record.hint]
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .join(' ');
}

export function isAlreadyInQueueError(error: unknown): boolean {
  const text = rpcErrorText(error).toLowerCase();
  return text.includes('já está na fila')
    || text.includes('ja esta na fila')
    || text.includes('duplicate key')
    || text.includes('uq_queue_active_phone');
}

export function queueJoinUserMessage(error: unknown, fallback = 'Não foi possível entrar na fila. Tente de novo ou fale com a equipe no balcão.'): string {
  const text = rpcErrorText(error);
  const lower = text.toLowerCase();
  if (isAlreadyInQueueError(error)) return 'Este número já tem uma senha ativa nesta fila. Fale com a equipe no balcão para localizá-la.';
  if (lower.includes('servico obrigatorio') || lower.includes('serviço obrigatório')) {
    return 'Escolha um serviço para continuar.';
  }
  if (lower.includes('servico invalido') || lower.includes('serviço inválido')) {
    return 'Este serviço não está mais disponível. Escolha outro e tente de novo.';
  }
  if (lower.includes('fila indisponivel') || lower.includes('fila indisponível')) {
    return 'A fila não está aberta no momento. Fale com a equipe no balcão.';
  }
  if (lower.includes('qr de colaborador obrigatorio') || lower.includes('qr de colaborador obrigatório')) {
    return 'Escolha em qual fila o cliente vai entrar.';
  }
  if (lower.includes('qr nao esta ativo') || lower.includes('qr não está ativo')) {
    return 'Este QR Code não está mais ativo. Use o QR Code geral do estabelecimento.';
  }
  if (lower.includes('invalid input syntax') && lower.includes('uuid')) {
    return 'Este serviço não está mais disponível. Escolha outro e tente de novo.';
  }
  if (lower.includes('limite de usos')) return 'Sua assinatura já atingiu o limite de usos deste mês.';
  if (lower.includes('assinatura')) return 'Sua assinatura não cobre este serviço. Escolha outra forma de pagamento.';
  if (lower.includes('schema cache') || lower.includes('could not find the function')) {
    return 'A fila está temporariamente indisponível. Tente de novo em instantes.';
  }
  if (lower.includes('estabelecimento sem link') || lower.includes('nao encontrado') || lower.includes('não encontrado')) {
    return 'Não encontramos este estabelecimento.';
  }
  if (lower.includes('tenant nao encontrado') || lower.includes('usuario autenticado')) {
    return 'Sua sessão expirou. Entre de novo na sua conta.';
  }
  return fallback;
}

export async function findActiveQueueEntryByPhone(businessId: string, _phone: string): Promise<QueueRecord | null> {
  const entry = await resolveClientQueueEntry({ businessId, phone: null });
  return entry && isActiveQueueStatus(entry.status) ? entry : null;
}

export async function resolveClientQueueEntry(input: {
  businessId: string;
  phone: string | null;
  slug?: string | null;
}): Promise<QueueRecord | null> {
  const ticket = readQueueTicket(input.businessId);
  if (!ticket?.token) return null;
  try {
    const entry = await fetchQueueEntry(ticket.entryId, ticket.token);
    if (entry.business_id !== input.businessId) return null;
    if (isActiveQueueStatus(entry.status) || isRecentClosedQueueEntry(entry)) return entry;
    clearQueueTicket(input.businessId);
    return null;
  } catch (error) {
    if (isQueueEntryNotFound(error)) return null;
    throw new QueueLookupError('Não foi possível consultar sua senha.', error);
  }
}

export async function joinQueue(input: JoinQueueInput): Promise<QueueRecord> {
  let parsed: JoinQueueInput;
  try {
    parsed = joinQueueInputSchema.parse(input);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error('Confira o serviço e os seus dados e tente de novo.');
    }
    throw error;
  }
  const slug = parsed.slug ?? await fetchBusinessSlug(parsed.businessId);
  if (!slug) {
    throw new Error('Este estabelecimento ainda não ativou a fila digital.');
  }

  const existing = await findActiveQueueEntryByPhone(parsed.businessId, parsed.clientPhone);
  if (existing) throw new QueueAlreadyActiveError(existing);

  const { data, error } = await supabase.rpc('join_queue_entry_private', {
    p_slug: slug,
    p_client_name: parsed.clientName,
    p_client_phone: parsed.clientPhone,
    p_service_id: parsed.serviceId,
    p_professional_id: parsed.professionalId ?? null,
    p_payment_method: parsed.paymentMethod ?? 'cash',
    p_br_code: parsed.brCode ?? null,
    p_txid: parsed.txid ?? null,
    p_mbway_phone: parsed.mbwayPhone ?? null,
  });

  if (error) throw new Error(queueJoinUserMessage(error));
  const payload = data as { entry?: unknown; management_token?: string } | null;
  const entry = parseQueueRecord(payload?.entry);
  if (!entry || !/^[a-f0-9]{64}$/.test(payload?.management_token ?? '')) {
    throw new Error('Não foi possível confirmar sua senha. Fale com o estabelecimento.');
  }
  storeQueueTicket({ businessId: entry.business_id, entryId: entry.id, token: payload!.management_token, slug });
  return entry;
}

export async function findNameToOpenPublicArea(businessId: string, _phone: string): Promise<string | null> {
  return (await resolveClientQueueEntry({ businessId, phone: null }))?.client_name ?? null;
}

export async function addManualQueueEntry(input: ManualQueueInput): Promise<QueueRecord> {
  let parsed: ManualQueueInput;
  try {
    parsed = manualQueueInputSchema.parse(input);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error('Confira nome, telefone e serviço e tente de novo.');
    }
    throw error;
  }

  const { data, error } = await supabase.rpc('add_manual_queue_entry', {
    p_client_name: parsed.clientName,
    p_client_phone: parsed.clientPhone,
    p_service_id: parsed.serviceId ?? null,
    p_professional_id: parsed.professionalId ?? null,
    p_payment_method: parsed.paymentMethod ?? null,
  });

  if (error) {
    throw new Error(queueJoinUserMessage(error, 'Não foi possível adicionar o cliente à fila. Tente de novo.'));
  }
  if (!(data as { id?: string })?.id) throw new Error('Não foi possível confirmar a senha. Tente novamente.');

  return queueEntrySchema.parse({
    id: (data as { id: string }).id,
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

export async function resetExpiredCallingEntries(_businessId: string): Promise<void> {
  return Promise.resolve();
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

function asEtaPeople(value: unknown): QueueEtaPerson[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) => {
    if (!row || typeof row !== 'object') return [];
    const person = row as Record<string, unknown>;
    const status = person.status;
    if (status !== 'waiting' && status !== 'calling' && status !== 'serving') return [];
    const id = String(person.id ?? '');
    const joinedAt = String(person.joinedAt ?? '');
    const rawDuration = Number(person.durationMinutes ?? 30);
    const durationMinutes = Number.isFinite(rawDuration) && rawDuration > 0 ? rawDuration : 30;
    if (!id || !joinedAt) return [];
    return [{
      id,
      joinedAt,
      durationMinutes,
      status,
      professionalId: person.professionalId ? String(person.professionalId) : null,
      servingAt: person.servingAt ? String(person.servingAt) : null,
    }];
  });
}

export function hydrateQueuePublicBoard(raw: unknown): QueuePublicBoard {
  const record = (raw && typeof raw === 'object') ? raw as Record<string, unknown> : {};
  const etaPeople = asEtaPeople(record.etaPeople);
  const rawChairs = Number(record.chairs ?? 0);
  // Sem colaborador ativo cadastrado ainda existe quem atende: o próprio dono.
  const chairs = Number.isFinite(rawChairs) && rawChairs > 0 ? rawChairs : 1;
  const mode = (record.queueMode === 'per_professional' ? 'per_professional' : 'shared') as QueueMode;
  const entryId = String(record.entryId ?? '');
  const etaMinutes = etaPeople.length > 0 && entryId
    ? calcQueueEtaMinutes({
      mode,
      chairs,
      nowMs: Date.now(),
      targetId: entryId,
      people: etaPeople,
      professionalId: record.professionalId ? String(record.professionalId) : null,
    })
    : null;

  return queuePublicBoardSchema.parse({
    ...record,
    etaMinutes,
  });
}

export async function fetchQueuePublicBoard(entryId: string, token: string): Promise<QueuePublicBoard> {
  const { data, error } = await supabase.rpc('get_queue_board_with_token', {
    p_entry_id: entryId,
    p_token: token,
  });
  if (error) throw error;
  return hydrateQueuePublicBoard(data);
}

export async function confirmQueuePayment(entryId: string) {
  const { error } = await supabase.rpc('confirm_queue_payment', { p_entry_id: entryId });
  if (error) throw error;
}

export async function cancelQueuePayment(entryId: string) {
  const { error } = await supabase.rpc('cancel_queue_payment', { p_entry_id: entryId });
  if (error) throw error;
}

export async function closeQueueTicket(entryId: string, items: QueueTicketItem[] = []) {
  const { error } = await supabase.rpc('close_queue_ticket', {
    p_entry_id: entryId,
    p_items: items.length > 0 ? items : null,
  });
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
  return queueSettingsSchema.parse(data);
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

function startOfLocalDay(day: Date): Date {
  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  return start;
}

export interface QueueHistorySummary {
  entered: number;
  completed: number;
  serving: number;
  waiting: number;
  noShow: number;
  cancelled: number;
}

export function summarizeQueueHistory(entries: QueueRecord[]): QueueHistorySummary {
  return {
    entered: entries.length,
    completed: entries.filter((entry) => entry.status === 'completed').length,
    serving: entries.filter((entry) => entry.status === 'serving').length,
    waiting: entries.filter((entry) => entry.status === 'waiting' || entry.status === 'calling').length,
    noShow: entries.filter((entry) => entry.status === 'no_show').length,
    cancelled: entries.filter((entry) => entry.status === 'cancelled').length,
  };
}

export async function fetchQueueHistory(businessId: string, day: Date): Promise<QueueRecord[]> {
  const start = startOfLocalDay(day);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const { data, error } = await supabase
    .from('queue_entries')
    .select('*')
    .eq('business_id', businessId)
    .gte('joined_at', start.toISOString())
    .lt('joined_at', end.toISOString())
    .order('joined_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).flatMap((row) => {
    const parsed = parseQueueRecord(row);
    return parsed ? [parsed] : [];
  });
}

export async function fetchQueueCompletedCount(input: {
  businessId: string;
  startDate: string;
  endDate: string;
  professionalId?: string | null;
}): Promise<number> {
  const isIsoRange = input.startDate.includes('T');
  const start = isIsoRange ? input.startDate : `${input.startDate}T00:00:00`;
  const end = isIsoRange ? input.endDate : `${input.endDate}T23:59:59`;
  let query = supabase
    .from('queue_entries')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', input.businessId)
    .eq('status', 'completed')
    .gte('joined_at', start);

  query = isIsoRange ? query.lt('joined_at', end) : query.lte('joined_at', end);

  if (input.professionalId) {
    query = query.eq('professional_id', input.professionalId);
  }

  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
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

export async function fetchQueueTeamMembers(
  businessId: string,
  options?: { includeInactive?: boolean },
) {
  let query = supabase
    .from('team_members')
    .select('id, name, commission_rate, active')
    .eq('user_id', businessId);

  if (!options?.includeInactive) {
    query = query.eq('active', true);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as { id: string; name: string; commission_rate?: number; active?: boolean }[];
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

export async function fetchQueueEntry(entryId: string, token: string): Promise<QueueRecord> {
  const { data, error } = await supabase.rpc('get_queue_entry_with_token', {
    p_entry_id: entryId,
    p_token: token,
  });

  if (error) throw error;
  const entry = data?.[0];
  if (!entry) {
    throw new Error('Queue entry not found');
  }
  return queueEntrySchema.parse(entry);
}

export async function cancelQueueEntryPublic(entryId: string, token: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('cancel_queue_entry_with_token', {
    p_entry_id: entryId,
    p_token: token,
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

export async function fetchQueueStatusSnapshot(entryId: string, token: string): Promise<QueueStatusSnapshot> {
  const entry = await fetchQueueEntry(entryId, token);
  const business = await fetchQueueBusinessProfile(entry.business_id);
  const position = (await fetchQueuePublicBoard(entryId, token)).position ?? null;

  return { entry, business, position };
}
