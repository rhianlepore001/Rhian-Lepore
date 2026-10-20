import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '@/lib/supabase';
import { joinQueue, resolveClientQueueEntry, storeQueueTicket } from '@/services/queue';
import { createPublicMembershipRequest, fetchPublicClientMembership, cancelPublicClientMembership } from '@/services/memberships';
vi.mock('@/lib/supabase', () => ({ supabase: { rpc: vi.fn(), from: vi.fn() } }));
const token = 'a'.repeat(64);
const entry = { id: 'queue-a', business_id: 'business-a', client_name: 'Cliente', client_phone: '11999998888', service_id: 'service-a', status: 'waiting', joined_at: new Date().toISOString() };
describe('private queue and membership capabilities', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear(); });
  it('does not recover a queue entry from a phone or a legacy ticket', async () => {
    localStorage.setItem('queue_ticket_business-a', JSON.stringify({ businessId: 'business-a', entryId: entry.id, phone: entry.client_phone }));
    expect(await resolveClientQueueEntry({ businessId: 'business-a', phone: entry.client_phone })).toBeNull();
    expect(supabase.rpc).not.toHaveBeenCalled();
  });
  it('stores the token returned atomically by joining and reloads the ticket with it', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: { entry, management_token: token }, error: null } as any);
    await joinQueue({ businessId: 'business-a', slug: 'espaco', clientName: 'Cliente', clientPhone: entry.client_phone, serviceId: 'service-a' });
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
    expect(supabase.rpc).toHaveBeenCalledWith('join_queue_entry_private', expect.any(Object));
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: [entry], error: null } as any);
    expect(await resolveClientQueueEntry({ businessId: 'business-a', phone: null })).toMatchObject({ id: entry.id });
    expect(supabase.rpc).toHaveBeenLastCalledWith('get_queue_entry_with_token', { p_entry_id: entry.id, p_token: token });
  });
  it('fails closed when the private queue endpoint is missing', async () => {
    storeQueueTicket({ businessId: 'business-a', entryId: entry.id, slug: 'espaco', token } as any);
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: { code: 'PGRST202' } } as any);
    await expect(resolveClientQueueEntry({ businessId: 'business-a', phone: entry.client_phone })).rejects.toThrow();
    expect(supabase.from).not.toHaveBeenCalled();
  });
  it('creates and stores a private membership token, then reads and cancels only by that token', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: { membership_id: 'membership-a', management_token: token }, error: null } as any);
    expect(await createPublicMembershipRequest('business-a', { clientName: 'Cliente', clientPhone: entry.client_phone, planId: 'plan-a', paymentMethod: 'in_person' })).toBe('membership-a');
    vi.mocked(supabase.rpc).mockResolvedValue({ data: [], error: null } as any);
    await fetchPublicClientMembership('business-a', token);
    expect(supabase.rpc).toHaveBeenLastCalledWith('get_client_membership_with_token', { p_business_id: 'business-a', p_token: token });
    await cancelPublicClientMembership('business-a', token);
    expect(supabase.rpc).toHaveBeenLastCalledWith('cancel_client_membership_with_token', { p_business_id: 'business-a', p_token: token });
  });
});
