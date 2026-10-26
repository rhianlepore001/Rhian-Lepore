import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

const wrapper = ({ children }: { children: React.ReactNode }) => <AuthProvider>{children}</AuthProvider>;
const fixture = (id = 'user-fictional') => ({ user: { id, email: `${id}@example.test` } }) as Session;
let emit: (event: AuthChangeEvent, session: Session | null) => void;
let profileReads: string[];

beforeEach(() => {
  profileReads = [];
  vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: fixture() }, error: null });
  vi.mocked(supabase.auth.onAuthStateChange).mockImplementation(callback => {
    emit = callback;
    return { data: { subscription: { unsubscribe: vi.fn() } } } as any;
  });
  vi.mocked(supabase.from).mockImplementation((table: string) => {
    let userId = '';
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn(function (this: unknown, _field: string, value: string) { userId = value; return this; }),
      single: vi.fn(async () => {
        if (table === 'profiles') profileReads.push(userId);
        return { data: table === 'profiles' ? { id: userId, company_id: userId, role: 'owner', user_type: 'barber', full_name: userId } : { is_completed: true }, error: null };
      }),
    } as any;
  });
});

describe('Auth refresh preserves forms', () => {
  it.each(['TOKEN_REFRESHED', 'SIGNED_IN'] as const)('%s for the same user keeps user identity and never loads the profile again', async event => {
    const loading: boolean[] = [];
    const { result } = renderHook(() => { const auth = useAuth(); loading.push(auth.loading); return auth; }, { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    const previousUser = result.current.user;
    loading.length = 0;
    await act(async () => { emit(event, fixture()); await new Promise(resolve => setTimeout(resolve, 10)); });
    expect(result.current.user).toBe(previousUser);
    expect(loading).not.toContain(true);
    expect(profileReads).toEqual(['user-fictional']);
  });

  it('loads a different signed-in user and switches tenant', async () => {
    const { result } = renderHook(useAuth, { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => emit('SIGNED_IN', fixture('other-fictional')));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(profileReads).toEqual(['user-fictional', 'other-fictional']);
    expect(result.current.companyId).toBe('other-fictional');
    expect(result.current.user?.id).toBe('other-fictional');
  });

  it('updates the profile in the background for USER_UPDATED', async () => {
    const loading: boolean[] = [];
    const { result } = renderHook(() => { const auth = useAuth(); loading.push(auth.loading); return auth; }, { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    loading.length = 0;
    act(() => emit('USER_UPDATED', fixture()));
    await waitFor(() => expect(profileReads).toHaveLength(2));
    expect(loading).not.toContain(true);
  });

  it('removes all drafts when sign-out comes from Supabase', async () => {
    const { result } = renderHook(useAuth, { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    sessionStorage.setItem('agendix:draft:v1:fictional:user:form', '{}');
    act(() => emit('SIGNED_OUT', null));
    expect(Object.keys(sessionStorage).filter(key => key.startsWith('agendix:draft:'))).toEqual([]);
    expect(result.current.user).toBeNull();
  });
});
