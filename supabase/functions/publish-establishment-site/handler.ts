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
      /^\/storage\/v1\/object\/public\/(logos|covers|service_images|team_photos|galleries|membership_plan_photos)\/[^?#]+$/i.test(
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
    `    <h1>${escapeHtml(params.service ? params.service.name : params.headline || params.name)}</h1>`,
    `    <p>${escapeHtml(params.description)}</p>`,
    params.address ? `    <p>${escapeHtml(params.address)}</p>` : '',
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
    const effectivePhone =
      typeof cfgContact.phone === 'string' && cfgContact.phone.trim() ? cfgContact.phone.trim() : site.phone;
    const effectiveInstagram =
      normalizeInstagramHandle(cfgContact.instagram) || normalizeInstagramHandle(site.instagram);
    const headline = typeof cfg.headline === 'string' && cfg.headline.trim() ? cfg.headline.trim() : site.name;
    const kindLabel = site.kind === 'beauty' ? 'Salão de beleza' : site.kind === 'studio' ? 'Estúdio' : 'Barbearia';
    const title =
      typeof cfg.seoTitle === 'string' && cfg.seoTitle.trim()
        ? cfg.seoTitle.trim()
        : `${site.name} — ${kindLabel}`;
    const headlineWithDot = headline ? (/[.!?…]$/.test(headline) ? headline : `${headline}.`) : '';
    const description =
      typeof cfg.seoDescription === 'string' && cfg.seoDescription.trim()
        ? cfg.seoDescription.trim()
        : `${headlineWithDot} Agende seu horário online em ${site.name}.`.trim();
    const ctaLabel =
      typeof cfg.ctaLabel === 'string' && cfg.ctaLabel.trim() ? cfg.ctaLabel.trim() : 'Agendar agora';
    const coverRemoved = cfg.coverRemoved === true;
    const logoRemoved = cfg.logoRemoved === true;
    const ogImage =
      (!coverRemoved ? safeAsset(cfg.cover ?? site.cover, origin) : undefined) ||
      (!logoRemoved ? safeAsset(cfg.logo ?? site.logo, origin) : undefined);
    const logo = !logoRemoved ? safeAsset(cfg.logo ?? site.logo, origin) : undefined;

    const homeHtml = renderHtmlPage({
      origin,
      slug: slugLower,
      name: site.name,
      kind: site.kind,
      region: site.region,
      address: site.address,
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
      const serviceHtml = renderHtmlPage({
        origin,
        slug: slugLower,
        name: site.name,
        kind: site.kind,
        region: site.region,
        address: site.address,
        phone: effectivePhone,
        instagram: effectiveInstagram,
        headline,
        title: `${service.name} — ${site.name}`,
        description: service.description?.trim() || description,
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
