import { describe, expect, it } from 'vitest';
import { renderPublicSiteHtml, renderSitemapXml } from './prerender';
import { defaultConfig, type SiteData } from './model';

const baseData: SiteData = {
  id: 'est-1',
  slug: 'corte-fino',
  name: 'Corte Fino',
  kind: 'barber',
  region: 'BR',
  demo: false,
  logo: '/presenca/demo-logo-barber.svg',
  cover: '/presenca/rhian/barber-hero.webp',
  address: 'Rua Fradique Coutinho, 420 — Pinheiros, São Paulo',
  phone: '+55 (11) 3062-4190',
  hours: [{ day: 'Segunda', hours: '09:00–20:00' }],
  services: [
    {
      id: 'srv-1',
      name: 'Corte masculino',
      description: 'Corte com tesoura e máquina.',
      includes: [],
      duration: 30,
      price: 45,
      image: '/demo/barbearia/servico-corte-masculino.webp',
    },
  ],
  team: [{ id: 'pro-1', name: 'Rafael' }],
  gallery: [],
  reviews: [],
  reviewCount: 0,
};

describe('prerender SEO HTML & sitemap', () => {
  it('renders static SEO HTML with canonical /s/:slug, OG tags, JSON-LD and no AgendiX branding', () => {
    const html = renderPublicSiteHtml({
      data: baseData,
      config: defaultConfig(baseData),
      origin: 'https://www.agendixstudio.com',
    });

    expect(html).toContain('<link rel="canonical" href="https://www.agendixstudio.com/s/corte-fino">');
    expect(html).toContain('<meta property="og:title" content="Corte Fino — Barbearia em Pinheiros, São Paulo">');
    expect(html).toContain('<meta property="og:url" content="https://www.agendixstudio.com/s/corte-fino">');
    expect(html).toContain('<meta property="og:site_name" content="Corte Fino">');
    expect(html).toContain('<meta property="og:image" content="https://www.agendixstudio.com/presenca/rhian/barber-hero.webp">');
    expect(html).toContain('<script type="application/ld+json">');
    expect(html).toContain('<script defer src="https://www.agendixstudio.com/presenca/site-boot.js" data-site-target="/#/site/corte-fino"></script>');
    expect(html.replace(/https?:\/\/\S+/g, '').toLowerCase()).not.toContain('agendix');
  });

  it('renders service detail HTML and valid XML sitemap', () => {
    const html = renderPublicSiteHtml({
      data: baseData,
      config: defaultConfig(baseData),
      origin: 'https://www.agendixstudio.com',
      serviceId: 'srv-1',
    });
    expect(html).toContain('<link rel="canonical" href="https://www.agendixstudio.com/s/corte-fino/servico/srv-1">');
    expect(html).toContain('<title>Corte masculino — Corte Fino</title>');

    const xml = renderSitemapXml(
      [{ slug: 'corte-fino', updated_at: '2026-11-25T18:00:00Z' }],
      'https://www.agendixstudio.com',
    );
    expect(xml).toContain('<loc>https://www.agendixstudio.com/s/corte-fino</loc>');
    expect(xml).toContain('<lastmod>2026-11-25</lastmod>');
  });
});
