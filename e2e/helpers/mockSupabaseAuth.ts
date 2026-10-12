import type { Page, Request } from '@playwright/test';

/**
 * Supabase Auth/REST falsos para os fluxos de senha (sem tocar em produção).
 * Rode o app com VITE_SUPABASE_URL apontando para um host qualquer
 * (ex.: http://127.0.0.1:59999); tudo em /auth/v1 e /rest/v1 é interceptado.
 */
const b64url = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url');

export const MOCK_EMAIL = 'dono@exemplo.com';

export function fakeAccessToken(expiresInSec = 3600): string {
  const now = Math.floor(Date.now() / 1000);
  return [
    b64url({ alg: 'HS256', typ: 'JWT' }),
    b64url({ sub: 'user-e2e', email: MOCK_EMAIL, role: 'authenticated', aud: 'authenticated', iat: now, exp: now + expiresInSec, session_id: 's-e2e' }),
    'assinatura-falsa',
  ].join('.');
}

const user = {
  id: 'user-e2e',
  aud: 'authenticated',
  role: 'authenticated',
  email: MOCK_EMAIL,
  app_metadata: { provider: 'email' },
  user_metadata: {},
  created_at: '2026-01-01T00:00:00Z',
};

export interface AuthMockLog {
  recover: { redirectTo: string | null; email: string | null }[];
  passwordUpdates: string[];
  signups: { email: string | null; password: string | null }[];
  hosts: Set<string>;
}

export async function mockSupabaseAuth(page: Page, opts: { updateUserError?: { status: number; body: unknown } } = {}): Promise<AuthMockLog> {
  const log: AuthMockLog = { recover: [], passwordUpdates: [], signups: [], hosts: new Set() };
  page.on('request', (r: Request) => {
    try {
      log.hosts.add(new URL(r.url()).host);
    } catch {
      /* data: urls */
    }
  });

  await page.route(/\/auth\/v1\//, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname.replace(/.*\/auth\/v1/, '');
    const json = (status: number, body: unknown) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    if (path === '/recover' && req.method() === 'POST') {
      const body = req.postDataJSON() as { email?: string } | null;
      log.recover.push({ redirectTo: url.searchParams.get('redirect_to'), email: body?.email ?? null });
      return json(200, {});
    }
    if (path === '/signup' && req.method() === 'POST') {
      const body = req.postDataJSON() as { email?: string; password?: string } | null;
      log.signups.push({ email: body?.email ?? null, password: body?.password ?? null });
      return json(200, { access_token: fakeAccessToken(), refresh_token: 'rt-signup', token_type: 'bearer', expires_in: 3600, user: { ...user, email: body?.email ?? MOCK_EMAIL, identities: [{ id: 'i1' }] } });
    }
    if (path === '/user' && req.method() === 'GET') return json(200, user);
    if (path === '/user' && req.method() === 'PUT') {
      const body = req.postDataJSON() as { password?: string } | null;
      if (opts.updateUserError) return json(opts.updateUserError.status, opts.updateUserError.body);
      if (body?.password) log.passwordUpdates.push(body.password);
      return json(200, user);
    }
    if (path === '/token') {
      return json(200, { access_token: fakeAccessToken(), refresh_token: 'rt-novo', token_type: 'bearer', expires_in: 3600, user });
    }
    if (path === '/logout') return route.fulfill({ status: 204, body: '' });
    return json(200, {});
  });

  await page.route(/\/rest\/v1\//, async (route) => {
    const accept = route.request().headers()['accept'] ?? '';
    const body = accept.includes('vnd.pgrst.object') ? {} : [];
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });

  return log;
}

export function recoveryCallbackUrl(base: string, token = fakeAccessToken()): string {
  return `${base}/?fluxo=nova-senha#access_token=${token}&expires_at=${Math.floor(Date.now() / 1000) + 3600}&expires_in=3600&refresh_token=rt-e2e&token_type=bearer&type=recovery`;
}

export function expiredCallbackUrl(base: string): string {
  return `${base}/?fluxo=nova-senha#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired`;
}
