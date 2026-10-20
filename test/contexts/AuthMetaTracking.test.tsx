import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { metaTracker } from '@/lib/metaTracking';

vi.mock('@/lib/metaTracking', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/metaTracking')>();
  return {
    ...actual,
    metaTracker: { captureRegistration: vi.fn(), completeRegistration: vi.fn() },
  };
});
const wrapper = ({ children }: { children: React.ReactNode }) => <AuthProvider>{children}</AuthProvider>;
const input = {
  email: 'person@example.com', password: 'Password123!', fullName: 'Person',
  businessName: 'Business', userType: 'barber' as const, region: 'PT' as const, phone: '912 345 678',
};
const context = { id: 'event-id', source: 'https://app.example/#/register' };

describe('signup Meta integration', () => {
  beforeEach(() => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session: null }, error: null });
    vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null } as never);
    vi.mocked(metaTracker.captureRegistration).mockReturnValue(context);
  });

  const mount = async () => {
    const hook = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(hook.result.current.loading).toBe(false));
    return hook;
  };

  it('waits for backend success; records a new account even when email confirmation is required', async () => {
    let resolve: (value: unknown) => void = () => undefined;
    vi.mocked(supabase.auth.signUp).mockImplementation(() => new Promise(done => { resolve = done; }) as never);
    const hook = await mount();
    let request: Promise<unknown>;
    act(() => { request = hook.result.current.register(input); });
    expect(metaTracker.completeRegistration).not.toHaveBeenCalled();
    await act(async () => {
      resolve({ data: { user: { id: 'new-user', identities: [{ id: 'identity' }] }, session: null }, error: null });
      await request;
    });
    expect(metaTracker.completeRegistration).toHaveBeenCalledTimes(1);
    expect(metaTracker.completeRegistration).toHaveBeenCalledWith(context, { email: input.email, phone: '351912345678' });
  });

  it.each([
    { data: { user: null, session: null }, error: { message: 'backend failure' } },
    { data: { user: { id: 'masked-existing', identities: [] }, session: null }, error: null },
    { data: { user: null, session: null }, error: null },
  ])('does not complete when the backend does not create an account: %j', async result => {
    vi.mocked(supabase.auth.signUp).mockResolvedValue(result as never);
    const hook = await mount();
    await act(async () => { await hook.result.current.register(input); });
    expect(metaTracker.completeRegistration).not.toHaveBeenCalled();
  });

  it('does not count staff invitations as acquisition', async () => {
    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: { user: { id: 'staff', identities: [{ id: 'identity' }] }, session: { user: { id: 'staff' } } }, error: null,
    } as never);
    const hook = await mount();
    await act(async () => {
      await hook.result.current.register({ ...input, companyId: 'owner', teamMemberId: 'member' });
    });
    expect(metaTracker.captureRegistration).not.toHaveBeenCalled();
    expect(metaTracker.completeRegistration).not.toHaveBeenCalled();
  });
});
