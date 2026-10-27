import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDependent, listDependents, updateDependent } from '@/services/clientDependents';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => ({ supabase: { from: vi.fn() } }));
const query = {
  select: vi.fn(), eq: vi.fn(), order: vi.fn(), insert: vi.fn(), update: vi.fn(), single: vi.fn(),
};
beforeEach(() => {
  vi.clearAllMocks();
  Object.values(query).forEach(fn => fn.mockReturnValue(query));
  query.order.mockResolvedValue({ data: [], error: null });
  query.single.mockResolvedValue({ data: { id: 'dep-1', name: 'Pessoa Fictícia' }, error: null });
  vi.mocked(supabase.from).mockReturnValue(query as never);
});
describe('client dependents', () => {
  it('filters both tenant and holder and lists only active dependents', async () => {
    await listDependents('tenant-a', 'holder-a');
    expect(query.eq.mock.calls).toEqual([['user_id', 'tenant-a'], ['client_id', 'holder-a'], ['is_active', true]]);
  });
  it('normalizes name and never stores another phone', async () => {
    await createDependent('tenant-a', 'holder-a', { name: '  Pessoa Fictícia  ', nickname: '', notes: '' });
    expect(query.insert).toHaveBeenCalledWith({ user_id: 'tenant-a', client_id: 'holder-a', name: 'Pessoa Fictícia', nickname: null, notes: null, source: 'manual' });
  });
  it('rejects empty or oversized names before querying', async () => {
    await expect(createDependent('tenant-a', 'holder-a', { name: ' ' })).rejects.toThrow();
    await expect(createDependent('tenant-a', 'holder-a', { name: 'x'.repeat(81) })).rejects.toThrow();
    expect(supabase.from).not.toHaveBeenCalled();
  });
  it('scopes updates and reports a filtered-out row as a failure', async () => {
    query.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
    await expect(updateDependent('tenant-a', 'holder-a', 'dep-1', { name: 'Pessoa Fictícia', is_active: false })).rejects.toBeTruthy();
    expect(query.eq.mock.calls).toEqual([['user_id', 'tenant-a'], ['client_id', 'holder-a'], ['id', 'dep-1']]);
  });
});
