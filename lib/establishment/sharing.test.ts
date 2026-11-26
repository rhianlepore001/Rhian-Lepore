import { describe, expect, it } from 'vitest';
import { defaultConfig, type SiteData } from './model';
import {
  buildQrPrintHtml,
  buildShareLinks,
  buildWhatsAppShareUrl,
  computeSiteCompleteness,
} from './sharing';

const baseData: SiteData = {
  id: 'comp-1',
  slug: 'corte-fino',
  name: 'Corte Fino',
  kind: 'barber',
  region: 'BR',
  demo: false,
  address: 'Rua Augusta, 1200 — Consolação, São Paulo',
  phone: '11999998888',
  hours: [{ day: 'Segunda', hours: '09:00–19:00' }],
  services: [
    {
      id: 'srv-1',
      name: 'Corte masculino',
      description: 'Corte com tesoura e acabamento na navalha.',
      includes: [],
      duration: 45,
      price: 70,
    },
  ],
  team: [],
  gallery: [{ src: 'https://example.com/foto.webp', alt: 'Espaço' }],
  reviews: [],
  reviewCount: 0,
};

describe('buildShareLinks', () => {
  it('normalizes origin, encodes slug, and generates tracked channel links', () => {
    const links = buildShareLinks('https://www.agendixstudio.com/painel?x=1', 'barbearia central');
    expect(links).toEqual({
      direct: 'https://www.agendixstudio.com/s/barbearia%20central',
      instagram: 'https://www.agendixstudio.com/s/barbearia%20central?origem=instagram',
      google: 'https://www.agendixstudio.com/s/barbearia%20central?origem=google',
      qr: 'https://www.agendixstudio.com/s/barbearia%20central?origem=qr',
    });
  });

  it('rejects invalid origins or empty slugs', () => {
    expect(() => buildShareLinks('not-a-url', 'corte-fino')).toThrow();
    expect(() => buildShareLinks('https://example.com', '   ')).toThrow();
  });
});

describe('buildWhatsAppShareUrl', () => {
  it('builds a wa.me share URL inviting clients without mentioning AgendiX', () => {
    const url = buildWhatsAppShareUrl('Corte Fino', 'https://example.com/#/site/corte-fino');
    expect(url.startsWith('https://wa.me/?text=')).toBe(true);
    const decoded = decodeURIComponent(url.replace('https://wa.me/?text=', ''));
    expect(decoded).toContain('Corte Fino');
    expect(decoded).toContain('https://example.com/#/site/corte-fino');
    expect(decoded.toLowerCase()).not.toContain('agendix');
  });
});

describe('buildQrPrintHtml', () => {
  const validQr = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  it('generates self-contained print HTML for BR and PT without mentioning AgendiX', () => {
    const htmlBr = buildQrPrintHtml({
      name: 'Corte Fino',
      logo: '/presenca/demo-logo-barber.svg',
      link: 'https://example.com/#/site/corte-fino?origem=qr',
      qrDataUrl: validQr,
      region: 'BR',
    });
    expect(htmlBr).toContain('<!doctype html>');
    expect(htmlBr).toContain('Aponte a câmera do celular para ver serviços e agendar');
    expect(htmlBr).toContain('/presenca/demo-logo-barber.svg');
    expect(htmlBr).toContain(validQr);
    expect(htmlBr.toLowerCase()).not.toContain('agendix');

    const htmlPt = buildQrPrintHtml({
      name: 'Studio Aurora',
      link: 'https://example.com/#/site/studio-aurora?origem=qr',
      qrDataUrl: validQr,
      region: 'PT',
    });
    expect(htmlPt).toContain('Aponte a câmara do telemóvel para ver serviços e marcar');
    expect(htmlPt.toLowerCase()).not.toContain('agendix');
  });

  it('escapes HTML and attribute XSS payloads and blocks unsafe logo or qr URLs', () => {
    const html = buildQrPrintHtml({
      name: '<script>alert(1)</script> & "Casa"',
      logo: 'javascript:alert(1)',
      link: 'https://example.com/#/site/x?a="1"&b=<2>',
      qrDataUrl: validQr,
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;Casa&quot;');
    expect(html).not.toContain('javascript:alert(1)');
    expect(html).toContain('&quot;1&quot;&amp;b=&lt;2&gt;');
  });

  it('accepts safe storage logos and rejects non-png qrDataUrl values', () => {
    const storageLogo = 'https://lcqwrngscsziysyfhpfj.supabase.co/storage/v1/object/public/logos/a/logo.webp';
    const html = buildQrPrintHtml({
      name: 'Corte Fino',
      logo: storageLogo,
      link: 'https://example.com/s/corte-fino',
      qrDataUrl: validQr,
    });
    expect(html).toContain(`src="${storageLogo}"`);

    expect(() =>
      buildQrPrintHtml({
        name: 'Corte Fino',
        link: 'https://example.com/#/site/corte-fino',
        qrDataUrl: 'data:text/html;base64,PHNjcmlwdD4=',
      }),
    ).toThrow();
  });
});

describe('computeSiteCompleteness', () => {
  it('computes 100% when all checklist items are satisfied', () => {
    const config = {
      ...defaultConfig(baseData),
      logo: 'https://example.com/logo.webp',
      cover: 'https://example.com/cover.webp',
      headline: 'Barbearia tradicional no coração da cidade',
    };
    const result = computeSiteCompleteness(baseData, config);
    expect(result.completed).toBe(7);
    expect(result.total).toBe(7);
    expect(result.percent).toBe(100);
    expect(result.items.every(item => item.done)).toBe(true);
    expect(result.items.map(item => item.id)).toEqual([
      'logo',
      'cover',
      'headline',
      'services',
      'gallery',
      'location',
      'whatsapp',
    ]);
  });

  it('treats logoRemoved as incomplete even when data.logo or config.logo exists', () => {
    const dataWithLogo: SiteData = { ...baseData, logo: 'https://example.com/old-logo.png' };
    const config = {
      ...defaultConfig(dataWithLogo),
      logo: 'https://example.com/logo.webp',
      logoRemoved: true,
      cover: 'https://example.com/cover.webp',
      headline: 'Frase válida com mais de oito',
    };
    const result = computeSiteCompleteness(dataWithLogo, config);
    const logoItem = result.items.find(item => item.id === 'logo');
    expect(logoItem).toEqual({
      id: 'logo',
      label: 'Logo do estabelecimento',
      done: false,
      sectionKey: 'brand',
      actionLabel: 'Adicionar logo',
    });
    expect(result.completed).toBe(6);
    expect(result.percent).toBe(86);
  });

  it('uses config overrides for service descriptions and contact phone', () => {
    const minimalData: SiteData = {
      ...baseData,
      logo: undefined,
      cover: undefined,
      address: '',
      phone: undefined,
      gallery: [],
      services: [{ id: 'srv-1', name: 'Corte', includes: [], duration: 30, price: 50 }],
    };
    const config = {
      ...defaultConfig(minimalData),
      headline: 'Curta',
      serviceDetails: { 'srv-1': { description: 'Descrição adicionada no editor' } },
      contact: { phone: '11988887777' },
    };
    const result = computeSiteCompleteness(minimalData, config);
    expect(result.items.find(i => i.id === 'services')?.done).toBe(true);
    expect(result.items.find(i => i.id === 'whatsapp')?.done).toBe(true);
    expect(result.items.find(i => i.id === 'headline')?.done).toBe(false);
    expect(result.items.find(i => i.id === 'cover')?.done).toBe(false);
    expect(result.items.find(i => i.id === 'gallery')?.done).toBe(false);
    expect(result.items.find(i => i.id === 'location')?.done).toBe(false);
    expect(result.completed).toBe(2);
    expect(result.percent).toBe(29);
  });
});
