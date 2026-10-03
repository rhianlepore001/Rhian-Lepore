import type { Page, Route } from '@playwright/test';

/**
 * Bloqueia toda escrita no Supabase (prod) durante o teste.
 * - Qualquer método != GET/HEAD/OPTIONS em /rest/v1, /functions/v1, /storage/v1,
 *   /realtime e /graphql é interceptado: responde com o stub registrado ou é abortado.
 * - Única exceção: POST /auth/v1/token (login). Logout/refresh-revoke também é bloqueado.
 * - `assertNoLeak()` falha se algum write chegou a passar.
 */
export type StubBody = { status?: number; body?: unknown; headers?: Record<string, string> };
export type StubFn = (route: Route, payload: unknown) => StubBody | Promise<StubBody>;

export interface ProdWriteGuard {
  stubRpc: (name: string, stub: StubBody | StubFn) => void;
  stubTable: (table: string, stub: StubBody | StubFn) => void;
  blocked: { method: string; url: string; stubbed: boolean }[];
  leaked: { method: string; url: string }[];
  assertNoLeak: () => void;
}

const SUPABASE_HOST = /\.supabase\.co$/;
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export async function installProdWriteGuard(page: Page): Promise<ProdWriteGuard> {
  const rpcStubs = new Map<string, StubBody | StubFn>();
  const tableStubs = new Map<string, StubBody | StubFn>();
  const guard: ProdWriteGuard = {
    stubRpc: (name, stub) => rpcStubs.set(name, stub),
    stubTable: (table, stub) => tableStubs.set(table, stub),
    blocked: [],
    leaked: [],
    assertNoLeak: () => {
      if (guard.leaked.length > 0) {
        throw new Error(`Escrita em prod vazou: ${JSON.stringify(guard.leaked)}`);
      }
    },
  };

  page.on('requestfinished', (request) => {
    const url = new URL(request.url());
    if (!SUPABASE_HOST.test(url.hostname) || SAFE_METHODS.has(request.method())) return;
    if (url.pathname === '/auth/v1/token') return;
    const intercepted = guard.blocked.some((b) => b.url === request.url() && b.method === request.method());
    if (!intercepted) guard.leaked.push({ method: request.method(), url: request.url() });
  });

  await page.route(/\.supabase\.co\//, async (route) => {
    const request = route.request();
    const method = request.method();
    const url = new URL(request.url());
    if (SAFE_METHODS.has(method) || url.pathname === '/auth/v1/token') {
      await route.continue();
      return;
    }

    let payload: unknown = null;
    try { payload = request.postDataJSON(); } catch { payload = request.postData(); }

    const rpcMatch = url.pathname.match(/^\/rest\/v1\/rpc\/([^/?]+)/);
    const tableMatch = !rpcMatch ? url.pathname.match(/^\/rest\/v1\/([^/?]+)/) : null;
    const stub = rpcMatch ? rpcStubs.get(rpcMatch[1]) : tableMatch ? tableStubs.get(tableMatch[1]) : undefined;
    guard.blocked.push({ method, url: request.url(), stubbed: !!stub });

    if (!stub) {
      await route.abort('blockedbyclient');
      return;
    }
    const resolved = typeof stub === 'function' ? await stub(route, payload) : stub;
    const status = resolved.status ?? 200;
    await route.fulfill({
      status,
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*', ...(resolved.headers ?? {}) },
      body: status === 204 ? '' : JSON.stringify(resolved.body ?? null),
    });
  });

  return guard;
}
