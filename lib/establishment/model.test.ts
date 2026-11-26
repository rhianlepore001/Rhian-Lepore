import { describe, expect, it } from 'vitest';
import { accessibleAccent, applySiteConfig, buildSeo, contrastRatio, defaultBackground, defaultConfig, formatPrice, isRecommendedBackground, isReservedSiteSlug, neighborhoodFromAddress, normalizeSiteConfig, offerDisplay, photoObjectPosition, RECOMMENDED_BACKGROUNDS, resolvedBackground, sanitizePublicData, serializeJsonLd, siteSurface, visibleSections, type SiteData } from './model';

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

describe('site background', () => {
  it('recommends the current default of each style and keeps a custom option distinct', () => {
    expect(RECOMMENDED_BACKGROUNDS.map(item => item.hex)).toEqual(['#09090B', '#FBF7F0', '#FFFFFF']);
    expect(RECOMMENDED_BACKGROUNDS.every(item => item.recommended)).toBe(true);
    expect(defaultBackground('dark', 'barber')).toBe('#09090B');
    expect(defaultBackground('light', 'barber')).toBe('#FBF7F0');
    expect(defaultBackground('light', 'beauty')).toBe('#FFFFFF');
    expect(defaultConfig(site).background).toBe('#09090B');
    expect(defaultConfig({ ...site, kind: 'beauty' }).background).toBe('#FFFFFF');
    expect(isRecommendedBackground('#fbf7f0')).toBe(true);
    expect(isRecommendedBackground('#112233')).toBe(false);
  });
  it('keeps a valid custom background and falls back to the style default when missing or invalid', () => {
    const custom = normalizeSiteConfig({ background: '#1A1410' }, defaultConfig(site));
    expect(custom.background).toBe('#1A1410');
    expect(normalizeSiteConfig({ background: 'red' }, defaultConfig(site)).background).toBe('#09090B');
    expect(resolvedBackground({ style: 'light' }, 'beauty')).toBe('#FFFFFF');
    expect(resolvedBackground({ style: 'dark', background: '#abc' }, 'barber')).toBe('#09090B');
  });
  it('keeps text readable on the chosen background and warns when it had to adjust', () => {
    const urban = siteSurface('#09090B', 'dark');
    expect(urban.adjusted).toBe(false);
    expect(contrastRatio(urban.background, urban.ink)).toBeGreaterThanOrEqual(4.5);
    const cream = siteSurface('#FBF7F0', 'light');
    expect(cream.ink).toMatch(/^#1/i);
    expect(cream.adjusted).toBe(false);
    const yellow = siteSurface('#FFE14D', 'dark');
    expect(contrastRatio(yellow.background, yellow.ink)).toBeGreaterThanOrEqual(4.5);
    expect(yellow.ink).toBe('#000000');
    expect(yellow.warning).toMatch(/contraste|leitura/i);
    const mid = siteSurface('#777777', 'light');
    expect(contrastRatio(mid.background, mid.ink)).toBeGreaterThanOrEqual(4.5);
    expect(mid.adjusted).toBe(true);
  });
  it('uses the chosen page background when checking the brand accent contrast', () => {
    const pair = accessibleAccent('#9A5628', 'dark', '#FBF7F0');
    expect(contrastRatio(pair.background, '#FBF7F0')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(pair.background, pair.foreground)).toBeGreaterThanOrEqual(4.5);
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
    const storageTeamUrl = 'https://lcqwrngscsziysyfhpfj.supabase.co/storage/v1/object/public/team_photos/a/pro.jpg';
    const storageGalleryUrl = 'https://lcqwrngscsziysyfhpfj.supabase.co/storage/v1/object/public/galleries/a/real.jpg';
    const storageClubUrl = 'https://lcqwrngscsziysyfhpfj.supabase.co/storage/v1/object/public/membership_plan_photos/a/club.webp';
    const otherSupabaseGallery = 'https://outro-projeto.supabase.co/storage/v1/object/public/galleries/a/fake.jpg';
    const legacyBucketGallery = 'https://lcqwrngscsziysyfhpfj.supabase.co/storage/v1/object/public/gallery/a/legacy.jpg';
    const data = sanitizePublicData({
      profile: { id: 'a', business_slug: 'safe', business_name: 'Safe', phone: '+55 11 1111 1111', customer_email: 'secret@example.com', logo_url: 'javascript:alert(1)' },
      team: [{ id: 'a', name: 'Active', active: true, photo_url: storageTeamUrl, phone: 'private' }, { id: 'b', name: 'Gone', active: false }, { id: 'c', name: 'Deleted', active: true, deleted_at: '2026-01-01' }],
      services: [{ id: 's', name: 'Corte', active: true, price: 0, duration_minutes: 30, image_url: 'data:text/html,no' }, { id: 'x', name: 'Inactive', active: false, price: 50, duration_minutes: 30 }],
      gallery: [{ image_url: storageGalleryUrl }, { image_url: otherSupabaseGallery }, { image_url: legacyBucketGallery }, { image_url: 'https://evil.example.com/outside.jpg' }, { image_url: 'javascript:alert(1)' }],
      clubPlans: [{ id: 'plan-1', name: 'Plano', price_cents: 9900, active: true, photo_path: storageClubUrl }],
      reviews: { average: 4.9, total: 2, reviews: [{ id: 'r', rating: 5, comment: 'Contato: teste@example.com, +55 (11) 99999-9999', name: 'Maria Sobrenome Completo', phone: 'secret' }] },
    });
    expect(data.team).toHaveLength(1);
    expect(data.team[0]).toEqual({ id: 'a', name: 'Active', bio: undefined, image: storageTeamUrl });
    expect(data.logo).toBeUndefined();
    expect(data.services).toHaveLength(1);
    expect(data.services[0].image).toBeUndefined();
    expect(data.gallery).toHaveLength(1);
    expect(data.gallery[0].src).toBe(storageGalleryUrl);
    expect(data.clubPlans?.[0].image).toBe(storageClubUrl);
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
    const data = { ...site, address: 'Rua Fradique Coutinho, 420 — Pinheiros, São Paulo', rating: 4.8, reviewCount: 3 };
    const seo = buildSeo(data, defaultConfig(data), 'https://example.com');
    expect(seo.title).toBe('Navalha Fina — Barbearia em Pinheiros, São Paulo');
    expect(seo.url).toBe('https://example.com/s/navalha-fina');
    expect(seo.jsonLd['@type']).toBe('HairSalon');
    expect(seo.jsonLd.address).toEqual({ '@type': 'PostalAddress', streetAddress: data.address, addressCountry: 'BR' });
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
    expect(seo.url).toBe('https://example.com/s/navalha-fina');
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
    const workImg = 'https://lcqwrngscsziysyfhpfj.supabase.co/storage/v1/object/public/covers/a/work.jpg';
    const config = { ...defaultConfig(site), serviceDetails: { cut: { description: 'Corte com acabamento', includes: ['Consulta', 'Finalização'], priceFrom: true, image: 'javascript:secret' }, removed: { description: 'Não aparece' } }, teamDetails: { former: { bio: 'Ex-membro' } }, contact: { phone: '123', instagram: '@minhacasa' }, gallery: [{ src: workImg, alt: 'Meu trabalho' }] };
    const result = applySiteConfig(site, config);
    expect(result.services).toHaveLength(1);
    expect(result.services[0]).toMatchObject({ price: 65, duration: 30, description: 'Corte com acabamento', includes: ['Consulta', 'Finalização'], priceFrom: true });
    expect(result.services[0].image).toBeUndefined();
    expect(result.team).toEqual([]);
    expect(result.phone).toBe('123');
    expect(result.instagram).toBe('minhacasa');
    expect(result.gallery).toEqual([{ src: workImg, alt: 'Meu trabalho' }]);
    expect(site.services[0].description).toBeUndefined();
  });
});

describe('logo, visual presets, categories, club and CTA customization', () => {
  it('supports custom logo, removal override, logoDisplay mode and rejects unsafe logo URLs', () => {
    const baseLogo = 'https://lcqwrngscsziysyfhpfj.supabase.co/storage/v1/object/public/logos/a/base-logo.png';
    const siteLogo = 'https://lcqwrngscsziysyfhpfj.supabase.co/storage/v1/object/public/logos/a/site-logo.webp';
    const withBaseLogo: SiteData = { ...site, logo: baseLogo };
    const customConfig = normalizeSiteConfig({ logo: siteLogo, logoDisplay: 'logo' }, defaultConfig(withBaseLogo));
    expect(customConfig.logo).toBe(siteLogo);
    expect(customConfig.logoDisplay).toBe('logo');
    expect(applySiteConfig(withBaseLogo, customConfig).logo).toBe(siteLogo);

    const removedConfig = normalizeSiteConfig({ logoRemoved: true, logo: siteLogo }, defaultConfig(withBaseLogo));
    expect(removedConfig.logoRemoved).toBe(true);
    expect(applySiteConfig(withBaseLogo, removedConfig).logo).toBeUndefined();

    const unsafeLogo = normalizeSiteConfig({ logo: 'https://evil.example.com/logo.png' }, defaultConfig(withBaseLogo));
    expect(unsafeLogo.logo).toBeUndefined();
    expect(applySiteConfig(withBaseLogo, unsafeLogo).logo).toBe(baseLogo);
  });

  it('supports 3 visual presets independent of business kind, CTA label and offer kind', () => {
    const salonPreset = normalizeSiteConfig({ preset: 'salon', style: 'light', ctaLabel: 'Reservar meu horário', offer: { enabled: true, kind: 'combo', title: 'Combo Corte + Barba', condition: 'Terça a quinta' } }, defaultConfig(site));
    expect(salonPreset.preset).toBe('salon');
    expect(salonPreset.ctaLabel).toBe('Reservar meu horário');
    expect(salonPreset.offer.kind).toBe('combo');
    expect(defaultConfig(site).preset).toBe('urban');
    expect(defaultConfig({ ...site, kind: 'beauty' }).preset).toBe('salon');
  });

  it('maps service categories and club plans via sanitizePublicData and hides empty club section', () => {
    const data = sanitizePublicData({
      profile: { id: 'a', business_slug: 'safe', business_name: 'Safe', instagram_handle: '@safe.barber' },
      categories: [{ id: 'cat-1', name: 'Cabelo' }],
      services: [{ id: 's1', name: 'Degradê', active: true, price: 50, duration_minutes: 30, category_id: 'cat-1' }],
      clubPlans: [
        { id: 'plan-1', name: 'Clube Mensal', description: 'Cortes ilimitados', price_cents: 12900, active: true, usage_limit_per_month: 4 },
        { id: 'plan-off', name: 'Inativo', price_cents: 5000, active: false },
      ],
    });
    expect(data.services[0].category).toBe('Cabelo');
    expect(data.clubPlans).toHaveLength(1);
    expect(data.clubPlans?.[0]).toMatchObject({ id: 'plan-1', name: 'Clube Mensal', priceCents: 12900, usageLimitPerMonth: 4 });
    expect(visibleSections(data, defaultConfig(data)).map(s => s.id)).toContain('club');
    expect(visibleSections({ ...data, clubPlans: [] }, defaultConfig(data)).map(s => s.id)).not.toContain('club');

    const seo = buildSeo(data, defaultConfig(data), 'https://example.com');
    expect(seo.jsonLd.sameAs).toEqual(['https://www.instagram.com/safe.barber/']);
  });

  it('blocks reserved product route slugs to prevent collisions', () => {
    expect(isReservedSiteSlug('login')).toBe(true);
    expect(isReservedSiteSlug('Configuracoes')).toBe(true);
    expect(isReservedSiteSlug('minha-area')).toBe(true);
    expect(isReservedSiteSlug('barbearia-corte-fino')).toBe(false);
  });
});
