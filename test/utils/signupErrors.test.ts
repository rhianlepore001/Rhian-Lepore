import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  classifySignupError,
  mapSignupError,
  reportUnexpectedSignupError,
  signupError,
  SIGNUP_MESSAGES,
} from '@/utils/signupErrors';
import { supabase } from '@/lib/supabase';

const rpc = supabase.rpc as unknown as ReturnType<typeof vi.fn>;

describe('mapSignupError', () => {
  it.each([
    // Auth (supabase-js)
    [{ code: 'user_already_exists', status: 422, message: 'User already registered' }, 'user_already_exists'],
    [{ code: 'email_exists', status: 422, message: 'Email address already exists' }, 'user_already_exists'],
    [{ code: 'weak_password', status: 422, message: 'Password should be at least 8 characters' }, 'weak_password'],
    [{ code: 'over_request_rate_limit', status: 429, message: 'Request rate limit reached' }, 'rate_limited'],
    [{ code: 'over_email_send_rate_limit', status: 429, message: 'email rate limit exceeded' }, 'rate_limited'],
    [{ status: 429, message: 'Too Many Requests' }, 'rate_limited'],
    [{ name: 'AuthRetryableFetchError', status: 0, message: 'Load failed' }, 'network_error'],
    [{ name: 'TypeError', message: 'Failed to fetch' }, 'network_error'],
    [{ message: 'TypeError: Load failed', details: '', hint: '', code: '' }, 'network_error'],
    // complete_staff_invite (PostgREST P0001)
    [{ code: 'P0001', message: 'owner_cannot_claim_staff_invite' }, 'invite_email_owner_account'],
    [{ code: 'P0001', message: 'invite_already_used' }, 'invite_already_used'],
    [{ code: 'P0001', message: 'invalid_invite' }, 'invalid_invite'],
    [{ code: 'P0001', message: 'not_authenticated' }, 'session_missing'],
    // Erros codificados pelo AuthContext.register
    [signupError('invite_email_wrong_password'), 'invite_email_wrong_password'],
    [signupError('invite_email_not_confirmed'), 'invite_email_not_confirmed'],
    [{ code: 'invalid_invite', message: 'Convite inválido. Peça ao gestor um link atualizado.' }, 'invalid_invite'],
  ])('%o → %s', (error, code) => {
    const view = mapSignupError(error);
    expect(view.code).toBe(code);
    expect(view.expected).toBe(true);
    expect(view.message).toBe(SIGNUP_MESSAGES[code as keyof typeof SIGNUP_MESSAGES].message);
    expect(view.message).not.toMatch(/#unknown/);
  });

  it('regressão 24/09: erro sem code que o register devolvia virava #unknown — agora tem code próprio', () => {
    const legacy = { message: 'Este e-mail já está em uso. Se você é colaborador, peça ao gestor para excluir e recriar o convite.' };
    expect(classifySignupError(legacy)).toBe('unknown');
    expect(classifySignupError(signupError('invite_email_wrong_password'))).toBe('invite_email_wrong_password');
  });

  it('só o que é realmente inesperado vira unknown', () => {
    expect(mapSignupError({ code: 'unexpected_failure', status: 500, message: 'Database error saving new user' })).toMatchObject({ code: 'unknown', expected: false });
    expect(mapSignupError(new Error('boom'))).toMatchObject({ code: 'unknown', expected: false });
    expect(mapSignupError(undefined)).toMatchObject({ code: 'unknown', expected: false });
  });

  it('senha errada sugere recuperar senha; convite usado sugere login; convite inválido pede novo link', () => {
    expect(mapSignupError(signupError('invite_email_wrong_password')).action).toBe('recover_password');
    expect(mapSignupError({ message: 'invite_already_used' }).action).toBe('login');
    expect(mapSignupError({ message: 'invalid_invite' }).action).toBe('new_invite');
    expect(mapSignupError({ message: 'owner_cannot_claim_staff_invite' }).action).toBeUndefined();
  });
});

describe('reportUnexpectedSignupError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('grava via log_signup_error (anon) com ref, códigos e e-mail mascarado', async () => {
    rpc.mockResolvedValue({ data: 'log-1', error: null });
    await reportUnexpectedSignupError(
      { name: 'AuthApiError', code: 'unexpected_failure', status: 500, message: 'Database error saving new user' },
      { flow: 'staff_invite', email: 'TalesFurtado3@Gmail.com', companyId: 'c-1', memberId: 'm-1' },
      'ABC234',
    );
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('log_signup_error', {
      p_details: expect.objectContaining({
        ref: 'ABC234',
        flow: 'staff_invite',
        email: 'ta***@gmail.com',
        company_id: 'c-1',
        member_id: 'm-1',
        error_name: 'AuthApiError',
        error_code: 'unexpected_failure',
        error_status: 500,
      }),
    });
  });

  it('se log_signup_error ainda não existe no banco, cai para log_error; nunca lança', async () => {
    rpc
      .mockResolvedValueOnce({ data: null, error: { code: 'PGRST202', message: 'Could not find the function' } })
      .mockResolvedValueOnce({ data: null, error: { code: '42501', message: 'permission denied for function log_error' } });
    await expect(
      reportUnexpectedSignupError(new Error('boom'), { flow: 'owner' }, 'XYZ789'),
    ).resolves.toBeUndefined();
    expect(rpc).toHaveBeenNthCalledWith(2, 'log_error', expect.objectContaining({
      p_message: 'signup_unexpected_error XYZ789',
      p_context: expect.objectContaining({ ref: 'XYZ789', flow: 'owner' }),
    }));
  });
});
