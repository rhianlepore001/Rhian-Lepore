import type { Session, User } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '../../lib/supabase';
import { changeProfilePassword } from '../../services/profilePassword';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: { getSession: vi.fn(), getUser: vi.fn(), signInWithPassword: vi.fn(), signOut: vi.fn() },
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

const staff: User = {
  id: 'staff-id',
  aud: 'authenticated',
  created_at: '2026-01-01T00:00:00Z',
  email: 'Staff@Example.test',
  app_metadata: { provider: 'email' },
  user_metadata: { company_id: 'owner-id' },
};
const session = { user: staff, access_token: 'staff-session' } as Session;
const passwords = {
  currentPassword: 'AtualFicticia!1',
  newPassword: 'NovaFicticia!2',
  confirmation: 'NovaFicticia!2',
};
const request = vi.fn<typeof fetch>();
const challengeAndVerify = vi.fn();
const getAuthenticatorAssuranceLevel = vi.fn();
const totp = { id: 'totp-id', factor_type: 'totp', status: 'verified', created_at: '', updated_at: '' } as const;
const attempt = vi.fn();
const rpcBuilder = { abortSignal: attempt } as unknown as ReturnType<typeof supabase.rpc>;
function allowAttempt(allowed: boolean) {
  vi.mocked(supabase.rpc).mockReturnValue(rpcBuilder);
  attempt.mockReset().mockResolvedValue({ data: allowed, error: null });
}
const response = (status: number, body?: object) => new Response(body && JSON.stringify(body), { status });
const verified = (id = staff.id) => response(200, { user: { id }, access_token: 'verification-session' });

beforeEach(() => {
  vi.stubGlobal('fetch', request);
  request.mockReset();
  const auth = vi.mocked(supabase.auth);
  auth.mfa = { challengeAndVerify, getAuthenticatorAssuranceLevel } as unknown as typeof auth.mfa;
  challengeAndVerify.mockReset();
  getAuthenticatorAssuranceLevel.mockReset().mockResolvedValue({ data: { currentLevel: 'aal1' }, error: null });
  vi.mocked(supabase.auth.getSession).mockResolvedValue({ data: { session }, error: null });
  vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: staff }, error: null });
  allowAttempt(true);
});
afterEach(() => vi.unstubAllGlobals());

describe('troca de senha pelo perfil', () => {
  it.each([
    [{ currentPassword: '' }, 'currentPassword'],
    [{ newPassword: 'fraca', confirmation: 'fraca' }, 'newPassword'],
    [{ confirmation: 'Diferente!3' }, 'confirmation'],
    [{ newPassword: passwords.currentPassword, confirmation: passwords.currentPassword }, 'newPassword'],
  ] as const)('valida os campos antes de consumir uma tentativa (%j)', async (overrides, field) => {
    expect(await changeProfilePassword(staff.id, { ...passwords, ...overrides })).toMatchObject({ field });
    expect(supabase.rpc).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
  });

  it('informa falha na confirmação da senha atual sem enviar a senha nova ou reproduzir o erro do servidor', async () => {
    request.mockResolvedValueOnce(response(400, { code: 'invalid_credentials', msg: passwords.currentPassword }));
    const result = await changeProfilePassword(staff.id, passwords);
    expect(result).toEqual({ field: 'currentPassword', message: 'Não foi possível confirmar a senha atual. Confira e tente de novo.' });
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('bloqueia ao atingir o limite por conta', async () => {
    allowAttempt(false);
    expect(await changeProfilePassword(staff.id, passwords)).toMatchObject({ message: expect.stringMatching(/Aguarde.*minuto/i) });
    expect(supabase.rpc).toHaveBeenCalledWith('check_login_rate_limit', { p_email: 'staff@example.test' });
    expect(request).not.toHaveBeenCalled();
  });

  it('para se o limite de tentativas não estiver disponível', async () => {
    attempt.mockRejectedValueOnce(new Error('indisponível'));
    expect(await changeProfilePassword(staff.id, passwords)).toMatchObject({ message: expect.stringMatching(/tente/i) });
    expect(request).not.toHaveBeenCalled();
  });

  it('respeita também o limite de tentativas do Supabase', async () => {
    request.mockResolvedValueOnce(response(429));
    expect(await changeProfilePassword(staff.id, passwords)).toMatchObject({ message: expect.stringMatching(/Aguarde.*minuto/i) });
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('troca somente a senha do colaborador autenticado e mantém a sessão usada no perfil', async () => {
    request.mockResolvedValueOnce(verified()).mockResolvedValueOnce(response(204));
    const form = { ...passwords, email: 'owner@example.test', userId: 'owner-id' };
    expect(await changeProfilePassword(staff.id, form)).toBeNull();
    expect(supabase.auth.getUser).toHaveBeenCalledWith('staff-session');
    expect(request.mock.calls[0][0]).toMatch(/\/token\?grant_type=password$/);
    expect(JSON.parse(String(request.mock.calls[0][1]?.body))).toEqual({ email: 'Staff@Example.test', password: passwords.currentPassword });
    const [url, update] = request.mock.calls[1];
    expect(url).toMatch(/\/user$/);
    expect(new Headers(update?.headers).get('Authorization')).toBe('Bearer staff-session');
    expect(JSON.parse(String(update?.body))).toEqual({ current_password: passwords.currentPassword, password: passwords.newPassword });
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
    expect(supabase.auth.signOut).not.toHaveBeenCalled();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('recusa uma operação de outra conta mesmo antes da verificação da senha', async () => {
    expect(await changeProfilePassword('owner-id', passwords)).toMatchObject({ message: expect.stringMatching(/sessão/i) });
    expect(request).not.toHaveBeenCalled();
  });

  it('descarta a verificação se ela retornar outra conta e revoga só a sessão temporária', async () => {
    request.mockResolvedValueOnce(verified('owner-id')).mockResolvedValueOnce(response(204));
    expect(await changeProfilePassword(staff.id, passwords)).toMatchObject({ message: expect.stringMatching(/sessão/i) });
    expect(request.mock.calls.map(([url]) => url)).toEqual([
      expect.stringMatching(/\/token\?/),
      expect.stringMatching(/\/logout\?scope=local$/),
    ]);
    expect(new Headers(request.mock.calls[1][1]?.headers).get('Authorization')).toBe('Bearer verification-session');
  });

  it('distingue indisponibilidade da verificação de uma senha incorreta', async () => {
    request.mockResolvedValueOnce(response(400, { code: 'captcha_failed', msg: 'Detalhes privados' }));
    expect(await changeProfilePassword(staff.id, passwords)).toEqual({
      message: 'Não foi possível trocar a senha agora. Tente novamente em instantes.',
    });
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('solicita código do aplicativo autenticador quando a sessão ainda está em AAL1', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({ data: { user: { ...staff, factors: [totp] } }, error: null });
    expect(await changeProfilePassword(staff.id, passwords)).toMatchObject({
      mfaOptions: [{ value: 'totp-id' }],
    });
    expect(supabase.rpc).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
  });

  it('confirma o TOTP na sessão original e usa o novo token da mesma conta', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({ data: { user: { ...staff, factors: [totp] } }, error: null });
    challengeAndVerify.mockResolvedValueOnce({ data: { user: staff, access_token: 'staff-session-aal2' }, error: null });
    request.mockResolvedValueOnce(verified()).mockResolvedValueOnce(response(204));
    expect(await changeProfilePassword(staff.id, passwords, { factorId: 'totp-id', code: '123456' })).toBeNull();
    expect(challengeAndVerify).toHaveBeenCalledWith({ factorId: 'totp-id', code: '123456' });
    expect(new Headers(request.mock.calls[1][1]?.headers).get('Authorization')).toBe('Bearer staff-session-aal2');
  });

  it('não atualiza a senha se o código TOTP for inválido', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({ data: { user: { ...staff, factors: [totp] } }, error: null });
    challengeAndVerify.mockResolvedValueOnce({ data: null, error: { code: 'mfa_verification_failed' } });
    request.mockResolvedValueOnce(verified()).mockResolvedValueOnce(response(204));
    expect(await changeProfilePassword(staff.id, passwords, { factorId: 'totp-id', code: '123456' })).toMatchObject({ field: 'mfaCode' });
    expect(request.mock.calls.map(([url]) => url)).toEqual([
      expect.stringMatching(/\/token\?/),
      expect.stringMatching(/\/logout\?scope=local$/),
    ]);
  });

  it('orienta sobre MFA se a sessão precisa de verificação adicional', async () => {
    request.mockResolvedValueOnce(verified())
      .mockResolvedValueOnce(response(403, { code: 'insufficient_aal' }))
      .mockResolvedValueOnce(response(204));
    expect(await changeProfilePassword(staff.id, passwords)).toMatchObject({ message: expect.stringMatching(/duas etapas/i) });
  });

  it('interrompe a troca e limpa a verificação se a sessão ativa mudar durante o envio', async () => {
    const anotherSession = { user: { ...staff, id: 'owner-id' }, access_token: 'owner-session' } as Session;
    vi.mocked(supabase.auth.getSession)
      .mockResolvedValueOnce({ data: { session }, error: null })
      .mockResolvedValueOnce({ data: { session: anotherSession }, error: null });
    request.mockResolvedValueOnce(verified()).mockResolvedValueOnce(response(204));
    expect(await changeProfilePassword(staff.id, passwords)).toMatchObject({ message: expect.stringMatching(/sessão/i) });
    expect(request.mock.calls.map(([url]) => url)).toEqual([
      expect.stringMatching(/\/token\?/),
      expect.stringMatching(/\/logout\?scope=local$/),
    ]);
  });

  it('informa quando não pôde confirmar a troca sem expor a falha de rede', async () => {
    request.mockResolvedValueOnce(verified())
      .mockRejectedValueOnce(new Error(passwords.newPassword))
      .mockResolvedValueOnce(response(204));
    expect(await changeProfilePassword(staff.id, passwords)).toEqual({
      message: 'Não foi possível confirmar a troca. Se precisar entrar novamente, tente com a nova senha.',
    });
  });

  it('exige a senha atual também quando o servidor rejeita a atualização final', async () => {
    request.mockResolvedValueOnce(verified())
      .mockResolvedValueOnce(response(400, { error_code: 'current_password_mismatch' }))
      .mockResolvedValueOnce(response(204));
    expect(await changeProfilePassword(staff.id, passwords)).toMatchObject({ field: 'currentPassword' });
    expect(request.mock.calls[2][0]).toMatch(/\/logout\?scope=local$/);
  });

  it('não faz verificação por senha para uma conta só com login social', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
      data: { user: { ...staff, app_metadata: { providers: ['google'] } } }, error: null,
    });
    expect(await changeProfilePassword(staff.id, passwords)).toMatchObject({ message: expect.stringMatching(/provedor/i) });
    expect(supabase.rpc).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
  });
});
