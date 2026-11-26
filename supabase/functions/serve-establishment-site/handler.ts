const RESERVED_SLUGS = new Set([
  'admin', 'app', 'www', 'blog', 'suporte', 'ajuda', 'status', 'cdn', 'static',
  'mail', 'sitemap', 'robots', 'login', 'register', 'landing', 'termos',
  'privacidade', 'agenda', 'dashboard', 'configuracoes', 'book', 'site',
  'site-preview', 'site-demo', 's', 'pro', 'clube', 'minha-area', 'queue',
  'queue-status', 'avaliar', 'demo', 'demo-preview', 'api', 'assets',
  'onboarding', 'onboarding-wizard', 'staff-onboarding', 'forgot-password',
  'update-password', 'fila', 'clientes', 'produtos', 'financeiro', 'insights',
  'meus-insights', 'resultados-por-hora', 'club-demo',
]);

export interface ServeSiteDeps {
  readPublishedFile: (path: string) => Promise<string | null>;
}

export function createServeEstablishmentSiteHandler(deps: ServeSiteDeps) {
  return async (request: Request): Promise<Response> => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/+$/, '') || '/';

    if (pathname.endsWith('/sitemap.xml')) {
      const xml =
        (await deps.readPublishedFile('sitemap.xml')) ||
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>';
      return new Response(request.method === 'HEAD' ? null : xml, {
        status: 200,
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'public, max-age=60, s-maxage=300',
        },
      });
    }

    const serviceMatch = pathname.match(/\/s\/([a-z0-9][a-z0-9_-]{0,99})\/servico\/([a-z0-9_-]{1,120})$/i);
    const homeMatch = pathname.match(/\/s\/([a-z0-9][a-z0-9_-]{0,99})$/i);
    const slug = (serviceMatch?.[1] || homeMatch?.[1] || '').trim();
    const serviceId = serviceMatch?.[2]?.trim();

    if (!slug || RESERVED_SLUGS.has(slug.toLowerCase())) {
      return new Response('Not Found', { status: 404 });
    }

    const storagePath = serviceId
      ? `sites/${slug}/servico/${encodeURIComponent(serviceId)}.html`
      : `sites/${slug}.html`;
    const html = await deps.readPublishedFile(storagePath);
    if (!html) {
      return new Response('Not Found', { status: 404 });
    }

    return new Response(request.method === 'HEAD' ? null : html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Content-Security-Policy': "default-src 'none'; script-src 'self' https://www.agendixstudio.com; img-src https: data:; base-uri 'none'; object-src 'none'; frame-ancestors 'self'",
      },
    });
  };
}
