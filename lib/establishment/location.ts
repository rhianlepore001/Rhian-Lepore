const MAX_URL_LENGTH = 500;
const GOOGLE_HOSTS = new Set([
  'www.google.com',
  'google.com',
  'www.google.com.br',
  'google.com.br',
  'www.google.pt',
  'google.pt',
]);

export const LOCATION_INPUT_ERROR = 'Use um link do Google Maps ou coordenadas (ex.: -23.5614, -46.6820).';

export interface Coordinates {
  lat: number;
  lng: number;
}

export type LocationInputResult =
  | { kind: 'empty' }
  | { kind: 'valid'; mapsUrl?: string; lat?: number; lng?: number; isShortLink?: boolean }
  | { kind: 'invalid'; error: string };

function hasControlChars(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 31 || code === 127) return true;
  }
  return false;
}

/** Aceita só links https do Google Maps, sem credenciais, porta ou marcação. */
export function sanitizeGoogleMapsUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const raw = value.trim();
  if (!raw || raw.length > MAX_URL_LENGTH || hasControlChars(raw) || /[\s\u200B\uFEFF<>"'`\\]/.test(raw)) return undefined;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return undefined;
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return undefined;
  const host = url.hostname.toLowerCase();
  const path = url.pathname;
  let allowed = false;
  if (GOOGLE_HOSTS.has(host)) allowed = /^\/maps(\/|$)/.test(path);
  else if (host === 'maps.google.com') allowed = true;
  else if (host === 'maps.app.goo.gl') allowed = /^\/[^/]+/.test(path);
  else if (host === 'goo.gl') allowed = /^\/maps\/[^/]+/.test(path);
  if (!allowed || url.href.length > MAX_URL_LENGTH) return undefined;
  return url.href;
}

export function normalizeCoordinates(lat: unknown, lng: unknown): Coordinates | undefined {
  const toNumber = (value: unknown) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && value.trim() !== '') return Number(value);
    return NaN;
  };
  const a = toNumber(lat);
  const b = toNumber(lng);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return undefined;
  if (a < -90 || a > 90 || b < -180 || b > 180) return undefined;
  const round = (value: number) => Math.round(value * 1e6) / 1e6;
  const result = { lat: round(a), lng: round(b) };
  if (result.lat === 0 && result.lng === 0) return undefined;
  return result;
}

function coordinatesFromText(raw: string): Coordinates | undefined {
  const dotted = raw.match(/^\(?\s*(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*\)?$/);
  if (dotted) return normalizeCoordinates(dotted[1], dotted[2]);
  const spaced = raw.match(/^\(?\s*(-?\d{1,3}(?:[.,]\d+)?)\s*(?:;|\s)\s*(-?\d{1,3}(?:[.,]\d+)?)\s*\)?$/);
  if (spaced) return normalizeCoordinates(spaced[1].replace(',', '.'), spaced[2].replace(',', '.'));
  return undefined;
}

function coordinatesFromUrl(href: string): Coordinates | undefined {
  let decoded = href;
  try {
    decoded = decodeURIComponent(href);
  } catch {
    decoded = href;
  }
  const place = decoded.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (place) return normalizeCoordinates(place[1], place[2]);
  const at = decoded.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (at) return normalizeCoordinates(at[1], at[2]);
  try {
    const params = new URL(href).searchParams;
    for (const key of ['q', 'query', 'll', 'center']) {
      const value = params.get(key)?.trim();
      const match = value?.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
      if (match) return normalizeCoordinates(match[1], match[2]);
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export function coordinatesMapsUrl(coords: Coordinates): string {
  return `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`;
}

export function parseGoogleMapsLocationInput(raw: string): LocationInputResult {
  const input = (raw || '').trim();
  if (!input) return { kind: 'empty' };
  if (input.length > 2000) return { kind: 'invalid', error: LOCATION_INPUT_ERROR };

  const direct = coordinatesFromText(input);
  if (direct) return { kind: 'valid', lat: direct.lat, lng: direct.lng, mapsUrl: coordinatesMapsUrl(direct) };

  const found = input.match(/https?:\/\/[^\s<>"'`]+/i)?.[0].replace(/[.,;:!?)\]]+$/, '');
  if (!found || /<\s*\/?\s*(iframe|script)/i.test(input) || !/^https:\/\//i.test(found)) {
    return { kind: 'invalid', error: LOCATION_INPUT_ERROR };
  }
  const mapsUrl = sanitizeGoogleMapsUrl(found);
  if (!mapsUrl) return { kind: 'invalid', error: LOCATION_INPUT_ERROR };

  const coords = coordinatesFromUrl(mapsUrl);
  if (coords) return { kind: 'valid', mapsUrl, lat: coords.lat, lng: coords.lng };
  const host = new URL(mapsUrl).hostname;
  if (host === 'maps.app.goo.gl' || host === 'goo.gl') return { kind: 'valid', mapsUrl, isShortLink: true };
  return { kind: 'valid', mapsUrl };
}

export function buildGoogleMapsDirectionsUrl(params: {
  name?: string;
  address?: string;
  mapsUrl?: string;
  lat?: number;
  lng?: number;
}): string | undefined {
  const safe = sanitizeGoogleMapsUrl(params.mapsUrl);
  if (safe) return safe;
  const coords = normalizeCoordinates(params.lat, params.lng);
  if (coords) return coordinatesMapsUrl(coords);
  const address = (params.address || '').trim();
  if (!address) return undefined;
  const query = `${(params.name || '').trim()} ${address}`.trim();
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** Embed montado só por nós, a partir de coordenadas ou endereço. Nunca reaproveita URL digitada. */
export function buildSafeMapEmbedUrl(params: {
  address?: string;
  lat?: number;
  lng?: number;
  region?: 'BR' | 'PT';
}): string | undefined {
  const coords = normalizeCoordinates(params.lat, params.lng);
  const address = (params.address || '').trim();
  const query = coords ? `${coords.lat},${coords.lng}` : address;
  if (!query) return undefined;
  const hl = params.region === 'PT' ? 'pt-PT' : 'pt-BR';
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&hl=${hl}&z=16&output=embed`;
}
