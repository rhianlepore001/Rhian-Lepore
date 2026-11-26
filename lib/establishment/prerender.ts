import {
  applyNormalizedSiteConfig,
  buildSeo,
  defaultConfig,
  formatPrice,
  normalizeSiteConfig,
  safeImageUrl,
  serializeJsonLd,
  type SiteConfig,
  type SiteData,
} from './model';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function absoluteAssetUrl(origin: string, value?: string): string | undefined {
  const safe = safeImageUrl(value);
  if (!safe) return undefined;
  try {
    return new URL(safe, origin).href;
  } catch {
    return undefined;
  }
}

export function renderPublicSiteHtml(params: {
  data: SiteData;
  config: SiteConfig;
  origin: string;
  serviceId?: string;
}): string {
  const root = new URL(params.origin).origin;
  const normalized = normalizeSiteConfig(params.config, defaultConfig(params.data));
  const data = applyNormalizedSiteConfig(params.data, normalized);
  const seo = buildSeo(data, normalized, root);
  const selectedService = params.serviceId
    ? data.services.find(item => item.id === params.serviceId)
    : undefined;

  const title = selectedService ? `${selectedService.name} — ${data.name}` : seo.title;
  const description = selectedService?.description?.trim() || seo.description;
  const slugEncoded = encodeURIComponent(data.slug);
  const canonical = selectedService
    ? `${root}/s/${slugEncoded}/servico/${encodeURIComponent(selectedService.id)}`
    : `${root}/s/${slugEncoded}`;
  const hashTarget = selectedService
    ? `/#/site/${slugEncoded}/servico/${encodeURIComponent(selectedService.id)}`
    : `/#/site/${slugEncoded}`;

  const rawOgImage =
    selectedService?.image ||
    (!normalized.coverRemoved ? normalized.cover || data.cover : undefined) ||
    (!normalized.logoRemoved ? normalized.logo || data.logo : undefined);
  const ogImage = absoluteAssetUrl(root, rawOgImage);

  const lang = data.region === 'PT' ? 'pt-PT' : 'pt-BR';
  const serviceSummary = data.services
    .slice(0, 12)
    .map(
      item =>
        `<li><strong>${escapeHtml(item.name)}</strong> — ${escapeHtml(formatPrice(item.price, data.region))} (${item.duration} min)</li>`,
    )
    .join('');

  return [
    '<!DOCTYPE html>',
    `<html lang="${lang}">`,
    '<head>',
    '  <meta charset="UTF-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
    `  <title>${escapeHtml(title)}</title>`,
    `  <meta name="description" content="${escapeHtml(description)}">`,
    `  <link rel="canonical" href="${escapeHtml(canonical)}">`,
    `  <meta property="og:title" content="${escapeHtml(title)}">`,
    `  <meta property="og:description" content="${escapeHtml(description)}">`,
    `  <meta property="og:url" content="${escapeHtml(canonical)}">`,
    '  <meta property="og:type" content="website">',
    `  <meta property="og:site_name" content="${escapeHtml(data.name)}">`,
    ogImage ? `  <meta property="og:image" content="${escapeHtml(ogImage)}">` : '',
    '  <meta name="twitter:card" content="summary_large_image">',
    `  <meta name="twitter:title" content="${escapeHtml(title)}">`,
    `  <meta name="twitter:description" content="${escapeHtml(description)}">`,
    ogImage ? `  <meta name="twitter:image" content="${escapeHtml(ogImage)}">` : '',
    data.demo ? '  <meta name="robots" content="noindex, nofollow">' : '',
    `  <script type="application/ld+json">${serializeJsonLd(seo.jsonLd)}</script>`,
    `  <script defer src="${escapeHtml(`${root}/presenca/site-boot.js`)}" data-site-target="${escapeHtml(hashTarget)}"></script>`,
    '</head>',
    '<body>',
    '  <main>',
    `    <h1>${escapeHtml(selectedService ? selectedService.name : normalized.headline || data.name)}</h1>`,
    `    <p>${escapeHtml(description)}</p>`,
    data.address ? `    <p>${escapeHtml(data.address)}</p>` : '',
    serviceSummary ? `    <ul>${serviceSummary}</ul>` : '',
    `    <p><a href="${escapeHtml(`${root}${hashTarget}`)}">${escapeHtml(normalized.ctaLabel || 'Agendar agora')}</a></p>`,
    '  </main>',
    '</body>',
    '</html>',
  ]
    .filter(Boolean)
    .join('\n');
}

export function renderSitemapXml(
  entries: Array<{ slug: string; updated_at?: string }>,
  origin: string,
): string {
  const root = new URL(origin).origin;
  const urls = entries
    .filter(entry => entry.slug.trim())
    .map(entry => {
      const loc = `${root}/s/${encodeURIComponent(entry.slug.trim())}`;
      const lastmod = entry.updated_at ? `<lastmod>${escapeHtml(entry.updated_at.slice(0, 10))}</lastmod>` : '';
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
