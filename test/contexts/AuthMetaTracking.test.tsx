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
    metaTracker: { captureRegistration: vi.fn(), lead: vi.fn(), completeRegistration: vi.fn() },
  };
});
const wrapper = ({ children }: { children: React.ReactNode }) => <AuthProvider>{children}</AuthProvider>;
const input = {
  email: 'person@example.com', password: 'Password123!', fullName: 'Person',
  businessName: 'Business', userType: 'barber' as const, region: 'PT' as const, phone: '912 345 678',
};
const context = { id: 'event-id', leadId: 'lead-id', source: 'https://app.example/#/register' };
const newUser = { id: 'new-user', identities: [{ id: 'identity' }] };
const deferred = () => {
  let resolve: (value: unknown) => void = () => undefined;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};

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

  it('waits for auth, profile/company and onboarding before completing a new registration once', async () => {
    const auth = deferred();
    const profile = deferred();
    const onboarding = deferred();
    vi.mocked(supabase.auth.signUp).mockImplementation(() => auth.promise as never);
    vi.mocked(supabase.rpc).mockImplementation((name: string) => {
      if (name === 'ensure_owner_profile') return profile.promise as never;
      if (name === 'upsert_onboarding_progress') return onboarding.promise as never;
      return Promise.resolve({ data: null, error: null }) as never;
    });
    const hook = await mount();
    let request: ReturnType<typeof hook.result.current.register>;
    act(() => { request = hook.result.current.register(input); });
    expect(metaTracker.lead).not.toHaveBeenCalled();
    expect(metaTracker.completeRegistration).not.toHaveBeenCalled();
    await act(async () => {
      auth.resolve({ data: { user: newUser, session: { user: newUser } }, error: null });
    });
    expect(supabase.rpc).toHaveBeenCalledWith('ensure_owner_profile');
    // Lead dispara assim que a conta existe no servidor; CompleteRegistration só no fim.
    expect(metaTracker.lead).toHaveBeenCalledTimes(1);
    expect(metaTracker.lead).toHaveBeenCalledWith(context, { email: input.email, phone: '351912345678', external_id: 'new-user', first_name: 'Person', country: 'pt' });
    expect(metaTracker.completeRegistration).not.toHaveBeenCalled();
    await act(async () => { profile.resolve({ data: { status: 'created' }, error: null }); });
    expect(supabase.rpc).toHaveBeenCalledWith('upsert_onboarding_progress', expect.any(Object));
    expect(metaTracker.completeRegistration).not.toHaveBeenCalled();
    await act(async () => {
      onboarding.resolve({ data: null, error: null });
      expect(await request).toEqual({ error: null });
    });
    expect(metaTracker.completeRegistration).toHaveBeenCalledTimes(1);
    expect(metaTracker.completeRegistration).toHaveBeenCalledWith(context, { email: input.email, phone: '351912345678', external_id: 'new-user', first_name: 'Person', country: 'pt' });
  });

  it.each([
    ['ensure_owner_profile', { data: null, error: { message: 'profile/company failure' } }],
    ['ensure_owner_profile', { data: { status: 'skipped_staff' }, error: null }],
    ['upsert_onboarding_progress', { data: null, error: { message: 'onboarding failure' } }],
  ])('does not complete if %s fails after auth success', async (failedStep, failure) => {
    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: { user: newUser, session: { user: newUser } }, error: null,
    } as never);
    vi.mocked(supabase.rpc).mockImplementation((name: string) =>
      Promise.resolve(name === failedStep ? failure : { data: { status: 'created' }, error: null }) as never);
    const hook = await mount();
    await act(async () => {
      expect((await hook.result.current.register(input)).error).toBeTruthy();
    });
    expect(metaTracker.completeRegistration).not.toHaveBeenCalled();
    // A conta foi criada: o Lead já foi contado, mesmo com falha posterior.
    expect(metaTracker.lead).toHaveBeenCalledTimes(1);
  });

  it('does not complete if a later backend step throws', async () => {
    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: { user: newUser, session: { user: newUser } }, error: null,
    } as never);
    vi.mocked(supabase.rpc).mockRejectedValue(new Error('backend unavailable'));
    const hook = await mount();
    await act(async () => {
      expect((await hook.result.current.register(input)).error).toBeTruthy();
    });
    expect(metaTracker.completeRegistration).not.toHaveBeenCalled();
  });

  it('completes with email confirmation only after all available backend steps succeed', async () => {
    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: { user: newUser, session: null }, error: null,
    } as never);
    const hook = await mount();
    await act(async () => { await hook.result.current.register(input); });
    expect(supabase.rpc).toHaveBeenCalledWith('upsert_onboarding_progress', expect.any(Object));
    expect(metaTracker.completeRegistration).toHaveBeenCalledTimes(1);
  });

  it.each([
    { data: { user: null, session: null }, error: { message: 'backend failure' } },
    { data: { user: { id: 'masked-existing', identities: [] }, session: null }, error: null },
    { data: { user: { id: 'unverified-newness' }, session: null }, error: null },
    { data: { user: { id: 'null-identities', identities: null }, session: null }, error: null },
    { data: { user: null, session: null }, error: null },
  ])('does not complete without a confirmed new identity: %j', async result => {
    vi.mocked(supabase.auth.signUp).mockResolvedValue(result as never);
    const hook = await mount();
    await act(async () => { await hook.result.current.register(input); });
    expect(metaTracker.lead).not.toHaveBeenCalled();
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
    expect(metaTracker.lead).not.toHaveBeenCalled();
    expect(metaTracker.completeRegistration).not.toHaveBeenCalled();
  });
});
