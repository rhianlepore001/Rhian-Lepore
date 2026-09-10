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

export const QUEUE_PHONE_PROOF_KEY = (entryId: string) => `queue_proof_phone_${entryId}`;
export const QUEUE_LAST_SLUG_KEY = 'queue_last_business_slug';
export const QUEUE_TICKET_KEY = (businessId: string) => `queue_ticket_${businessId}`;

const QUEUE_PROOF_PREFIX = 'queue_proof_phone_';

export interface QueueTicketSession {
  businessId: string;
  entryId: string;
  phone: string;
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

export function storeQueuePhoneProof(entryId: string, phone: string): void {
  const value = sanitizeQueuePhone(phone);
  writeStorage(typeof sessionStorage === 'undefined' ? undefined : sessionStorage, QUEUE_PHONE_PROOF_KEY(entryId), value);
  writeStorage(typeof localStorage === 'undefined' ? undefined : localStorage, QUEUE_PHONE_PROOF_KEY(entryId), value);
}

export function readQueuePhoneProof(entryId: string): string | null {
  return readStorage(typeof localStorage === 'undefined' ? undefined : localStorage, QUEUE_PHONE_PROOF_KEY(entryId))
    ?? readStorage(typeof sessionStorage === 'undefined' ? undefined : sessionStorage, QUEUE_PHONE_PROOF_KEY(entryId));
}

export function storeQueueTicket(ticket: QueueTicketSession): void {
  if (typeof localStorage === 'undefined') return;
  const payload: QueueTicketSession = {
    ...ticket,
    phone: sanitizeQueuePhone(ticket.phone) || ticket.phone,
  };
  localStorage.setItem(QUEUE_TICKET_KEY(ticket.businessId), JSON.stringify(payload));
  if (ticket.slug) storeQueueBusinessSlug(ticket.slug);
  storeQueuePhoneProof(ticket.entryId, ticket.phone);
}

export function readQueueTicket(businessId: string): QueueTicketSession | null {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(QUEUE_TICKET_KEY(businessId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as QueueTicketSession;
    if (!parsed?.entryId || !parsed?.phone) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearQueueTicket(businessId: string): void {
  if (typeof localStorage === 'undefined') return;
  const ticket = readQueueTicket(businessId);
  localStorage.removeItem(QUEUE_TICKET_KEY(businessId));
  if (!ticket) return;
  localStorage.removeItem(QUEUE_PHONE_PROOF_KEY(ticket.entryId));
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(QUEUE_PHONE_PROOF_KEY(ticket.entryId));
  }
}

export function listQueuePhoneProofs(): Array<{ entryId: string; phone: string }> {
  const found = new Map<string, string>();
  const scan = (storage: Storage | undefined) => {
    if (!storage) return;
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (!key?.startsWith(QUEUE_PROOF_PREFIX)) continue;
      const phone = storage.getItem(key);
      if (!phone) continue;
      found.set(key.slice(QUEUE_PROOF_PREFIX.length), phone);
    }
  };
  scan(typeof sessionStorage === 'undefined' ? undefined : sessionStorage);
  scan(typeof localStorage === 'undefined' ? undefined : localStorage);
  return [...found.entries()].map(([entryId, phone]) => ({ entryId, phone }));
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
  return text.includes('já está na fila') || text.includes('ja esta na fila');
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
  if (lower.includes('qr de colaborador') || lower.includes('qr nao esta ativo') || lower.includes('qr não está ativo')) {
    return 'Este QR Code não está mais ativo. Use o QR Code geral do estabelecimento.';
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
  const entry = Array.isArray(data) ? data[0] : data;
  return parseQueueRecord(entry);
}

export async function resolveClientQueueEntry(input: {
  businessId: string;
  phone: string | null;
  slug?: string | null;
}): Promise<QueueRecord | null> {
  const ticket = readQueueTicket(input.businessId);
  const lookupPhone = input.phone || ticket?.phone || null;
  const slug = input.slug || ticket?.slug || readQueueBusinessSlug() || '';

  const candidates: Array<{ entryId: string; phone: string }> = [];
  if (ticket?.entryId && (lookupPhone || ticket.phone)) {
    candidates.push({ entryId: ticket.entryId, phone: lookupPhone || ticket.phone });
  }
  for (const proof of listQueuePhoneProofs()) {
    if (candidates.some((candidate) => candidate.entryId === proof.entryId)) continue;
    candidates.push(proof);
  }

  // Senha de hoje já encerrada (concluída / não compareceu): só é devolvida se
  // não houver nenhuma senha ativa, para o cliente ver o desfecho em vez de "fora da fila".
  let recentClosed: QueueRecord | null = null;
  // Falha de rede/RPC não pode virar "você não está na fila": propagamos se nada respondeu.
  let lastFailure: unknown = null;

  for (const candidate of candidates) {
    try {
      const byId = await fetchQueueEntry(candidate.entryId, candidate.phone);
      if (byId.business_id !== input.businessId) continue;
      if (!isActiveQueueStatus(byId.status)) {
        if (isRecentClosedQueueEntry(byId)) {
          if (!recentClosed || Date.parse(byId.joined_at) > Date.parse(recentClosed.joined_at)) {
            recentClosed = byId;
          }
          continue;
        }
        if (ticket?.entryId === byId.id) clearQueueTicket(input.businessId);
        continue;
      }
      storeQueueTicket({
        businessId: input.businessId,
        entryId: byId.id,
        phone: candidate.phone,
        slug,
      });
      return byId;
    } catch (error) {
      if (!isQueueEntryNotFound(error)) lastFailure = error;
    }
  }

  if (lookupPhone) {
    try {
      const active = await findActiveQueueEntryByPhone(input.businessId, lookupPhone);
      if (active) {
        storeQueueTicket({
          businessId: input.businessId,
          entryId: active.id,
          phone: lookupPhone,
          slug,
        });
        return active;
      }
    } catch (error) {
      lastFailure = error;
    }
  }

  if (recentClosed) return recentClosed;
  if (lastFailure) {
    throw new QueueLookupError('Não foi possível consultar sua senha.', lastFailure);
  }
  return null;
}

function rememberJoinedEntry(slug: string, entry: QueueRecord, phone: string): QueueRecord {
  storeQueueTicket({
    businessId: entry.business_id,
    entryId: entry.id,
    phone,
    slug,
  });
  return entry;
}

function fallbackJoinedRecord(input: JoinQueueInput, entryId: string): QueueRecord {
  return {
    id: entryId,
    business_id: input.businessId,
    client_name: input.clientName,
    client_phone: input.clientPhone,
    service_id: input.serviceId ?? null,
    professional_id: input.professionalId ?? null,
    status: 'waiting',
    joined_at: new Date().toISOString(),
  };
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

  try {
    const duplicate = await findActiveQueueEntryByPhone(parsed.businessId, parsed.clientPhone);
    if (duplicate) {
      // Não fingimos que a nova escolha (serviço / Pix) foi registrada: quem chama decide
      // como avisar e abre a senha existente.
      throw new QueueAlreadyActiveError(rememberJoinedEntry(slug, duplicate, parsed.clientPhone));
    }
  } catch (error) {
    if (error instanceof QueueAlreadyActiveError) throw error;
    // Dedup é best-effort: a RPC de join ainda valida unicidade.
  }

  const { data, error } = await supabase.rpc('join_queue_entry', {
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

  if (error) {
    if (isAlreadyInQueueError(error)) {
      try {
        const existing = await findActiveQueueEntryByPhone(parsed.businessId, parsed.clientPhone);
        if (existing) throw new QueueAlreadyActiveError(rememberJoinedEntry(slug, existing, parsed.clientPhone));
      } catch (lookupError) {
        if (lookupError instanceof QueueAlreadyActiveError) throw lookupError;
        // segue o erro original abaixo
      }
    }
    throw new Error(queueJoinUserMessage(error));
  }

  storeQueueBusinessSlug(slug);

  try {
    const created = await findActiveQueueEntryByPhone(parsed.businessId, parsed.clientPhone);
    if (created) {
      return rememberJoinedEntry(slug, created, parsed.clientPhone);
    }
  } catch {
    // Recupera pelo payload da RPC.
  }

  const payload = data && typeof data === 'object' ? data as { id?: string } : null;
  const joinedId = payload?.id;
  if (!joinedId) {
    throw new Error('Não foi possível confirmar sua senha. Fale com a equipe no balcão.');
  }
  return rememberJoinedEntry(slug, fallbackJoinedRecord(parsed, joinedId), parsed.clientPhone);
}

export async function addManualQueueEntry(input: ManualQueueInput): Promise<QueueRecord> {
  const parsed = manualQueueInputSchema.parse(input);
  const duplicate = await findActiveQueueEntryByPhone(parsed.businessId, parsed.clientPhone);

  if (duplicate) {
    throw new Error(`Este telefone já está na fila (${duplicate.client_name}).`);
  }

  const { data, error } = await supabase.rpc('add_manual_queue_entry', {
    p_client_name: parsed.clientName,
    p_client_phone: parsed.clientPhone,
    p_service_id: parsed.serviceId ?? null,
    p_professional_id: parsed.professionalId ?? null,
    p_payment_method: parsed.paymentMethod ?? 'cash',
  });

  if (error) {
    throw new Error(queueJoinUserMessage(error, 'Não foi possível adicionar o cliente à fila. Tente de novo.'));
  }
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

export async function fetchQueuePublicBoard(entryId: string, phone: string): Promise<QueuePublicBoard> {
  const { data, error } = await supabase.rpc('get_queue_public_board', {
    p_entry_id: entryId,
    p_phone: phone,
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
  const start = `${input.startDate}T00:00:00`;
  const end = `${input.endDate}T23:59:59`;
  let query = supabase
    .from('queue_entries')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', input.businessId)
    .eq('status', 'completed')
    .gte('joined_at', start)
    .lte('joined_at', end);

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
