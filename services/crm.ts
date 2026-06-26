import { supabase } from '@/lib/supabase';
import {
  createClientInputSchema,
  type ClientRecord,
  type CreateClientInput,
  type LoyaltyTier,
  type PublicClientRecord,
} from '@/types/crm';

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

  const isLegacy = parsed.origin === 'Antigo';

  const { error } = await supabase
    .from('clients')
    .insert({
      user_id: parsed.companyId,
      name: parsed.name,
      email: parsed.email || '',
      phone: parsed.phone || '',
      photo_url: parsed.photoUrl || null,
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
