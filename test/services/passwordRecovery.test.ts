import { describe, it, expect, vi } from 'vitest';
import {
  mapRecoveryRequestError,
  mapUpdatePasswordError,
  requestPasswordReset,
  resolveRecoverySession,
} from '@/services/passwordRecovery';

function makeAuth(overrides: Record<string, unknown> = {}) {
  return {
    resetPasswordForEmail: vi.fn().mockResolvedValue({ data: {}, error: null }),
    setSession: vi.fn().mockResolvedValue({ data: {}, error: null }),
    exchangeCodeForSession: vi.fn().mockResolvedValue({ data: {}, error: null }),
    verifyOtp: vi.fn().mockResolvedValue({ data: {}, error: null }),
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    updateUser: vi.fn(),
    ...overrides,
  } as never;
}

describe('requestPasswordReset', () => {
  it('usa o domínio atual com o marcador de recuperação', async () => {
    const auth = makeAuth();
    await requestPasswordReset(auth, '  dono@exemplo.com ', 'https://www.agendixstudio.com');
    expect((auth as { resetPasswordForEmail: ReturnType<typeof vi.fn> }).resetPasswordForEmail).toHaveBeenCalledWith('dono@exemplo.com', {
      redirectTo: 'https://www.agendixstudio.com/?fluxo=nova-senha',
    });
  });
});

describe('resolveRecoverySession', () => {
  it('implícito: grava a sessão com os tokens do link', async () => {
    const auth = makeAuth();
    await expect(resolveRecoverySession(auth, { kind: 'implicit', accessToken: 'A', refreshToken: 'R' })).resolves.toEqual({ status: 'ready' });
    expect((auth as { setSession: ReturnType<typeof vi.fn> }).setSession).toHaveBeenCalledWith({ access_token: 'A', refresh_token: 'R' });
  });

  it('implícito com token recusado → expirado', async () => {
    const auth = makeAuth({ setSession: vi.fn().mockResolvedValue({ data: {}, error: { message: 'Invalid Refresh Token' } }) });
    await expect(resolveRecoverySession(auth, { kind: 'implicit', accessToken: 'A', refreshToken: 'R' })).resolves.toEqual({ status: 'invalid', reason: 'expired' });
  });

  it('PKCE: troca o code; sem code_verifier → outro navegador', async () => {
    const ok = makeAuth();
    await expect(resolveRecoverySession(ok, { kind: 'pkce', code: 'c' })).resolves.toEqual({ status: 'ready' });
    const bad = makeAuth({ exchangeCodeForSession: vi.fn().mockResolvedValue({ data: {}, error: { message: 'invalid request: both auth code and code verifier should be non-empty' } }) });
    await expect(resolveRecoverySession(bad, { kind: 'pkce', code: 'c' })).resolves.toEqual({ status: 'invalid', reason: 'other_browser' });
  });

  it('token_hash: verifyOtp do tipo recovery', async () => {
    const auth = makeAuth();
    await resolveRecoverySession(auth, { kind: 'token_hash', tokenHash: 'th' });
    expect((auth as { verifyOtp: ReturnType<typeof vi.fn> }).verifyOtp).toHaveBeenCalledWith({ token_hash: 'th', type: 'recovery' });
  });

  it('erro do link vira estado inválido sem chamar a API', async () => {
    const auth = makeAuth();
    await expect(resolveRecoverySession(auth, { kind: 'error', reason: 'expired', code: 'otp_expired' })).resolves.toEqual({ status: 'invalid', reason: 'expired' });
    expect((auth as { getSession: ReturnType<typeof vi.fn> }).getSession).not.toHaveBeenCalled();
  });

  it('sem link: aceita sessão existente, senão "missing"', async () => {
    await expect(resolveRecoverySession(makeAuth(), { kind: 'none' })).resolves.toEqual({ status: 'invalid', reason: 'missing' });
    const withSession = makeAuth({ getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'x' } }, error: null }) });
    await expect(resolveRecoverySession(withSession, { kind: 'none' })).resolves.toEqual({ status: 'ready' });
  });
});

describe('mensagens de erro', () => {
  it('limite de envio', () => {
    expect(mapRecoveryRequestError({ status: 429, message: 'email rate limit exceeded' })).toMatch(/Aguarde um minuto/);
    expect(mapRecoveryRequestError({ message: 'For security purposes, you can only request this after 42 seconds.' })).toMatch(/Aguarde/);
  });
  it('genérico e rede', () => {
    expect(mapRecoveryRequestError(new Error('Failed to fetch'))).toMatch(/conexão/);
    expect(mapRecoveryRequestError({})).toMatch(/Não foi possível enviar/);
  });
  it('senha igual à anterior', () => {
    expect(mapUpdatePasswordError({ code: 'same_password', message: 'New password should be different from the old password.' })).toMatch(/diferente/);
  });
});
