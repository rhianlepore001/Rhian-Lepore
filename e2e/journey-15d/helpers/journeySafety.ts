import type { BrowserContext, Route } from '@playwright/test';

export function mockBaseUrl(raw = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000'): string {
  const url = new URL(raw);
  if (url.protocol !== 'http:' || !['localhost', '127.0.0.1'].includes(url.hostname) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('Journey mock exige E2E_BASE_URL http em localhost ou 127.0.0.1, sem caminho ou credenciais');
  }
  return url.origin;
}

export function assertLiveTarget(env: NodeJS.ProcessEnv = process.env) {
  const targets = [env.E2E_BASE_URL, env.VITE_SUPABASE_URL, env.E2E_SUPABASE_URL, env.SUPABASE_URL, env.E2E_SUPABASE_REF];
  for (const target of targets) {
    if (!target) continue;
    if (/lcqwrngscsziysyfhpfj/i.test(target)) throw new Error('Journey live recusada: destino de produção detectado');
    if (!target.includes('://')) continue;
    const hostname = new URL(target).hostname.toLowerCase().replace(/\.$/, '');
    if (hostname === 'agendixstudio.com' || hostname.endsWith('.agendixstudio.com')) {
      throw new Error('Journey live recusada: destino de produção detectado');
    }
  }
  if (!env.E2E_BASE_URL || !env.VITE_SUPABASE_URL) throw new Error('Journey live exige destinos explícitos E2E_BASE_URL e VITE_SUPABASE_URL de staging');
}

export async function isolateNetwork(context: BrowserContext, base: string) {
  const blocked = new Set<string>();
  const origin = mockBaseUrl(base);
  const host = new URL(origin).host;
  const allowed = (raw: string) => {
    const url = new URL(raw);
    return ['http:', 'ws:'].includes(url.protocol) && url.host === host;
  };
  const refuse = async (route: Route, url: string) => {
    blocked.add(url);
    await route.abort('blockedbyclient');
  };
  const guard = async (route: Route) => {
    const url = route.request().url();
    if (!allowed(url)) return refuse(route, url);
    await route.fallback();
  };
  await context.route('**/*', async (route) => {
    let url = route.request().url();
    for (let redirect = 0; redirect <= 20; redirect++) {
      if (!allowed(url)) return refuse(route, url);
      const response = await route.fetch({ url, maxRedirects: 0 });
      const location = response.headers()['location'];
      if (response.status() >= 300 && response.status() < 400 && location) {
        url = new URL(location, url).href;
        await response.dispose();
        continue;
      }
      try {
        if (route.request().resourceType() === 'document' && response.headers()['content-type']?.includes('text/html')) {
          const html = (await response.text()).replace(/<link\b[^>]*https:\/\/fonts\.[^>]*>/gs, '');
          await route.fulfill({ response, body: html });
        } else {
          await route.fulfill({ response });
        }
      } finally {
        await response.dispose();
      }
      return;
    }
    throw new Error(`Excesso de redirects locais: ${url}`);
  });
  await context.routeWebSocket('**/*', (socket) => {
    if (!allowed(socket.url())) {
      blocked.add(socket.url());
      socket.close();
    } else if (new URL(socket.url()).pathname.includes('/realtime/')) {
      socket.close();
    } else {
      socket.connectToServer();
    }
  });
  context.on('request', (request) => {
    if (!allowed(request.url())) blocked.add(request.url());
  });
  return {
    guard,
    assertClean() {
      if (blocked.size) throw new Error(`Tentativa de rede externa bloqueada:\n${[...blocked].join('\n')}`);
    },
  };
}
