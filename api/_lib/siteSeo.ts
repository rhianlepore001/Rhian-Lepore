import { isReservedSiteSlug } from '../../lib/establishment/model.js';

export const PROJECT_SUPABASE_ORIGIN = 'https://lcqwrngscsziysyfhpfj.supabase.co';

const BUCKET_PUBLIC_PREFIX = '/storage/v1/object/public/published-sites/';

const EMPTY_SITEMAP_XML = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  '</urlset>',
].join('\n');

export interface VercelSiteSeoDeps {
  readPublishedFile: (path: string) => Promise<string | null>;
}

export function resolveSupabaseOrigin(configuredUrl?: string): string {
  const raw = (configuredUrl || '').trim();
  if (!raw) return PROJECT_SUPABASE_ORIGIN;
  try {
    const parsed = new URL(raw);
    if (
      parsed.protocol === 'https:' &&
      parsed.hostname.toLowerCase() === 'lcqwrngscsziysyfhpfj.supabase.co' &&
      !parsed.username &&
      !parsed.password
    ) {
      return parsed.origin;
    }
  } catch {
    return PROJECT_SUPABASE_ORIGIN;
  }
  return PROJECT_SUPABASE_ORIGIN;
}

export function publishedStorageUrl(supabaseOrigin: string, storagePath: string): string {
  const cleanPath = storagePath
    .split('/')
    .filter(Boolean)
    .map(segment => encodeURIComponent(segment))
    .join('/');
  return `${supabaseOrigin}${BUCKET_PUBLIC_PREFIX}${cleanPath}`;
}

export function createVercelSiteSeoHandler(deps: VercelSiteSeoDeps) {
  return async (request: Request): Promise<Response> => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method Not Allowed', {
        status: 405,
        headers: { Allow: 'GET, HEAD' },
      });
    }

    const url = new URL(request.url);
    const kind = (url.searchParams.get('kind') || '').trim().toLowerCase();
    const pathname = url.pathname.replace(/\/+$/, '') || '/';

    if (kind === 'sitemap' || pathname.endsWith('/sitemap.xml')) {
      const xml = (await deps.readPublishedFile('sitemap.xml')) || EMPTY_SITEMAP_XML;
      return new Response(request.method === 'HEAD' ? null : xml, {
        status: 200,
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }

    let rawSlug = url.searchParams.get('slug') || '';
    let rawServiceId = url.searchParams.get('serviceId') || '';

    if (!rawSlug) {
      const serviceMatch = pathname.match(/\/s\/([^/]+)\/servico\/([^/]+)$/i);
      const homeMatch = pathname.match(/\/s\/([^/]+)$/i);
      rawSlug = serviceMatch?.[1] || homeMatch?.[1] || '';
      rawServiceId = serviceMatch?.[2] || '';
    }

    let decodedSlug = rawSlug;
    let decodedServiceId = rawServiceId;
    try {
      decodedSlug = decodeURIComponent(rawSlug).trim().toLowerCase();
      decodedServiceId = rawServiceId ? decodeURIComponent(rawServiceId).trim() : '';
    } catch {
      return new Response('Not Found', {
        status: 404,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    if (!/^[a-z0-9][a-z0-9_-]{0,99}$/.test(decodedSlug) || isReservedSiteSlug(decodedSlug)) {
      return new Response('Not Found', {
        status: 404,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    if (kind === 'service' && !decodedServiceId) {
      return new Response('Not Found', {
        status: 404,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    if (decodedServiceId && !/^[a-z0-9_-]{1,120}$/i.test(decodedServiceId)) {
      return new Response('Not Found', {
        status: 404,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const storagePath = decodedServiceId
      ? `sites/${decodedSlug}/servico/${decodedServiceId}.html`
      : `sites/${decodedSlug}.html`;

    const html = await deps.readPublishedFile(storagePath);
    if (!html) {
      const origem = (url.searchParams.get('origem') || '').trim();
      const location = /^[a-z0-9_-]{1,40}$/i.test(origem)
        ? `/#/book/${encodeURIComponent(decodedSlug)}?origem=${encodeURIComponent(origem)}`
        : `/#/book/${encodeURIComponent(decodedSlug)}`;
      return new Response(null, {
        status: 302,
        headers: {
          Location: location,
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
        },
      });
    }

    return new Response(request.method === 'HEAD' ? null : html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
        'Content-Security-Policy':
          "default-src 'none'; script-src 'self' https://www.agendixstudio.com; img-src https: data:; base-uri 'none'; object-src 'none'; frame-ancestors 'self'",
      },
    });
  };
}
