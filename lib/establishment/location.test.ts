import { describe, expect, it } from 'vitest';
import {
  buildGoogleMapsDirectionsUrl,
  buildSafeMapEmbedUrl,
  normalizeCoordinates,
  parseGoogleMapsLocationInput,
  sanitizeGoogleMapsUrl,
} from './location';

describe('sanitizeGoogleMapsUrl', () => {
  it('aceita apenas links https do Google Maps', () => {
    expect(sanitizeGoogleMapsUrl('https://www.google.com/maps/place/Rua+X/@-23.56,-46.68,17z')).toBe('https://www.google.com/maps/place/Rua+X/@-23.56,-46.68,17z');
    expect(sanitizeGoogleMapsUrl('https://google.com.br/maps?q=-23.56,-46.68')).toBeTruthy();
    expect(sanitizeGoogleMapsUrl('https://www.google.pt/maps/search/?api=1&query=Lisboa')).toBeTruthy();
    expect(sanitizeGoogleMapsUrl('https://maps.google.com/?q=-23.56,-46.68')).toBeTruthy();
    expect(sanitizeGoogleMapsUrl('https://maps.app.goo.gl/AbCd1234')).toBe('https://maps.app.goo.gl/AbCd1234');
    expect(sanitizeGoogleMapsUrl('https://goo.gl/maps/AbCd1234')).toBeTruthy();
  });

  it('rejeita esquemas perigosos, hosts parecidos, credenciais e HTML', () => {
    const bad = [
      'http://www.google.com/maps',
      'javascript:alert(1)',
      'data:text/html,<iframe>',
      'https://evil.com/maps',
      'https://google.com.evil.com/maps',
      'https://www.google.com.evil.com/maps/place/x',
      'https://user@www.google.com/maps',
      'https://user:pass@maps.google.com/',
      'https://www.google.com/search?q=maps',
      'https://www.google.com/mapsfoo',
      'https://maps.app.goo.gl/',
      'https://maps.app.goo.gl//',
      'https://goo.gl/maps/?q=1',
      'https://goo.gl/maps//?q=1',
      'https://www.google.com/maps/../url?q=https://evil.com',
      'https://www.google.com/maps/%2e%2e/url?q=https://evil.com',
      'https://goo.gl/maps/../EvilHash',
      'https://maps.app.goo.gl/./',
      'https://goo.gl/abc',
      'https://www.google.com:8443/maps',
      '<iframe src="https://www.google.com/maps"></iframe>',
      'https://www.google.com/maps/<script>',
      'https://www.google.com/maps/ place',
      'https://www.google.com/maps/\u00A0place',
      'https://www.google.com/maps/\u200Bplace',
      '',
      '   ',
    ];
    for (const value of bad) expect(sanitizeGoogleMapsUrl(value), value).toBeUndefined();
    expect(sanitizeGoogleMapsUrl(null)).toBeUndefined();
    expect(sanitizeGoogleMapsUrl(42)).toBeUndefined();
    expect(sanitizeGoogleMapsUrl(`https://www.google.com/maps/${'a'.repeat(600)}`)).toBeUndefined();
  });
});

describe('normalizeCoordinates', () => {
  it('valida faixa, rejeita Null Island e arredonda para 6 casas', () => {
    expect(normalizeCoordinates(-23.5614149999, -46.6820329999)).toEqual({ lat: -23.561415, lng: -46.682033 });
    expect(normalizeCoordinates('38.7223', '-9.1393')).toEqual({ lat: 38.7223, lng: -9.1393 });
    expect(normalizeCoordinates(0, 0)).toBeUndefined();
    expect(normalizeCoordinates(91, 10)).toBeUndefined();
    expect(normalizeCoordinates(10, 181)).toBeUndefined();
    expect(normalizeCoordinates(NaN, 10)).toBeUndefined();
    expect(normalizeCoordinates(undefined, 10)).toBeUndefined();
    expect(normalizeCoordinates(null, null)).toBeUndefined();
    expect(normalizeCoordinates('', '')).toBeUndefined();
  });
});

describe('parseGoogleMapsLocationInput', () => {
  it('trata vazio', () => {
    expect(parseGoogleMapsLocationInput('')).toEqual({ kind: 'empty' });
    expect(parseGoogleMapsLocationInput('   ')).toEqual({ kind: 'empty' });
  });

  it('entende coordenadas coladas em formatos comuns', () => {
    const a = parseGoogleMapsLocationInput('-23.561414, -46.682032');
    expect(a).toMatchObject({ kind: 'valid', lat: -23.561414, lng: -46.682032 });
    if (a.kind === 'valid') expect(a.mapsUrl).toBe('https://www.google.com/maps/search/?api=1&query=-23.561414,-46.682032');
    expect(parseGoogleMapsLocationInput('38.7223 -9.1393')).toMatchObject({ kind: 'valid', lat: 38.7223, lng: -9.1393 });
    expect(parseGoogleMapsLocationInput('(38.7223, -9.1393)')).toMatchObject({ kind: 'valid', lat: 38.7223, lng: -9.1393 });
    expect(parseGoogleMapsLocationInput('-23,5614; -46,6820')).toMatchObject({ kind: 'valid', lat: -23.5614, lng: -46.682 });
  });

  it('extrai coordenadas de links completos, inclusive com texto ao redor', () => {
    const place = parseGoogleMapsLocationInput('Veja no mapa: https://www.google.com/maps/place/Barbearia/@-23.5,-46.6,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d-23.561414!4d-46.682032 obrigado');
    expect(place).toMatchObject({ kind: 'valid', lat: -23.561414, lng: -46.682032 });
    const at = parseGoogleMapsLocationInput('https://www.google.com/maps/@-23.561414,-46.682032,17z');
    expect(at).toMatchObject({ kind: 'valid', lat: -23.561414, lng: -46.682032 });
    const query = parseGoogleMapsLocationInput('https://www.google.com/maps?q=38.7223,-9.1393');
    expect(query).toMatchObject({ kind: 'valid', lat: 38.7223, lng: -9.1393 });
    const named = parseGoogleMapsLocationInput('https://www.google.com/maps/place/Barbearia+Central');
    expect(named).toMatchObject({ kind: 'valid', mapsUrl: 'https://www.google.com/maps/place/Barbearia+Central' });
    if (named.kind === 'valid') expect(named.lat).toBeUndefined();
  });

  it('aceita link curto sem coordenadas', () => {
    expect(parseGoogleMapsLocationInput('https://maps.app.goo.gl/AbCd1234')).toEqual({ kind: 'valid', mapsUrl: 'https://maps.app.goo.gl/AbCd1234', isShortLink: true });
  });

  it('rejeita qualquer outra coisa com mensagem humana', () => {
    for (const value of ['https://evil.com/maps', 'javascript:alert(1)', '<iframe src="https://www.google.com/maps"></iframe>', 'rua das flores 10', '0, 0', '120, 300']) {
      const result = parseGoogleMapsLocationInput(value);
      expect(result.kind, value).toBe('invalid');
      if (result.kind === 'invalid') expect(result.error).toMatch(/Google Maps|coordenadas/);
    }
  });
});

describe('buildGoogleMapsDirectionsUrl', () => {
  it('prioriza link validado, depois coordenadas, depois endereço', () => {
    expect(buildGoogleMapsDirectionsUrl({ name: 'Casa', address: 'Rua A, 1', mapsUrl: 'https://maps.app.goo.gl/Xy12' })).toBe('https://maps.app.goo.gl/Xy12');
    expect(buildGoogleMapsDirectionsUrl({ name: 'Casa', address: 'Rua A, 1', mapsUrl: 'https://evil.com/maps', lat: 38.7223, lng: -9.1393 })).toBe('https://www.google.com/maps/search/?api=1&query=38.7223,-9.1393');
    expect(buildGoogleMapsDirectionsUrl({ name: 'Casa', address: 'Rua A, 1' })).toBe('https://www.google.com/maps/search/?api=1&query=Casa%20Rua%20A%2C%201');
    expect(buildGoogleMapsDirectionsUrl({ name: 'Casa', address: '  ', mapsUrl: 'javascript:alert(1)' })).toBeUndefined();
  });
});

describe('buildSafeMapEmbedUrl', () => {
  it('nunca usa URL do usuário no iframe e só gera embed do Google Maps', () => {
    expect(buildSafeMapEmbedUrl({ address: 'Rua A, 1', lat: -23.5614, lng: -46.682, region: 'BR' })).toBe('https://www.google.com/maps?q=-23.5614%2C-46.682&hl=pt-BR&z=16&output=embed');
    expect(buildSafeMapEmbedUrl({ address: 'Rua A, 1 — Lisboa', region: 'PT' })).toBe('https://www.google.com/maps?q=Rua%20A%2C%201%20%E2%80%94%20Lisboa&hl=pt-PT&z=16&output=embed');
    expect(buildSafeMapEmbedUrl({ address: '  ', region: 'BR' })).toBeUndefined();
    expect(buildSafeMapEmbedUrl({ address: '', lat: 0, lng: 0, region: 'BR' })).toBeUndefined();
    const url = buildSafeMapEmbedUrl({ address: '"><script>alert(1)</script>', region: 'BR' })!;
    expect(url.startsWith('https://www.google.com/maps?q=')).toBe(true);
    expect(url).not.toMatch(/[<>"]/);
  });
});
