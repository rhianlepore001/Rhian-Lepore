import type { SupabaseClient } from '@supabase/supabase-js';
import {
  buildRecoveryRedirectUrl,
  type RecoveryCallback,
  type RecoveryErrorReason,
} from '../utils/authRecoveryLink';

type AuthClient = Pick<SupabaseClient['auth'], 'resetPasswordForEmail' | 'setSession' | 'exchangeCodeForSession' | 'verifyOtp' | 'getSession' | 'updateUser'>;

export type RecoveryInvalidReason = RecoveryErrorReason | 'missing' | 'other_browser';

export type RecoverySessionResult =
  | { status: 'ready' }
  | { status: 'invalid'; reason: RecoveryInvalidReason };

/** Segundos de espera entre pedidos (limite do Supabase Auth para o mesmo e-mail). */
export const RESEND_COOLDOWN_SECONDS = 60;

export const RECOVERY_INVALID_COPY: Record<RecoveryInvalidReason, { title: string; body: string }> = {
  expired: {
    title: 'Este link expirou',
    body: 'Por segurança, o link de redefinição vale por pouco tempo e só pode ser usado uma vez. Peça um novo e use o mais recente que chegar.',
  },
  invalid: {
    title: 'Link inválido',
    body: 'Não conseguimos validar este link. Ele pode ter sido usado ou copiado pela metade. Peça um novo link para continuar.',
  },
  other_browser: {
    title: 'Abra o link no mesmo navegador',
    body: 'Este link precisa ser aberto no mesmo navegador em que você pediu a redefinição. Peça um novo link por aqui e abra-o neste aparelho.',
  },
  missing: {
    title: 'Sessão de redefinição não encontrada',
    body: 'Para criar uma nova senha, abra o link enviado para o seu e-mail. Se ele não estiver mais com você, peça outro.',
  },
};

function errorText(err: unknown): string {
  if (!err || typeof err !== 'object') return '';
  const e = err as { code?: string; message?: string; status?: number };
  return `${e.code ?? ''} ${e.message ?? ''}`.toLowerCase();
}

function errorStatus(err: unknown): number | undefined {
  if (!err || typeof err !== 'object') return undefined;
  return (err as { status?: number }).status;
}

export function isRateLimitError(err: unknown): boolean {
  return errorStatus(err) === 429 || /rate limit|over_email_send_rate_limit|only request this after|security purposes/.test(errorText(err));
}

export function mapRecoveryRequestError(err: unknown): string {
  if (isRateLimitError(err)) {
    return 'Você acabou de pedir um link. Aguarde um minuto e tente de novo.';
  }
  if (/invalid.*email|email.*invalid|validation_failed/.test(errorText(err))) {
    return 'Confira o e-mail digitado. Parece haver um erro no endereço.';
  }
  if (/fetch|network|failed to fetch/.test(errorText(err))) {
    return 'Sem conexão no momento. Verifique sua internet e tente de novo.';
  }
  return 'Não foi possível enviar o link agora. Tente de novo em instantes.';
}

export function mapUpdatePasswordError(err: unknown): string {
  const text = errorText(err);
  if (/same_password|should be different|different from the old/.test(text)) {
    return 'A nova senha precisa ser diferente da atual.';
  }
  if (/weak_password|password should/.test(text)) {
    return 'Essa senha é fraca demais. Use uma combinação mais difícil de adivinhar.';
  }
  if (/session|jwt|expired|not authenticated|auth session missing/.test(text)) {
    return 'Sua sessão de redefinição expirou. Peça um novo link para continuar.';
  }
  if (/fetch|network/.test(text)) {
    return 'Sem conexão no momento. Verifique sua internet e tente de novo.';
  }
  return 'Não foi possível salvar a nova senha. Tente de novo.';
}

export function isSessionExpiredError(err: unknown): boolean {
  return /session|jwt|expired|not authenticated|auth session missing/.test(errorText(err));
}

export async function requestPasswordReset(auth: AuthClient, email: string, origin: string) {
  return auth.resetPasswordForEmail(email.trim(), {
    redirectTo: buildRecoveryRedirectUrl(origin),
  });
}

/**
 * Transforma o retorno do e-mail numa sessão de redefinição.
 * Sem callback, aceita uma sessão já existente (link aberto e página recarregada).
 */
export async function resolveRecoverySession(auth: AuthClient, callback: RecoveryCallback): Promise<RecoverySessionResult> {
  switch (callback.kind) {
    case 'error':
      return { status: 'invalid', reason: callback.reason };
    case 'implicit': {
      const { error } = await auth.setSession({
        access_token: callback.accessToken,
        refresh_token: callback.refreshToken,
      });
      return error ? { status: 'invalid', reason: 'expired' } : { status: 'ready' };
    }
    case 'pkce': {
      const { error } = await auth.exchangeCodeForSession(callback.code);
      if (!error) return { status: 'ready' };
      return { status: 'invalid', reason: /code verifier|code_verifier|flow_state/.test(errorText(error)) ? 'other_browser' : 'expired' };
    }
    case 'token_hash': {
      const { error } = await auth.verifyOtp({ token_hash: callback.tokenHash, type: 'recovery' });
      return error ? { status: 'invalid', reason: 'expired' } : { status: 'ready' };
    }
    case 'none':
    default: {
      const { data } = await auth.getSession();
      return data.session ? { status: 'ready' } : { status: 'invalid', reason: 'missing' };
    }
  }
}
