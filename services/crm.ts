import { supabase } from '@/lib/supabase';
import {
  createClientInputSchema,
  type AppointmentStatRow,
  type ClientFilter,
  type ClientRecord,
  type CreateClientInput,
  type EnrichedClient,
  type LoyaltyTier,
  type PublicClientRecord,
} from '@/types/crm';

export const INACTIVE_DAYS = 35;
export const NEW_CLIENT_DAYS = 30;
export const VIP_TOP_N = 10;
export const BIRTHDAY_WINDOW_DAYS = 7;

export function normalizePhone(phone: string | null | undefined): string {
  return (phone || '').replace(/\D/g, '');
}

export function phonesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = normalizePhone(a);
  const right = normalizePhone(b);

  if (!left || !right) return false;
  if (left === right) return true;
  if (left.length >= 8 && right.length >= 8) {
    return left.endsWith(right) || right.endsWith(left);
  }
  return false;
}

export function calcLoyaltyTier(totalVisits: number): LoyaltyTier {
  if (totalVisits >= 31) return 'Platinum';
  if (totalVisits >= 16) return 'Gold';
  if (totalVisits >= 6) return 'Silver';
  return 'Bronze';
}

export function findClientByPhoneInList(
  clients: Pick<ClientRecord, 'phone'>[],
  phone: string,
): Pick<ClientRecord, 'phone'> | null {
  return clients.find(client => phonesMatch(client.phone, phone)) || null;
}

export async function findClientByPhone(companyId: string, phone: string): Promise<ClientRecord | null> {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;

  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', companyId)
    .not('phone', 'is', null);

  if (error) throw error;
  return (data || []).find((client: ClientRecord) => phonesMatch(client.phone, phone)) || null;
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Dias desde a data (0 = hoje). Null se inválida. */
export function daysSince(date: string | Date | null | undefined): number | null {
  if (!date) return null;
  const parsed = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(parsed.getTime())) return null;
  const today = startOfLocalDay(new Date());
  const target = startOfLocalDay(parsed);
  return Math.floor((today.getTime() - target.getTime()) / 86_400_000);
}

/** Próximo aniversário em dias (0 = hoje), considerando virada de ano. */
export function daysUntilBirthday(birthDate: string | null | undefined, from: Date = new Date()): number | null {
  if (!birthDate) return null;
  const parsed = new Date(`${birthDate}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;

  const today = startOfLocalDay(from);
  let next = new Date(today.getFullYear(), parsed.getMonth(), parsed.getDate());
  if (next < today) {
    next = new Date(today.getFullYear() + 1, parsed.getMonth(), parsed.getDate());
  }
  return Math.floor((next.getTime() - today.getTime()) / 86_400_000);
}

export function isBirthdaySoon(
  birthDate: string | null | undefined,
  windowDays: number = BIRTHDAY_WINDOW_DAYS,
  from: Date = new Date(),
): boolean {
  const days = daysUntilBirthday(birthDate, from);
  return days !== null && days >= 0 && days <= windowDays;
}

export function formatVisitAgo(date: string | Date | null | undefined, now: Date = new Date()): string {
  if (!date) return 'Nunca';
  const parsed = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(parsed.getTime())) return 'Nunca';
  const today = startOfLocalDay(now);
  const target = startOfLocalDay(parsed);
  const days = Math.floor((today.getTime() - target.getTime()) / 86_400_000);
  if (days === 0) return 'Hoje';
  if (days === 1) return 'Ontem';
  if (days < 60) return `há ${days} dias`;
  return parsed.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function aggregateAppointmentStats(
  rows: AppointmentStatRow[],
): Map<string, { visitCount: number; lastVisitAt: string | null; firstVisitAt: string | null; ltv: number }> {
  const map = new Map<string, { visitCount: number; lastVisitAt: string | null; firstVisitAt: string | null; ltv: number }>();

  for (const row of rows) {
    if (!row.client_id) continue;
    const current = map.get(row.client_id) || {
      visitCount: 0,
      lastVisitAt: null as string | null,
      firstVisitAt: null as string | null,
      ltv: 0,
    };
    current.visitCount += 1;
    current.ltv += Number(row.price) || 0;
    const time = row.appointment_time;
    if (!current.lastVisitAt || time > current.lastVisitAt) current.lastVisitAt = time;
    if (!current.firstVisitAt || time < current.firstVisitAt) current.firstVisitAt = time;
    map.set(row.client_id, current);
  }

  return map;
}

/** Top N client IDs by lifetime LTV (gasto), só com visitas e LTV > 0. */
export function getVipClientIds(
  statsByClient: Map<string, { visitCount: number; ltv: number }>,
  topN: number = VIP_TOP_N,
): Set<string> {
  const ranked = [...statsByClient.entries()]
    .filter(([, s]) => s.visitCount >= 1 && s.ltv > 0)
    .sort((a, b) => b[1].ltv - a[1].ltv || b[1].visitCount - a[1].visitCount)
    .slice(0, topN)
    .map(([id]) => id);
  return new Set(ranked);
}

export function isInactiveClient(visitCount: number, lastVisitAt: string | null, now: Date = new Date()): boolean {
  if (visitCount < 1 || !lastVisitAt) return false;
  const days = daysSince(lastVisitAt);
  if (days === null) return false;
  // daysSince uses local today; align "now" by computing from lastVisit relative to `now`
  const today = startOfLocalDay(now);
  const last = startOfLocalDay(new Date(lastVisitAt));
  const diff = Math.floor((today.getTime() - last.getTime()) / 86_400_000);
  return diff >= INACTIVE_DAYS;
}

export function isNewClient(visitCount: number, firstVisitAt: string | null, now: Date = new Date()): boolean {
  if (visitCount === 0) return true;
  if (!firstVisitAt) return true;
  const today = startOfLocalDay(now);
  const first = startOfLocalDay(new Date(firstVisitAt));
  const diff = Math.floor((today.getTime() - first.getTime()) / 86_400_000);
  return diff >= 0 && diff <= NEW_CLIENT_DAYS;
}

export function enrichClients(
  clients: ClientRecord[],
  appointmentRows: AppointmentStatRow[],
  now: Date = new Date(),
): EnrichedClient[] {
  const stats = aggregateAppointmentStats(appointmentRows);
  const vipIds = getVipClientIds(stats);

  const enriched = clients.map((client) => {
    const s = stats.get(client.id) || { visitCount: 0, lastVisitAt: null, firstVisitAt: null, ltv: 0 };
    return {
      ...client,
      visitCount: s.visitCount,
      lastVisitAt: s.lastVisitAt,
      firstVisitAt: s.firstVisitAt,
      ltv: s.ltv,
      isVip: vipIds.has(client.id),
      isInactive: isInactiveClient(s.visitCount, s.lastVisitAt, now),
      isNew: isNewClient(s.visitCount, s.firstVisitAt, now),
      birthdaySoon: isBirthdaySoon(client.birth_date, BIRTHDAY_WINDOW_DAYS, now),
    };
  });

  return enriched.sort((a, b) => {
    if (a.lastVisitAt && b.lastVisitAt) return b.lastVisitAt.localeCompare(a.lastVisitAt);
    if (a.lastVisitAt) return -1;
    if (b.lastVisitAt) return 1;
    return a.name.localeCompare(b.name, 'pt-BR');
  });
}

export function filterEnrichedClients(
  clients: EnrichedClient[],
  filter: ClientFilter,
  searchTerm: string,
): EnrichedClient[] {
  const q = searchTerm.trim().toLowerCase();
  const qDigits = normalizePhone(q);
  return clients.filter((client) => {
    const matchesSearch =
      !q ||
      client.name.toLowerCase().includes(q) ||
      (client.phone || '').includes(q) ||
      (qDigits.length > 0 && normalizePhone(client.phone).includes(qDigits));

    if (!matchesSearch) return false;
    if (filter === 'VIP') return client.isVip;
    if (filter === 'Inativo') return client.isInactive;
    if (filter === 'Novos') return client.isNew;
    return true;
  });
}

export async function createClient(input: CreateClientInput): Promise<void> {
  const parsed = createClientInputSchema.parse(input);

  if (!parsed.phone && !parsed.email) {
    throw new Error('Informe pelo menos um contato.');
  }

  if (parsed.phone) {
    const existingClient = await findClientByPhone(parsed.companyId, parsed.phone);
    if (existingClient) {
      throw new Error('Já existe um cliente com este telefone.');
    }
  }

  const isLegacy = (parsed.origin ?? 'Novo') === 'Antigo';
  const birthDate = parsed.birthDate?.trim() ? parsed.birthDate.trim() : null;

  const { error } = await supabase
    .from('clients')
    .insert({
      user_id: parsed.companyId,
      name: parsed.name,
      email: parsed.email || '',
      phone: parsed.phone || '',
      photo_url: parsed.photoUrl || null,
      birth_date: birthDate,
      loyalty_tier: isLegacy ? 'Silver' : 'Bronze',
      total_visits: isLegacy ? 1 : 0,
      rating: 0,
      notes: isLegacy ? 'Cliente migrado de outro sistema.' : '',
      source: parsed.source || (isLegacy ? 'manual_legacy' : 'manual'),
    });

  if (error) throw error;
}

export async function syncPublicClientsToCrm(companyId: string): Promise<number> {
  const { data: publicClients, error: publicError } = await supabase
    .from('public_clients')
    .select('*')
    .eq('business_id', companyId);

  if (publicError) throw publicError;
  if (!publicClients?.length) return 0;

  const { data: existingClients, error: clientError } = await supabase
    .from('clients')
    .select('phone')
    .eq('user_id', companyId)
    .not('phone', 'is', null);

  if (clientError) throw clientError;

  const seenPhones = new Set<string>();
  const newClients = (publicClients as PublicClientRecord[])
    .filter(publicClient => {
      if (!publicClient.phone) return false;
      const normalizedPhone = normalizePhone(publicClient.phone);
      if (!normalizedPhone || seenPhones.has(normalizedPhone)) return false;
      if (findClientByPhoneInList(existingClients || [], publicClient.phone)) return false;
      seenPhones.add(normalizedPhone);
      return true;
    })
    .map(publicClient => ({
      user_id: companyId,
      name: publicClient.name,
      phone: publicClient.phone,
      email: publicClient.email || '',
      photo_url: publicClient.photo_url || null,
      loyalty_tier: 'Bronze',
      total_visits: 0,
      rating: 0,
      notes: 'Registrado via link publico',
      source: 'agendamento_online',
    }));

  if (newClients.length === 0) return 0;

  const { error } = await supabase.from('clients').insert(newClients);
  if (error) throw error;
  return newClients.length;
}

export async function fetchClientAppointmentStats(
  companyId: string,
  clientIds: string[],
): Promise<AppointmentStatRow[]> {
  if (clientIds.length === 0) return [];

  const { data, error } = await supabase
    .from('appointments')
    .select('client_id, appointment_time, price')
    .in('client_id', clientIds)
    .eq('status', 'Completed')
    .eq('user_id', companyId);

  if (error) throw error;
  return (data || []) as AppointmentStatRow[];
}
