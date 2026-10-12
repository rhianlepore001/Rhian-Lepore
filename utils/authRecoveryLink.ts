/**
 * Link de recuperação de senha (e-mail do Supabase Auth) com HashRouter.
 *
 * O Supabase devolve o usuário para o `redirectTo` em formatos diferentes:
 * - fluxo implícito (padrão do supabase-js): `/?fluxo=nova-senha#access_token=…&refresh_token=…&type=recovery`
 * - PKCE: `/?fluxo=nova-senha&code=…`
 * - template com token_hash: `/?token_hash=…&type=recovery`
 * - link expirado/usado: `/?fluxo=nova-senha#error=access_denied&error_code=otp_expired&error_description=…`
 *
 * Com HashRouter o `#access_token=…` vira uma "rota" inexistente. Por isso o
 * callback é capturado ANTES do client do Supabase ler a URL
 * (`captureRecoveryCallback` em lib/supabase.ts), guardado em memória e a URL
 * é trocada por `/#/update-password` sem tokens.
 */

export const RECOVERY_FLOW_PARAM = 'fluxo';
export const RECOVERY_FLOW_VALUE = 'nova-senha';
export const UPDATE_PASSWORD_HASH = '#/update-password';

export type RecoveryErrorReason = 'expired' | 'invalid';

export type RecoveryCallback =
  | { kind: 'implicit'; accessToken: string; refreshToken: string }
  | { kind: 'pkce'; code: string }
  | { kind: 'token_hash'; tokenHash: string }
  | { kind: 'error'; reason: RecoveryErrorReason; code: string | null }
  | { kind: 'none' };

/** URL para onde o e-mail de recuperação deve voltar (sem `#`: o Auth anexa o fragmento). */
export function buildRecoveryRedirectUrl(origin: string): string {
  const base = origin.replace(/\/+$/, '');
  return `${base}/?${RECOVERY_FLOW_PARAM}=${RECOVERY_FLOW_VALUE}`;
}

function collectParams(href: string): { search: URLSearchParams; hash: URLSearchParams; hashRoute: string } {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return { search: new URLSearchParams(), hash: new URLSearchParams(), hashRoute: '' };
  }
  const rawHash = url.hash.replace(/^#/, '');
  // `#/update-password?access_token=…` (rota + query) ou `#access_token=…` (fragmento puro)
  let hashRoute = '';
  let hashQuery = rawHash;
  if (rawHash.startsWith('/')) {
    const q = rawHash.indexOf('?');
    hashRoute = q === -1 ? rawHash : rawHash.slice(0, q);
    hashQuery = q === -1 ? '' : rawHash.slice(q + 1);
  }
  return { search: url.searchParams, hash: new URLSearchParams(hashQuery), hashRoute };
}

function pick(name: string, ...sources: URLSearchParams[]): string | null {
  for (const s of sources) {
    const v = s.get(name);
    if (v) return v;
  }
  return null;
}

export function classifyRecoveryError(code: string | null, description: string | null): RecoveryErrorReason {
  const text = `${code ?? ''} ${description ?? ''}`.toLowerCase();
  if (/otp_expired|expired|expirad/.test(text)) return 'expired';
  return 'invalid';
}

/**
 * Lê o retorno do e-mail de recuperação. Só reconhece links de RECUPERAÇÃO
 * (type=recovery ou o marcador `?fluxo=nova-senha`), para não engolir o
 * retorno de confirmação de cadastro/convite, que o supabase-js trata sozinho.
 */
export function parseRecoveryCallback(href: string): RecoveryCallback {
  const { search, hash, hashRoute } = collectParams(href);
  const type = pick('type', hash, search);
  const isRecovery =
    type === 'recovery' ||
    search.get(RECOVERY_FLOW_PARAM) === RECOVERY_FLOW_VALUE ||
    hashRoute === '/update-password';
  if (!isRecovery) return { kind: 'none' };

  const errorCode = pick('error_code', hash, search);
  const error = pick('error', hash, search);
  const errorDescription = pick('error_description', hash, search);
  if (errorCode || error || errorDescription) {
    return {
      kind: 'error',
      reason: classifyRecoveryError(errorCode ?? error, errorDescription),
      code: errorCode ?? error,
    };
  }

  const accessToken = pick('access_token', hash, search);
  const refreshToken = pick('refresh_token', hash, search);
  if (accessToken && refreshToken) return { kind: 'implicit', accessToken, refreshToken };

  const tokenHash = pick('token_hash', search, hash);
  if (tokenHash) return { kind: 'token_hash', tokenHash };

  const code = pick('code', search, hash);
  if (code) return { kind: 'pkce', code };

  return { kind: 'none' };
}

/** A URL carrega algo que não pode ficar na barra/histórico (token ou erro do Auth). */
export function hasRecoveryPayload(callback: RecoveryCallback): boolean {
  return callback.kind !== 'none';
}

let pendingCallback: RecoveryCallback | null = null;

/**
 * Captura o retorno do e-mail e limpa a URL para `/#/update-password`.
 * Precisa rodar antes do `createClient` (o supabase-js lê a URL ao iniciar).
 */
export function captureRecoveryCallback(win: Pick<Window, 'location' | 'history'> | undefined = typeof window !== 'undefined' ? window : undefined): RecoveryCallback {
  if (!win) return { kind: 'none' };
  const callback = parseRecoveryCallback(win.location.href);
  if (!hasRecoveryPayload(callback)) return callback;
  pendingCallback = callback;
  try {
    win.history.replaceState(null, '', `${win.location.pathname}${UPDATE_PASSWORD_HASH}`);
  } catch {
    win.location.hash = UPDATE_PASSWORD_HASH;
  }
  return callback;
}

/** Entrega o callback capturado uma única vez (o token é de uso único). */
export function takeRecoveryCallback(): RecoveryCallback {
  const cb = pendingCallback ?? { kind: 'none' as const };
  pendingCallback = null;
  return cb;
}

/** Só para testes. */
export function __setPendingRecoveryCallback(cb: RecoveryCallback | null): void {
  pendingCallback = cb;
}
