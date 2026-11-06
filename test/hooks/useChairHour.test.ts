import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useChairHour } from '@/hooks/useChairHour';
import { supabase } from '@/lib/supabase';

const state = vi.hoisted(() => ({ role: 'owner', user: { id: 'user-1' }, companyId: 'company-1', teamMemberId: 'member-1', options: null as null | Record<string, unknown> }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => state }));
vi.mock('@/lib/supabase', () => ({ supabase: { rpc: vi.fn() } }));
vi.mock('@/lib/queryClient', () => ({ queryClient: {} }));
vi.mock('@tanstack/react-query', () => ({ useQuery: (options: Record<string, unknown>) => { state.options = options; return { isPending: true, isError: false, data: undefined, refetch: vi.fn() }; } }));

beforeEach(() => { state.role = 'owner'; state.teamMemberId = 'member-1'; state.options = null; vi.mocked(supabase.rpc).mockReset(); });

describe('consulta de resultados por hora', () => {
  it('não apresenta carregamento infinito quando o colaborador não tem vínculo', () => {
    state.role = 'staff'; state.teamMemberId = '';
    const { result } = renderHook(() => useChairHour('2026-11-01'));
    expect(state.options?.enabled).toBe(false);
    expect(result.current.status).toBe('ready');
  });
  it('consulta o intervalo completo e o profissional escolhido pelo dono', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: { role: 'owner', professionals: [] }, error: null } as never);
    renderHook(() => useChairHour('2026-10-03', 'pro-1', '2026-10-11'));
    await (state.options?.queryFn as () => Promise<unknown>)();
    expect(supabase.rpc).toHaveBeenCalledWith('get_chair_hour_v1', { p_month: '2026-10-03', p_professional_id: 'pro-1', p_end_date: '2026-10-11' });
  });
  it('não envia ao servidor o profissional fornecido para outro colaborador', async () => {
    state.role = 'staff';
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: { role: 'staff', professionals: [] }, error: null } as never);
    renderHook(() => useChairHour('2026-10-03', 'outro-profissional', '2026-10-11'));
    await (state.options?.queryFn as () => Promise<unknown>)();
    expect(supabase.rpc).toHaveBeenCalledWith('get_chair_hour_v1', { p_month: '2026-10-03', p_professional_id: null, p_end_date: '2026-10-11' });
  });
});
