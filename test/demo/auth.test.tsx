import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';

beforeEach(() => { window.location.hash = '#/demo/beauty'; });
it('ignora o token real e não inicia autenticação na simulação', async () => {
  localStorage.setItem('sb-offline-auth-token', 'sessao-preservada');
  vi.mocked(createClient).mockClear();
  const { result, unmount } = renderHook(() => useAuth(), { wrapper: ({ children }) => <AuthProvider demoRoute="/demo/beauty">{children}</AuthProvider> });
  expect(result.current.businessName).toBe('Studio Aurora');
  expect(result.current.role).toBe('owner');
  expect(result.current.tutorialCompleted).toBe(true);
  expect(createClient).not.toHaveBeenCalled();
  await act(async () => { await expect(result.current.login('ignored', 'ignored')).rejects.toThrow(/simulação/); });
  unmount();
  expect(localStorage.getItem('sb-offline-auth-token')).toBe('sessao-preservada');
  localStorage.removeItem('sb-offline-auth-token');
});

it('mantém a sessão pública fictícia em memória e preserva a sessão pública legada', async () => {
  const { DemoPublicClientProvider } = await import('../../contexts/DemoPublicClientContext');
  const { usePublicClient } = await import('../../contexts/PublicClientContext');
  localStorage.setItem('rhian_public_client', 'legado-preservado');
  const { result, unmount } = renderHook(() => usePublicClient(), { wrapper: DemoPublicClientProvider });
  act(() => result.current.establishSession({ id: 'local-client', business_id: 'local-business', name: 'Cliente fictício', phone: '' }));
  expect(result.current.client?.name).toBe('Cliente fictício');
  unmount();
  const next = renderHook(() => usePublicClient(), { wrapper: DemoPublicClientProvider });
  expect(next.result.current.client).toBeNull();
  expect(localStorage.getItem('rhian_public_client')).toBe('legado-preservado');
  localStorage.removeItem('rhian_public_client');
});
