/**
 * Erros do cadastro (dono e convite de colaborador) → copy PT-BR acionável.
 *
 * Diferente de `mapError` (genérico), aqui cada falha conhecida do fluxo de
 * cadastro vira uma mensagem que diz o que fazer. `#unknown` fica só para o que
 * realmente não esperamos — e esses casos são registrados via
 * `reportUnexpectedSignupError` para diagnóstico.
 */
import { supabase } from '../lib/supabase';

export type SignupErrorCode =
  | 'invite_email_wrong_password'
  | 'invite_email_owner_account'
  | 'invite_email_not_confirmed'
  | 'invite_already_used'
  | 'invalid_invite'
  | 'user_already_exists'
  | 'weak_password'
  | 'rate_limited'
  | 'network_error'
  | 'session_missing'
  | 'unknown';

/** Próximo passo sugerido ao usuário (vira link na tela). */
export type SignupErrorAction = 'login' | 'recover_password' | 'new_invite';

export interface SignupErrorView {
  code: SignupErrorCode;
  message: string;
  action?: SignupErrorAction;
  /** false = falha inesperada: logar e mostrar referência para o suporte. */
  expected: boolean;
}

/** Erro "codificado" devolvido pelo `register` do AuthContext. */
export interface CodedSignupError {
  code: SignupErrorCode;
  message: string;
}

export const SIGNUP_MESSAGES: Record<Exclude<SignupErrorCode, 'unknown'>, { message: string; action?: SignupErrorAction }> = {
  invite_email_wrong_password: {
    message:
      'Este e-mail já tem uma conta no AgendiX. Digite a senha dessa conta para aceitar o convite, ou use outro e-mail.',
    action: 'recover_password',
  },
  invite_email_owner_account: {
    message:
      'Este e-mail já é de uma conta de dono de negócio no AgendiX e não pode entrar como colaborador. Use outro e-mail para aceitar o convite.',
  },
  invite_email_not_confirmed: {
    message:
      'Este e-mail já foi cadastrado, mas ainda não foi confirmado. Confirme pelo link enviado ao seu e-mail ou use outro e-mail.',
  },
  invite_already_used: {
    message:
      'Este convite já foi usado por outra conta. Se foi você, faça login. Se não, peça ao gestor um novo convite na tela de Equipe.',
    action: 'login',
  },
  invalid_invite: {
    message:
      'Este convite não é mais válido (o perfil foi removido ou desativado). Peça ao gestor um novo link na tela de Equipe.',
    action: 'new_invite',
  },
  user_already_exists: {
    message: 'Este e-mail já tem conta. Faça login ou use outro e-mail.',
    action: 'login',
  },
  weak_password: {
    message: 'Senha fraca. Use pelo menos 8 caracteres, com 1 letra maiúscula, 1 número e 1 símbolo.',
  },
  rate_limited: {
    message: 'Muitas tentativas seguidas. Aguarde 5 minutos e tente de novo.',
  },
  network_error: {
    message: 'Sem conexão com o servidor. Verifique sua internet e tente de novo.',
  },
  session_missing: {
    message: 'Sua conta foi criada, mas não conseguimos entrar automaticamente. Toque em “Criar minha conta” de novo para concluir.',
  },
};

export const UNKNOWN_SIGNUP_MESSAGE = 'Não foi possível criar a conta. Tente de novo em instantes.';

export function signupError(code: Exclude<SignupErrorCode, 'unknown'>): CodedSignupError {
  return { code, message: SIGNUP_MESSAGES[code].message };
}

interface RawShape {
  code?: unknown;
  error_code?: unknown;
  message?: unknown;
  msg?: unknown;
  name?: unknown;
  status?: unknown;
}

function rawOf(error: unknown): RawShape {
  if (error && typeof error === 'object') return error as RawShape;
  return { message: String(error ?? '') };
}

const INVITE_EXCEPTIONS: Record<string, SignupErrorCode> = {
  owner_cannot_claim_staff_invite: 'invite_email_owner_account',
  invite_already_used: 'invite_already_used',
  invalid_invite: 'invalid_invite',
  not_authenticated: 'session_missing',
};

const KNOWN_CODES = new Set<string>(Object.keys(SIGNUP_MESSAGES));

/** Classifica o erro sem decidir a copy (útil para testes e logs). */
export function classifySignupError(error: unknown): SignupErrorCode {
  const raw = rawOf(error);
  const code = typeof raw.code === 'string' ? raw.code : typeof raw.error_code === 'string' ? raw.error_code : '';
  const message = String(raw.message ?? raw.msg ?? '').toLowerCase();
  const name = typeof raw.name === 'string' ? raw.name : '';
  const status = typeof raw.status === 'number' ? raw.status : undefined;

  if (KNOWN_CODES.has(code)) return code as SignupErrorCode;

  // Exceções levantadas por complete_staff_invite (PostgREST devolve code P0001 + message).
  for (const [exception, mapped] of Object.entries(INVITE_EXCEPTIONS)) {
    if (message === exception || message.includes(exception)) return mapped;
  }

  if (
    code === 'email_exists'
    || message.includes('already registered')
    || message.includes('already been registered')
    || message.includes('user already exists')
  ) {
    return 'user_already_exists';
  }

  if (code === 'weak_password' || message.includes('password should') || message.includes('weak password')) {
    return 'weak_password';
  }

  if (
    status === 429
    || code.startsWith('over_')
    || message.includes('rate limit')
    || message.includes('too many requests')
    || message.includes('muitas tentativas')
  ) {
    return 'rate_limited';
  }

  if (
    name === 'AuthRetryableFetchError'
    || (status === 0 && name.startsWith('Auth'))
    || message.includes('failed to fetch')
    || message.includes('load failed') // Safari/iOS
    || message.includes('networkerror')
    || message.includes('network request failed')
  ) {
    return 'network_error';
  }

  if (code === 'session_not_found' || code === 'no_authorization' || code === 'bad_jwt') return 'session_missing';

  return 'unknown';
}

export function mapSignupError(error: unknown): SignupErrorView {
  const code = classifySignupError(error);
  if (code === 'unknown') {
    return { code, message: UNKNOWN_SIGNUP_MESSAGE, expected: false };
  }
  const entry = SIGNUP_MESSAGES[code];
  return { code, message: entry.message, action: entry.action, expected: true };
}

/** Referência curta mostrada ao usuário e gravada no log (correlação suporte ↔ log). */
export function newSupportRef(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i += 1) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

function maskEmail(email: string | undefined): string | null {
  if (!email || !email.includes('@')) return null;
  const [user, domain] = email.trim().toLowerCase().split('@');
  return `${user.slice(0, 2)}***@${domain}`;
}

export interface SignupErrorContext {
  flow: 'staff_invite' | 'owner';
  email?: string;
  companyId?: string | null;
  memberId?: string | null;
}

/**
 * Registra falha inesperada do cadastro. Quem está no cadastro normalmente é
 * anônimo e `log_error` exige login, então usamos `log_signup_error` (anon,
 * limitado no banco). Se a função ainda não existir no banco, cai para
 * `log_error` (funciona quando já há sessão). Nunca lança.
 */
export async function reportUnexpectedSignupError(
  error: unknown,
  context: SignupErrorContext,
  ref: string,
): Promise<void> {
  const raw = rawOf(error);
  const details = {
    ref,
    flow: context.flow,
    email: maskEmail(context.email),
    company_id: context.companyId ?? null,
    member_id: context.memberId ?? null,
    error_name: typeof raw.name === 'string' ? raw.name : null,
    error_code: String(raw.code ?? raw.error_code ?? '') || null,
    error_status: typeof raw.status === 'number' ? raw.status : null,
    error_message: String(raw.message ?? raw.msg ?? '').slice(0, 500),
    url: typeof window !== 'undefined' ? window.location.href.split('?')[0] : null,
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
  };

  console.error('[signup] erro inesperado', details, error);

  try {
    const { error: logError } = await supabase.rpc('log_signup_error', { p_details: details });
    if (!logError) return;
    const { error: fallbackError } = await supabase.rpc('log_error', {
      p_message: `signup_unexpected_error ${ref}`,
      p_severity: 'error',
      p_context: details,
    });
    if (fallbackError) {
      console.error('[signup] não foi possível registrar o erro', fallbackError);
    }
  } catch (loggingError) {
    console.error('[signup] não foi possível registrar o erro', loggingError);
  }
}
