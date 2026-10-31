import { sha256Hex } from './sha256';

// Advanced Matching: normaliza (regras da Meta) e aplica SHA-256 antes de entregar ao Pixel.
// A API de Conversões (edge function meta-capi) repete a mesma normalização no servidor.
// Ao mexer aqui, mexa em supabase/functions/meta-capi/handler.ts (há teste de paridade).
export interface MetaIdentity {
  email?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  city?: string;
  country?: string;
  external_id?: string;
}
export interface MetaMatching {
  em?: string; ph?: string; fn?: string; ln?: string; ct?: string; country?: string; external_id?: string;
}

const letters = (value: string) => value.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

export const normalizeEmail = (value: string) => value.trim().toLowerCase();
export const normalizePhone = (value: string) => value.replace(/\D/g, '');
export const normalizeName = letters;
export const normalizeCity = letters;
export const normalizeCountry = (value: string) => value.trim().toLowerCase();
export const normalizeExternalId = (value: string) => value.trim().toLowerCase();

/** Primeiro e último nome a partir do nome completo (sobrenome só se houver 2+ palavras). */
export function splitFullName(fullName: string | null | undefined): { first_name?: string; last_name?: string } {
  const parts = (fullName ?? '').trim().split(/\s+/).filter(part => letters(part));
  if (!parts.length) return {};
  return {
    first_name: parts[0].slice(0, 100),
    ...(parts.length > 1 ? { last_name: parts[parts.length - 1].slice(0, 100) } : {}),
  };
}

export function hashMatching(identity: MetaIdentity | undefined): MetaMatching | undefined {
  if (!identity) return undefined;
  const entries: [keyof MetaMatching, string | undefined, string][] = [
    ['em', identity.email, identity.email ? normalizeEmail(identity.email) : ''],
    ['ph', identity.phone, identity.phone ? normalizePhone(identity.phone) : ''],
    ['fn', identity.first_name, identity.first_name ? normalizeName(identity.first_name) : ''],
    ['ln', identity.last_name, identity.last_name ? normalizeName(identity.last_name) : ''],
    ['ct', identity.city, identity.city ? normalizeCity(identity.city) : ''],
    ['country', identity.country, identity.country ? normalizeCountry(identity.country) : ''],
    ['external_id', identity.external_id, identity.external_id ? normalizeExternalId(identity.external_id) : ''],
  ];
  const matching: MetaMatching = {};
  for (const [key, , normalized] of entries) if (normalized) matching[key] = sha256Hex(normalized);
  return Object.keys(matching).length ? matching : undefined;
}
