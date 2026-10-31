/**
 * Backend 100% FALSO (em memória) para testes E2E de cadastro/onboarding. Nenhuma requisição sai
 * para o Supabase real: o app é servido com VITE_SUPABASE_URL=http://127.0.0.1:59999.
 * Imita o banco de prod DEPOIS das correções: o cliente não tem INSERT em profiles (42501) e o perfil
 * nasce em ensure_owner_profile.
 */
import type { Page, Route } from '@playwright/test';

export const UID = '0a000000-0000-4000-8000-0000000000e2';
export const EMAIL = 'novo.dono@exemplo.com';

const b64url = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
const token = () => {
  const now = Math.floor(Date.now() / 1000);
  return [b64url({ alg: 'HS256', typ: 'JWT' }), b64url({ sub: UID, email: EMAIL, role: 'authenticated', aud: 'authenticated', iat: now, exp: now + 3600, session_id: 's' }), 'x'].join('.');
};

export interface MockOptions {
  /** Confirmação de e-mail ligada: signUp devolve usuário SEM sessão. */
  emailConfirmation?: boolean;
  /** Já existe conta com onboarding concluído (login). */
  existingOwner?: boolean;
  /** Perfil ausente mas progresso do assistente já concluído (o caso do Rafael). */
  orphanCompleted?: boolean;
  /** ensure_owner_profile falha (banco fora). */
  ensureFails?: boolean;
  userType?: 'barber' | 'beauty';
  region?: 'BR' | 'PT';
}

export interface MockState {
  opts: MockOptions;
  profile: Record<string, any> | null;
  businessSettings: Record<string, any> | null;
  progress: Record<string, any> | null;
  tables: Record<string, any[]>;
  calls: string[];
  hosts: Set<string>;
  ensureCalls: number;
  directProfileInserts: number;
  signupBodies: any[];
}

export function freshState(opts: MockOptions = {}): MockState {
  const s: MockState = { opts, profile: null, businessSettings: null, progress: null, tables: { services: [], service_categories: [], team_members: [], monthly_goals: [], clients: [], appointments: [] }, calls: [], hosts: new Set(), ensureCalls: 0, directProfileInserts: 0, signupBodies: [] };
  if (opts.existingOwner || opts.orphanCompleted) {
    if (!opts.orphanCompleted) s.profile = makeProfile(opts, true);
    s.businessSettings = { user_id: UID, onboarding_completed: false, onboarding_step: 1 };
    s.progress = { company_id: UID, current_step: 5, completed_steps: [1, 2, 3, 4, 5], is_completed: true, step_data: {} };
  }
  return s;
}

function makeProfile(opts: MockOptions, tutorial: boolean) {
  return { id: UID, email: EMAIL, role: 'owner', company_id: UID, user_type: opts.userType ?? 'barber', region: opts.region ?? 'BR', business_name: 'Oliveira Cortes', full_name: 'Rafael Teste', subscription_status: 'trial', trial_ends_at: new Date(Date.now() + 20 * 86400000).toISOString(), tutorial_completed: tutorial, aios_enabled: true, business_slug: 'oliveira-cortes-0a000000', phone: '11999999999' };
}

const matchFilters = (rows: any[], url: URL) => {
  let out = rows;
  url.searchParams.forEach((v, k) => {
    if (['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'].includes(k)) return;
    const m = /^(eq|in|is|neq)\.(.*)$/.exec(v);
    if (!m) return;
    const [, op, val] = m;
    out = out.filter((r) => {
      const cur = r[k];
      if (op === 'eq') return String(cur) === val;
      if (op === 'neq') return String(cur) !== val;
      if (op === 'is') return val === 'null' ? cur == null : String(cur) === val;
      if (op === 'in') return val.replace(/[()"]/g, '').split(',').includes(String(cur));
      return true;
    });
  });
  return out;
};

export async function mockBackend(page: Page, state: MockState) {
  const o = state.opts;
  const meta = { full_name: 'Rafael Teste', business_name: 'Oliveira Cortes', type: o.userType ?? 'barber', region: o.region ?? 'BR', phone: '11999999999', role: 'owner' };
  const user = { id: UID, aud: 'authenticated', role: 'authenticated', email: EMAIL, email_confirmed_at: '2026-10-12T10:00:00Z', app_metadata: { provider: 'email' }, user_metadata: meta, identities: [{ id: UID }], created_at: '2026-10-12T10:00:00Z' };
  const session = () => ({ access_token: token(), refresh_token: 'rt', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user });
  page.on('request', (r) => { try { state.hosts.add(new URL(r.url()).host); } catch { /* */ } });

  await page.route(/\/auth\/v1\//, async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace(/.*\/auth\/v1/, '');
    const json = (s: number, b: unknown) => route.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(b) });
    state.calls.push(`auth ${req.method()} ${path}`);
    if (path === '/signup') {
      try { state.signupBodies.push(JSON.parse(req.postData() || '{}')); } catch { /* */ }
      if (o.emailConfirmation) return json(200, { ...user, email_confirmed_at: null, confirmation_sent_at: new Date().toISOString() });
      return json(200, session());
    }
    if (path === '/token') return json(200, session());
    if (path === '/user') return json(200, user);
    if (path === '/logout') return route.fulfill({ status: 204, body: '' });
    return json(200, {});
  });

  await page.route(/\/rest\/v1\//, async (route: Route) => {
    const req = route.request();
    const url = new URL(req.url());
    const p = url.pathname.replace(/.*\/rest\/v1/, '');
    const single = (req.headers()['accept'] ?? '').includes('vnd.pgrst.object');
    const json = (s: number, b: unknown) => route.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(b) });
    const noRow = () => json(406, { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned', details: 'The result contains 0 rows' });
    const reply = (rows: any[]) => (single ? (rows[0] ? json(200, rows[0]) : noRow()) : json(200, rows));
    const body = () => { try { return JSON.parse(req.postData() || 'null'); } catch { return null; } };
    state.calls.push(`${req.method()} ${p}`);

    if (p === '/rpc/ensure_owner_profile') {
      state.ensureCalls++;
      if (o.ensureFails) return json(500, { code: 'XX000', message: 'falha simulada' });
      if (state.profile) return json(200, { status: 'exists', role: 'owner', business_settings_created: false });
      state.profile = makeProfile(o, false);
      state.businessSettings = state.businessSettings ?? { user_id: UID, onboarding_completed: false, onboarding_step: 1 };
      return json(200, { status: 'created', role: 'owner' });
    }
    if (p === '/rpc/upsert_onboarding_progress') {
      const b = body();
      state.progress = { ...(state.progress ?? {}), company_id: b.p_company_id, current_step: b.p_current_step, completed_steps: b.p_completed_steps, is_completed: state.progress?.is_completed ?? false, step_data: {} };
      return json(200, state.progress);
    }
    if (p === '/rpc/update_onboarding_step') return json(200, null);
    if (p.startsWith('/rpc/')) return json(200, null);

    if (p === '/profiles') {
      if (req.method() === 'POST') { state.directProfileInserts++; return json(403, { code: '42501', message: 'permission denied for table profiles' }); }
      if (req.method() === 'PATCH') {
        if (!state.profile) return json(200, []); // 0 linhas, sem erro (como o PostgREST)
        Object.assign(state.profile, body());
        return json(200, [state.profile]);
      }
      return reply(state.profile ? matchFilters([state.profile], url) : []);
    }
    if (p === '/business_settings') {
      if (req.method() === 'PATCH') {
        if (!state.businessSettings) return json(200, []);
        Object.assign(state.businessSettings, body());
        return json(200, single ? state.businessSettings : [state.businessSettings]);
      }
      if (req.method() === 'POST') { state.businessSettings = { ...(state.businessSettings ?? { user_id: UID }), ...(Array.isArray(body()) ? body()[0] : body()) }; return json(201, single ? state.businessSettings : [state.businessSettings]); }
      return reply(state.businessSettings ? [state.businessSettings] : []);
    }
    if (p === '/onboarding_progress') {
      if (req.method() === 'PATCH') { if (state.progress) Object.assign(state.progress, body()); return json(200, state.progress ? [state.progress] : []); }
      if (req.method() === 'POST') { const b = Array.isArray(body()) ? body()[0] : body(); state.progress = { ...(state.progress ?? {}), ...b }; return json(201, single ? state.progress : [state.progress]); }
      return reply(state.progress ? [state.progress] : []);
    }
    const table = p.replace(/^\//, '');
    if (state.tables[table]) {
      const rows = state.tables[table];
      if (req.method() === 'POST') { const b = body(); const arr = (Array.isArray(b) ? b : [b]).map((r: any, i: number) => ({ id: `${table}-${rows.length + i + 1}`, user_id: UID, ...r })); rows.push(...arr); return json(201, single ? arr[0] : arr); }
      if (req.method() === 'PATCH') { const hit = matchFilters(rows, url); hit.forEach((r) => Object.assign(r, body())); return json(200, hit); }
      if (req.method() === 'DELETE') { const hit = matchFilters(rows, url); state.tables[table] = rows.filter((r) => !hit.includes(r)); return json(200, hit); }
      return reply(matchFilters(rows, url));
    }
    if (req.method() !== 'GET') return json(201, single ? {} : []);
    return json(200, single ? {} : []);
  });
}

export const noProdTraffic = (s: MockState) => [...s.hosts].filter((h) => h.endsWith('.supabase.co'));
