import type { User } from '@supabase/supabase-js';
import { isDemoMode } from '../lib/demo/mode';
import { supabase } from '../lib/supabase';
import { describeServerWeakPassword, passwordPolicyError } from '../utils/passwordPolicy';

export interface ProfilePasswords {
  currentPassword: string;
  newPassword: string;
  confirmation: string;
}

export interface ProfilePasswordVerification {
  factorId: string;
  code: string;
}

interface PasswordChangeError {
  field?: keyof ProfilePasswords | 'mfaCode';
  message: string;
  mfaOptions?: { value: string; label: string }[];
}

interface AuthPayload {
  code?: string;
  error_code?: string;
  weak_password?: { reasons?: string[] };
  user?: { id?: string };
  access_token?: string;
}

const sessionError = { message: 'Sua sessão mudou ou expirou. Entre na sua conta e tente novamente.' };
const tryAgain = { message: 'Não foi possível trocar a senha agora. Tente novamente em instantes.' };
const retryLater = { message: 'Muitas tentativas. Aguarde pelo menos 1 minuto antes de tentar de novo.' };
const updateUnconfirmed = {
  message: 'Não foi possível confirmar a troca. Se precisar entrar novamente, tente com a nova senha.',
};

const currentError = {
  field: 'currentPassword',
  message: 'Não foi possível confirmar a senha atual. Confira e tente de novo.',
} as const;

export function hasEmailPasswordIdentity(user: User | null): boolean {
  return Boolean(user?.email && !user.is_anonymous && (
    user.identities?.some(identity => identity.provider === 'email') ||
    user.app_metadata.providers?.includes('email') ||
    user.app_metadata.provider === 'email'
  ));
}

function validatePasswords({ currentPassword, newPassword, confirmation }: ProfilePasswords): PasswordChangeError | null {
  if (!currentPassword) return { field: 'currentPassword', message: 'Informe sua senha atual.' };
  const policyError = passwordPolicyError(newPassword);
  if (policyError) return { field: 'newPassword', message: policyError };
  if (newPassword === currentPassword) return { field: 'newPassword', message: 'Escolha uma senha diferente da atual.' };
  if (newPassword !== confirmation) return { field: 'confirmation', message: 'As senhas não coincidem.' };
  return null;
}

async function withAuthDeadline<T>(operation: (signal: AbortSignal) => PromiseLike<T>, timeout = 10_000): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation(controller.signal),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Error('Tempo limite do Auth.'));
        }, timeout);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function authRequest(path: string, method: 'POST' | 'PUT', token?: string, body?: object) {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (isDemoMode() || !url || !key) throw new Error('Auth indisponível.');
  const headers: Record<string, string> = {
    apikey: key,
    'Content-Type': 'application/json',
    'X-Supabase-Api-Version': '2024-01-01',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  return withAuthDeadline(async signal => {
    const response = await fetch(`${url.replace(/\/+$/, '')}/auth/v1/${path}`, {
      method, headers, body: body && JSON.stringify(body), signal, redirect: 'error', cache: 'no-store',
    });
    const data: AuthPayload = (await response.json().catch(() => null)) ?? {};
    return { ok: response.ok, status: response.status, data, code: data.error_code ?? data.code };
  });
}

export async function changeProfilePassword(
  accountId: string,
  passwords: ProfilePasswords,
  secondFactor?: ProfilePasswordVerification,
): Promise<PasswordChangeError | null> {
  const validationError = validatePasswords(passwords);
  if (validationError) return validationError;
  if (isDemoMode()) return tryAgain;

  let verificationToken: string | undefined;
  try {
    const { data: { session }, error: authError } = await withAuthDeadline(() => supabase.auth.getSession());
    if (authError || !session?.access_token || session.user.id !== accountId) return sessionError;

    const { data: { user }, error: userError } = await withAuthDeadline(() => supabase.auth.getUser(session.access_token));
    if (userError || user?.id !== accountId) return sessionError;
    const email = user.email;
    if (!email || !hasEmailPasswordIdentity(user)) {
      return { message: 'Gerencie a senha com o provedor que você usa para entrar.' };
    }

    const mfaOptions = (user.factors ?? [])
      .filter(factor => factor.factor_type === 'totp' && factor.status === 'verified')
      .map((factor, index) => ({
        value: factor.id,
        label: factor.friendly_name || `Aplicativo autenticador ${index + 1}`,
      }));
    const mfaRequired: PasswordChangeError = mfaOptions.length
      ? { message: 'Informe o código do seu aplicativo autenticador.', mfaOptions }
      : { message: 'Confirme a verificação em duas etapas para poder trocar sua senha.' };

    if (mfaOptions.length && !secondFactor) {
      const { data, error } = await withAuthDeadline(() => supabase.auth.mfa.getAuthenticatorAssuranceLevel());
      if (error || !data.currentLevel) return sessionError;
      if (data.currentLevel !== 'aal2') return mfaRequired;
    }
    if (secondFactor) {
      if (!mfaOptions.some(option => option.value === secondFactor.factorId)) return mfaRequired;
      if (!/^\d{6}$/.test(secondFactor.code)) {
        return { field: 'mfaCode', message: 'Informe os 6 dígitos do seu aplicativo autenticador.' };
      }
    }

    const { data: allowed, error: limitError } = await withAuthDeadline(signal => supabase.rpc('check_login_rate_limit', {
      p_email: email.trim().toLowerCase(),
    }).abortSignal(signal));
    if (limitError || allowed !== true) return allowed === false && !limitError ? retryLater : tryAgain;

    const verification = await authRequest('token?grant_type=password', 'POST', undefined, {
      email,
      password: passwords.currentPassword,
    });
    if (verification.status === 429) return retryLater;
    if (verification.code === 'invalid_credentials') return currentError;
    if (!verification.ok) return tryAgain;

    verificationToken = verification.data.access_token;
    if (!verificationToken || verification.data.user?.id !== accountId) return sessionError;

    const { data: { session: activeSession }, error: activeSessionError } = await withAuthDeadline(() => supabase.auth.getSession());
    if (activeSessionError || activeSession?.access_token !== session.access_token) return sessionError;

    let accessToken = session.access_token;
    if (secondFactor) {
      const { data, error } = await withAuthDeadline(() => supabase.auth.mfa.challengeAndVerify(secondFactor));
      if (error?.status === 429) return retryLater;
      if (error) return { field: 'mfaCode', message: 'Não foi possível confirmar o código. Confira e tente novamente.' };
      if (data.user.id !== accountId || !data.access_token) return sessionError;
      accessToken = data.access_token;
    }

    const update = await authRequest('user', 'PUT', accessToken, {
      current_password: passwords.currentPassword,
      password: passwords.newPassword,
    }).catch(() => null);
    if (!update || update.status >= 500) return updateUnconfirmed;
    if (update.ok) {
      verificationToken = undefined;
      return null;
    }
    if (update.status === 429) return retryLater;
    const { code } = update;
    if (code === 'insufficient_aal') return mfaRequired;
    if (update.status === 401 || update.status === 403) return sessionError;
    if (code === 'current_password_mismatch' || code === 'current_password_required') return currentError;
    if (code === 'same_password') return { field: 'newPassword', message: 'Escolha uma senha diferente da atual.' };
    const weakPassword = describeServerWeakPassword({ code, weak_password: update.data.weak_password });
    if (weakPassword) return { field: 'newPassword', message: weakPassword };
    if (code === 'reauthentication_needed') {
      return { message: 'Por segurança, entre novamente na sua conta antes de trocar a senha.' };
    }
    return tryAgain;
  } catch {
    return tryAgain;
  } finally {
    if (verificationToken) {
      await authRequest('logout?scope=local', 'POST', verificationToken).catch(() => undefined);
    }
  }
}
