import { describe, expect, it } from 'vitest';
import { accessibleAccent, applySiteConfig, buildSeo, contrastRatio, defaultConfig, formatPrice, neighborhoodFromAddress, normalizeSiteConfig, offerDisplay, photoObjectPosition, sanitizePublicData, serializeJsonLd, visibleSections, type SiteData } from './model';

const site: SiteData = { id: 'business', slug: 'navalha-fina', name: 'Navalha Fina', kind: 'barber', region: 'BR', demo: false, address: 'Rua dos Pinheiros, 100', hours: [], services: [{ id: 'cut', name: 'Corte', includes: [], duration: 30, price: 65 }], team: [], gallery: [], reviews: [], reviewCount: 0 };

describe('establishment defaults', () => {
  it('uses the registered identity without inventing a reputation or an offer', () => {
    const config = defaultConfig(site);
    expect(config.style).toBe('dark');
    expect(config.offer.enabled).toBe(false);
    expect(config.headline).toContain('Barbearia');
    expect(config.differences).toEqual([]);
    expect(defaultConfig({ ...site, kind: 'beauty', region: 'PT' }).style).toBe('light');
    expect(defaultConfig({ ...site, kind: 'studio' }).headline).toContain('Estúdio');
    expect(neighborhoodFromAddress('Rua Fradique Coutinho, 420 — Pinheiros, São Paulo')).toBe('Pinheiros');
    expect(defaultConfig({ ...site, address: 'Rua Fradique Coutinho, 420 — Pinheiros, São Paulo' }).headline).toMatch(/Barbearia em Pinheiros/);
  });
  it('hides empty sections and respects the owner order and toggles', () => {
    const config = defaultConfig(site);
    config.sections = [{ id: 'location', enabled: true }, { id: 'team', enabled: true }, { id: 'services', enabled: false }, { id: 'reviews', enabled: true }];
    expect(visibleSections(site, config).map(section => section.id)).toEqual(['location']);
    expect(visibleSections({ ...site, address: '' }, config)).toEqual([]);
  });
  it('does not show a photo-less team or empty reviews', () => {
    const data = { ...site, team: [{ id: 'a', name: 'Ana' }], reviews: [{ id: 'r', comment: '', rating: 5 }], reviewCount: 1 };
    expect(visibleSections(data, defaultConfig(data)).map(section => section.id)).not.toContain('team');
    expect(visibleSections({ ...data, team: [{ id: 'a', name: 'Ana' }, { id: 'b', name: 'Bea' }] }, defaultConfig(data)).map(section => section.id)).toContain('team');
    expect(visibleSections(data, defaultConfig(data)).map(section => section.id)).not.toContain('reviews');
  });
});

describe('brand contrast', () => {
  for (const style of ['dark', 'light'] as const) {
    for (const color of ['#ffffff', '#000000', '#ffdd00', '#ae6370', '#aaaaff', '#0000ff', 'invalid']) {
      it(`keeps the CTA legible for ${color} in ${style}`, () => {
        const pair = accessibleAccent(color, style);
        expect(contrastRatio(pair.background, pair.foreground)).toBeGreaterThanOrEqual(4.5);
        for (const surface of style === 'dark' ? ['#09090B', '#18181B', '#27272A'] : ['#FBF7F0', '#FDFBF7', '#FFFFFF']) expect(contrastRatio(pair.background, surface)).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
});

describe('public allowlist', () => {
  it('drops private fields, removed staff and unsafe image URLs', () => {
    const data = sanitizePublicData({
      profile: { id: 'a', business_slug: 'safe', business_name: 'Safe', phone: '+55 11 1111 1111', customer_email: 'secret@example.com', logo_url: 'javascript:alert(1)' },
      team: [{ id: 'a', name: 'Active', active: true, photo_url: 'https://example.com/a.jpg', phone: 'private' }, { id: 'b', name: 'Gone', active: false }, { id: 'c', name: 'Deleted', active: true, deleted_at: '2026-01-01' }],
      services: [{ id: 's', name: 'Corte', active: true, price: 0, duration_minutes: 30, image_url: 'data:text/html,no' }, { id: 'x', name: 'Inactive', active: false, price: 50, duration_minutes: 30 }],
      gallery: [{ image_url: 'https://example.com/real.jpg' }, { image_url: 'javascript:alert(1)' }],
      reviews: { average: 4.9, total: 2, reviews: [{ id: 'r', rating: 5, comment: 'Contato: teste@example.com, +55 (11) 99999-9999', name: 'Maria Sobrenome Completo', phone: 'secret' }] },
    });
    expect(data.team).toHaveLength(1);
    expect(data.team[0]).toEqual({ id: 'a', name: 'Active', bio: undefined, image: 'https://example.com/a.jpg' });
    expect(data.logo).toBeUndefined();
    expect(data.services).toHaveLength(1);
    expect(data.services[0].image).toBeUndefined();
    expect(data.gallery).toHaveLength(1);
    expect(data.reviews[0].name).toBeUndefined();
    expect(data.reviews[0].comment).not.toContain('teste@example.com');
    expect(data.reviews[0].comment).not.toContain('99999');
    expect(JSON.stringify(data)).not.toContain('secret');
  });
  it('reads the existing short weekday keys and multiple appointment blocks', () => {
    const data = sanitizePublicData({ profile: { id: 'a' }, settings: { business_hours: { mon: { isOpen: true, blocks: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '19:00' }] }, sun: { isOpen: false, blocks: [] } } } });
    expect(data.hours).toEqual([{ day: 'Segunda', hours: '09:00–12:00 / 14:00–19:00' }, { day: 'Domingo', hours: 'Fechado' }]);
  });
  it('handles missing fields and malformed data without fake content', () => {
    const data = sanitizePublicData({ profile: { id: 'x' } });
    expect(data.services).toEqual([]);
    expect(data.rating).toBeUndefined();
    expect(data.reviewCount).toBe(0);
    expect(data.hours).toEqual([]);
  });
});

describe('local SEO', () => {
  it('builds region-aware structured data without claiming Google ratings', () => {
    const data = { ...site, rating: 4.8, reviewCount: 3 };
    const seo = buildSeo(data, defaultConfig(data), 'https://example.com');
    expect(seo.url).toBe('https://example.com/#/site/navalha-fina');
    expect(seo.jsonLd['@type']).toBe('HairSalon');
    expect(seo.jsonLd.address).toEqual({ '@type': 'PostalAddress', streetAddress: site.address, addressCountry: 'BR' });
    expect(seo.jsonLd.aggregateRating).toBeUndefined();
    expect(JSON.stringify(seo.jsonLd)).toContain('Corte');
    expect(buildSeo({ ...site, kind: 'beauty' }, defaultConfig(site), 'https://example.com').jsonLd['@type']).toBe('HairSalon');
  });
  it('excludes demo reputation from structured data and safely serializes script text', () => {
    const data = { ...site, demo: true, name: '</script><script>alert(1)</script>', rating: 4.9, reviewCount: 312 };
    const seo = buildSeo(data, defaultConfig(data), 'https://example.com');
    expect(seo.jsonLd.aggregateRating).toBeUndefined();
    expect(serializeJsonLd(seo.jsonLd)).not.toContain('</script>');
  });
  it('keeps structured service and contact content aligned with published customizations', () => {
    const config = { ...defaultConfig(site), contact: { phone: '+55 11 1234 5678' }, serviceDetails: { cut: { description: 'Descrição publicada' } } };
    const seo = buildSeo(site, config, 'https://example.com');
    expect(seo.jsonLd.telephone).toBe('+55 11 1234 5678');
    expect(JSON.stringify(seo.jsonLd)).toContain('Descrição publicada');
    expect(seo.url).toBe('https://example.com/#/site/navalha-fina');
  });
  it('formats prices for Brazil and Portugal', () => {
    expect(formatPrice(65, 'BR')).toContain('65');
    expect(formatPrice(25, 'PT')).toContain('€');
  });
});


describe('photo art direction', () => {
  it('clamps the focal point and maps named presets to object-position', () => {
    expect(photoObjectPosition({ photoFocus: 'space' })).toBe('72% 42%');
    expect(photoObjectPosition({ photoFocus: 'work', photoPosition: { x: 70, y: 40 } })).toBe('70% 40%');
    const config = normalizeSiteConfig({ photoPosition: { x: 140, y: -8 } }, defaultConfig(site));
    expect(config.photoPosition).toEqual({ x: 100, y: 0 });
    expect(photoObjectPosition(config)).toBe('100% 0%');
  });
});

describe('offer copy', () => {
  it('keeps a distinct condition and drops one that repeats the title', () => {
    expect(offerDisplay({
      title: 'Tratamento nutritivo de oferta na primeira visita de corte ou cor',
      condition: 'Na primeira visita, ao marcar corte ou cor.',
    })).toEqual({ title: 'Tratamento nutritivo de oferta na primeira visita de corte ou cor' });
    expect(offerDisplay({
      title: 'Hidratação de presente na primeira visita',
      condition: 'Ao agendar corte ou coloração.',
    })).toEqual({ title: 'Hidratação de presente na primeira visita', detail: 'Ao agendar corte ou coloração.' });
    expect(offerDisplay({
      title: '15% de desconto na sua primeira visita',
      condition: 'Válido para novos clientes de terça a quinta-feira em qualquer corte ou combo.',
    }).detail).toMatch(/terça a quinta/);
    expect(offerDisplay({ title: '  ', condition: 'Qualquer coisa' })).toEqual({ title: '' });
  });
});

describe('owner content overrides', () => {
  it('adds sales context without duplicating registered price, duration or roster', () => {
    const config = { ...defaultConfig(site), serviceDetails: { cut: { description: 'Corte com acabamento', includes: ['Consulta', 'Finalização'], priceFrom: true, image: 'javascript:secret' }, removed: { description: 'Não aparece' } }, teamDetails: { former: { bio: 'Ex-membro' } }, contact: { phone: '123', instagram: '@minhacasa' }, gallery: [{ src: 'https://example.com/work.jpg', alt: 'Meu trabalho' }] };
    const result = applySiteConfig(site, config);
    expect(result.services).toHaveLength(1);
    expect(result.services[0]).toMatchObject({ price: 65, duration: 30, description: 'Corte com acabamento', includes: ['Consulta', 'Finalização'], priceFrom: true });
    expect(result.services[0].image).toBeUndefined();
    expect(result.team).toEqual([]);
    expect(result.phone).toBe('123');
    expect(result.instagram).toBe('minhacasa');
    expect(result.gallery).toEqual([{ src: 'https://example.com/work.jpg', alt: 'Meu trabalho' }]);
    expect(site.services[0].description).toBeUndefined();
  });
});
