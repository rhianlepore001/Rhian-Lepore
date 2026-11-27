export interface PrerenderServiceItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  duration: number;
  image?: string;
}

export interface PublishSiteDeps {
  getUserFromToken: (token: string) => Promise<{ id: string } | null>;
  getOwnerSiteByUser: (userId: string) => Promise<{
    companyId: string;
    role: string;
    slug: string | null;
    name: string;
    kind: string;
    region: 'BR' | 'PT';
    address: string;
    phone?: string;
    instagram?: string;
    logo?: string;
    cover?: string;
    presenceEnabled: boolean;
    published: boolean;
    publishedConfig: Record<string, unknown> | null;
    services: PrerenderServiceItem[];
  } | null>;
  listPublishedSlugs: () => Promise<Array<{ slug: string; updated_at?: string }>>;
  uploadPublishedFile: (path: string, content: string, contentType: string) => Promise<void>;
  removePublishedPrefix: (prefix: string) => Promise<void>;
  siteOrigin: string;
}

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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function serializeJsonLd(value: Record<string, unknown>): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function normalizeInstagramHandle(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const clean = value.trim().replace(/^@/, '').replace(/[^a-z0-9._]/gi, '');
  return clean || undefined;
}

function hasControlChars(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 31 || code === 127) return true;
  }
  return false;
}

function plainText(value: unknown, limit: number): string {
  if (typeof value !== 'string') return '';
  return Array.from(value.replace(/<[^>]*>/g, ''))
    .map(char => {
      const code = char.charCodeAt(0);
      return code <= 31 || code === 127 ? ' ' : char;
    })
    .join('')
    .trim()
    .slice(0, limit);
}

const GOOGLE_MAPS_HOSTS = new Set(['www.google.com', 'google.com', 'www.google.com.br', 'google.com.br', 'www.google.pt', 'google.pt']);

function safeMapsUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const raw = value.trim();
  if (!raw || raw.length > 500 || hasControlChars(raw) || /[\s\u200B\uFEFF<>"'`\\]/.test(raw)) return undefined;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return undefined;
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return undefined;
  const host = url.hostname.toLowerCase();
  let allowed = false;
  if (GOOGLE_MAPS_HOSTS.has(host)) allowed = /^\/maps(\/|$)/.test(url.pathname);
  else if (host === 'maps.google.com') allowed = true;
  else if (host === 'maps.app.goo.gl') allowed = /^\/[^/]+/.test(url.pathname);
  else if (host === 'goo.gl') allowed = /^\/maps\/[^/]+/.test(url.pathname);
  return allowed && url.href.length <= 500 ? url.href : undefined;
}

function safeCoordinates(lat: unknown, lng: unknown): { lat: number; lng: number } | undefined {
  if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return undefined;
  const round = (value: number) => Math.round(value * 1e6) / 1e6;
  const result = { lat: round(lat), lng: round(lng) };
  return result.lat === 0 && result.lng === 0 ? undefined : result;
}

function directionsLink(params: { name: string; address: string; mapsUrl?: string; lat?: number; lng?: number }): string | undefined {
  const url = safeMapsUrl(params.mapsUrl);
  if (url) return url;
  const coords = safeCoordinates(params.lat, params.lng);
  if (coords) return `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`;
  const address = params.address.trim();
  if (!address) return undefined;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${params.name.trim()} ${address}`.trim())}`;
}

function safeAsset(value: unknown, origin: string): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed.includes('..') || trimmed.includes('\\') || /%2e|%5c/i.test(trimmed)) return undefined;
  if (/^\/(demo|presenca)\/[A-Za-z0-9._/-]+$/.test(trimmed)) return `${origin}${trimmed}`;
  try {
    const parsed = new URL(trimmed);
    if (
      parsed.protocol === 'https:' &&
      !parsed.username &&
      !parsed.password &&
      parsed.hostname.toLowerCase() === 'lcqwrngscsziysyfhpfj.supabase.co' &&
      /^\/storage\/v1\/object\/public\/(avatars|logos|covers|service_images|team_photos|galleries|membership_plan_photos)\/[^?#]+$/i.test(
        parsed.pathname,
      )
    ) {
      return parsed.href;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function renderHtmlPage(params: {
  origin: string;
  slug: string;
  name: string;
  kind: string;
  region: 'BR' | 'PT';
  address: string;
  addressNote?: string;
  mapsLink?: string;
  lat?: number;
  lng?: number;
  phone?: string;
  instagram?: string;
  headline: string;
  title: string;
  description: string;
  ctaLabel: string;
  ogImage?: string;
  logo?: string;
  services: PrerenderServiceItem[];
  service?: PrerenderServiceItem;
}): string {
  const slugEncoded = encodeURIComponent(params.slug);
  const canonical = params.service
    ? `${params.origin}/s/${slugEncoded}/servico/${encodeURIComponent(params.service.id)}`
    : `${params.origin}/s/${slugEncoded}`;
  const hashTarget = params.service
    ? `/#/site/${slugEncoded}/servico/${encodeURIComponent(params.service.id)}`
    : `/#/site/${slugEncoded}`;
  const cleanInstagram = normalizeInstagramHandle(params.instagram);
  const geo = safeCoordinates(params.lat, params.lng);
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': params.kind === 'studio' ? 'LocalBusiness' : 'HairSalon',
    name: params.name,
    url: `${params.origin}/s/${slugEncoded}`,
    description: params.description,
    ...(params.ogImage ? { image: params.ogImage } : {}),
    ...(params.logo ? { logo: params.logo } : {}),
    ...(params.phone ? { telephone: params.phone } : {}),
    ...(cleanInstagram ? { sameAs: [`https://www.instagram.com/${cleanInstagram}/`] } : {}),
    ...(params.address
      ? { address: { '@type': 'PostalAddress', streetAddress: params.address, addressCountry: params.region } }
      : {}),
    ...(params.mapsLink ? { hasMap: params.mapsLink } : {}),
    ...(geo ? { geo: { '@type': 'GeoCoordinates', latitude: geo.lat, longitude: geo.lng } } : {}),
  };

  return [
    '<!DOCTYPE html>',
    `<html lang="${params.region === 'PT' ? 'pt-PT' : 'pt-BR'}">`,
    '<head>',
    '  <meta charset="UTF-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
    `  <title>${escapeHtml(params.title)}</title>`,
    `  <meta name="description" content="${escapeHtml(params.description)}">`,
    `  <link rel="canonical" href="${escapeHtml(canonical)}">`,
    `  <meta property="og:title" content="${escapeHtml(params.title)}">`,
    `  <meta property="og:description" content="${escapeHtml(params.description)}">`,
    `  <meta property="og:url" content="${escapeHtml(canonical)}">`,
    '  <meta property="og:type" content="website">',
    `  <meta property="og:site_name" content="${escapeHtml(params.name)}">`,
    params.ogImage ? `  <meta property="og:image" content="${escapeHtml(params.ogImage)}">` : '',
    '  <meta name="twitter:card" content="summary_large_image">',
    `  <meta name="twitter:title" content="${escapeHtml(params.title)}">`,
    `  <meta name="twitter:description" content="${escapeHtml(params.description)}">`,
    params.ogImage ? `  <meta name="twitter:image" content="${escapeHtml(params.ogImage)}">` : '',
    `  <script type="application/ld+json">${serializeJsonLd(jsonLd)}</script>`,
    `  <script defer src="${escapeHtml(`${params.origin}/presenca/site-boot.js`)}" data-site-target="${escapeHtml(hashTarget)}"></script>`,
    '</head>',
    '<body>',
    '  <main>',
    `    <h1>${escapeHtml(params.service ? plainText(params.service.name, 120) : params.headline || params.name)}</h1>`,
    `    <p>${escapeHtml(params.description)}</p>`,
    params.address ? `    <p>${escapeHtml(params.address)}</p>` : '',
    params.addressNote ? `    <p>Ponto de referência: ${escapeHtml(params.addressNote)}</p>` : '',
    params.mapsLink ? `    <p><a href="${escapeHtml(params.mapsLink)}" rel="noreferrer">Como chegar</a></p>` : '',
    cleanInstagram
      ? `    <p>Instagram: <a href="https://www.instagram.com/${escapeHtml(cleanInstagram)}/" rel="noreferrer">@${escapeHtml(cleanInstagram)}</a></p>`
      : '',
    `    <p><a href="${escapeHtml(`${params.origin}${hashTarget}`)}">${escapeHtml(params.ctaLabel)}</a></p>`,
    '  </main>',
    '</body>',
    '</html>',
  ]
    .filter(Boolean)
    .join('\n');
}

function renderSitemap(entries: Array<{ slug: string; updated_at?: string }>, origin: string): string {
  const urls = entries
    .filter(item => item.slug && !RESERVED_SLUGS.has(item.slug.toLowerCase()))
    .map(item => {
      const loc = `${origin}/s/${encodeURIComponent(item.slug)}`;
      const lastmod = item.updated_at ? `<lastmod>${escapeHtml(item.updated_at.slice(0, 10))}</lastmod>` : '';
      return `  <url><loc>${escapeHtml(loc)}</loc>${lastmod}</url>`;
    })
    .join('\n');
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    '</urlset>',
  ]
    .filter(Boolean)
    .join('\n');
}

export function createPublishEstablishmentSiteHandler(deps: PublishSiteDeps) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': new URL(deps.siteOrigin).origin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
  const json = (body: unknown, status = 200) => Response.json(body, { status, headers: corsHeaders });

  return async (request: Request): Promise<Response> => {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    if (request.method !== 'POST') {
      return json({ error: 'method_not_allowed' }, 405);
    }

    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      return json({ error: 'unauthorized' }, 401);
    }

    const user = await deps.getUserFromToken(token);
    if (!user) {
      return json({ error: 'unauthorized' }, 401);
    }

    const site = await deps.getOwnerSiteByUser(user.id);
    if (!site || site.role !== 'owner' || site.companyId !== user.id) {
      return json({ error: 'forbidden' }, 403);
    }
    const normalizedSlug = (site.slug || '').trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9_-]{0,99}$/.test(normalizedSlug) || RESERVED_SLUGS.has(normalizedSlug)) {
      return json({ error: 'invalid_slug' }, 400);
    }
    site.slug = normalizedSlug;

    let action: 'publish' | 'unpublish' = 'publish';
    try {
      const body = (await request.json()) as { action?: string };
      if (body?.action === 'unpublish') action = 'unpublish';
    } catch {
      action = 'publish';
    }

    const origin = new URL(deps.siteOrigin).origin;
    const slugLower = site.slug;

    if (action === 'unpublish' || !site.published || !site.presenceEnabled) {
      await deps.removePublishedPrefix(`sites/${slugLower}`);
      const slugs = await deps.listPublishedSlugs();
      await deps.uploadPublishedFile('sitemap.xml', renderSitemap(slugs, origin), 'application/xml; charset=utf-8');
      return json({ ok: true, published: false });
    }

    const cfg = site.publishedConfig || {};
    const cfgContact =
      cfg.contact && typeof cfg.contact === 'object' && !Array.isArray(cfg.contact)
        ? (cfg.contact as Record<string, unknown>)
        : {};
    const effectivePhone = plainText(cfgContact.phone, 40) || plainText(site.phone, 40);
    const effectiveInstagram =
      normalizeInstagramHandle(cfgContact.instagram) || normalizeInstagramHandle(site.instagram);
    const hasExplicitAddress = typeof cfgContact.address === 'string';
    const cfgAddress = plainText(cfgContact.address, 300);
    const effectiveAddress = (hasExplicitAddress ? cfgAddress : plainText(site.address, 300)) || '';
    const addressNote = plainText(cfgContact.addressNote, 300) || undefined;
    const coords = safeCoordinates(cfgContact.lat, cfgContact.lng);
    const safeSiteName = plainText(site.name, 140);
    const mapsLink = directionsLink({
      name: safeSiteName,
      address: effectiveAddress,
      mapsUrl: typeof cfgContact.mapsUrl === 'string' ? cfgContact.mapsUrl : undefined,
      lat: coords?.lat,
      lng: coords?.lng,
    });
    const headline = plainText(cfg.headline, 180) || safeSiteName;
    const kindLabel = site.kind === 'beauty' ? 'Salão de beleza' : site.kind === 'studio' ? 'Estúdio' : 'Barbearia';
    const title = plainText(cfg.seoTitle, 140) || `${safeSiteName} — ${kindLabel}`;
    const headlineWithDot = headline ? (/[.!?…]$/.test(headline) ? headline : `${headline}.`) : '';
    const description =
      plainText(cfg.seoDescription, 280) ||
      `${headlineWithDot} Agende seu horário online em ${safeSiteName}.`.trim();
    const ctaLabel = plainText(cfg.ctaLabel, 60) || 'Agendar agora';
    const coverRemoved = cfg.coverRemoved === true;
    const logoRemoved = cfg.logoRemoved === true;
    const ogImage =
      (!coverRemoved ? safeAsset(cfg.cover ?? site.cover, origin) : undefined) ||
      (!logoRemoved ? safeAsset(cfg.logo ?? site.logo, origin) : undefined);
    const logo = !logoRemoved ? safeAsset(cfg.logo ?? site.logo, origin) : undefined;

    const homeHtml = renderHtmlPage({
      origin,
      slug: slugLower,
      name: safeSiteName,
      kind: site.kind,
      region: site.region,
      address: effectiveAddress,
      addressNote,
      mapsLink,
      lat: coords?.lat,
      lng: coords?.lng,
      phone: effectivePhone,
      instagram: effectiveInstagram,
      headline,
      title,
      description,
      ctaLabel,
      ogImage,
      logo,
      services: site.services,
    });
    await deps.uploadPublishedFile(`sites/${slugLower}.html`, homeHtml, 'text/html; charset=utf-8');

    for (const service of site.services.filter(item => /^[a-z0-9_-]{1,120}$/i.test(item.id)).slice(0, 60)) {
      const safeServiceName = plainText(service.name, 120);
      const serviceHtml = renderHtmlPage({
        origin,
        slug: slugLower,
        name: safeSiteName,
        kind: site.kind,
        region: site.region,
        address: effectiveAddress,
        addressNote,
        mapsLink,
        lat: coords?.lat,
        lng: coords?.lng,
        phone: effectivePhone,
        instagram: effectiveInstagram,
        headline,
        title: `${safeServiceName} — ${safeSiteName}`,
        description: plainText(service.description, 280) || description,
        ctaLabel,
        ogImage: safeAsset(service.image, origin) || ogImage,
        logo,
        services: site.services,
        service,
      });
      await deps.uploadPublishedFile(
        `sites/${slugLower}/servico/${encodeURIComponent(service.id)}.html`,
        serviceHtml,
        'text/html; charset=utf-8',
      );
    }

    const slugs = await deps.listPublishedSlugs();
    await deps.uploadPublishedFile('sitemap.xml', renderSitemap(slugs, origin), 'application/xml; charset=utf-8');

    return json({ ok: true, published: true, slug: slugLower });
  };
}
