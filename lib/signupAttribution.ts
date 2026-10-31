import { readConsent } from './marketingConsent';

/**
 * Origem do cadastro (primeiro contato). Guarda no navegador, sem sobrescrever, de onde a pessoa
 * veio na PRIMEIRA visita (UTMs, fbclid, site de origem, página de entrada). No cadastro de dono
 * isso é enviado ao servidor uma única vez (RPC save_signup_attribution).
 *
 * Regras:
 *  - nunca altera a URL nem o consentimento (o Pixel da Meta lê fbclid da URL);
 *  - só registra páginas públicas de aquisição (nada de agendamento público, convites, área do cliente);
 *  - nunca guarda a query da página de entrada (podem existir convites/tokens), nem a query do referrer;
 *  - fbclid (identificador de clique da Meta) só vai ao servidor com consentimento de marketing aceito.
 */
export const ATTRIBUTION_KEY = 'agendix:signup-attribution:v1';
const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;
const VALUE_MAX = 100;
const FBCLID_MAX = 256;
const ACQUISITION_PATHS = ['/', '/login', '/register', '/termos', '/privacidade'];
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;
type UtmKey = (typeof UTM_KEYS)[number];

export interface StoredAttribution extends Partial<Record<UtmKey, string>> {
  v: 1;
  capturedAt: number;
  fbclid?: string;
  referrer?: string;
  landing_path?: string;
}

export interface SignupAttributionPayload {
  p_utm_source: string | null;
  p_utm_medium: string | null;
  p_utm_campaign: string | null;
  p_utm_content: string | null;
  p_utm_term: string | null;
  p_fbclid: string | null;
  p_referrer: string | null;
  p_landing_path: string | null;
  p_user_agent: string | null;
  p_first_seen_at: string;
}

function clean(value: string | null | undefined, max = VALUE_MAX): string | undefined {
  if (!value) return undefined;
  // eslint-disable-next-line no-control-regex
  const out = value.replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, max);
  return out || undefined;
}

function readStored(): StoredAttribution | null {
  try {
    const raw = JSON.parse(localStorage.getItem(ATTRIBUTION_KEY) || 'null');
    if (!raw || raw.v !== 1 || typeof raw.capturedAt !== 'number') return null;
    const age = Date.now() - raw.capturedAt;
    return Number.isFinite(age) && age >= 0 && age < MAX_AGE_MS ? (raw as StoredAttribution) : null;
  } catch {
    return null;
  }
}

function hashRoute(): { path: string; query: URLSearchParams } {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  const q = raw.indexOf('?');
  const path = (q === -1 ? raw : raw.slice(0, q)) || '/';
  return { path: path.startsWith('/') ? path : '/' + path, query: new URLSearchParams(q === -1 ? '' : raw.slice(q + 1)) };
}

function externalReferrer(): string | undefined {
  try {
    if (!document.referrer) return undefined;
    const url = new URL(document.referrer);
    if (url.origin === window.location.origin) return undefined;
    return clean(url.origin + url.pathname, 200);
  } catch {
    return undefined;
  }
}

/** Primeira visita: guarda a origem. Visitas seguintes não sobrescrevem. Nunca lança erro. */
export function captureFirstTouch(): void {
  try {
    if (readStored()) return;
    const route = hashRoute();
    if (!ACQUISITION_PATHS.includes(route.path)) return;
    const search = new URLSearchParams(window.location.search);
    const param = (name: string) => search.get(name) ?? route.query.get(name);
    const entry: StoredAttribution = { v: 1, capturedAt: Date.now(), landing_path: route.path };
    for (const key of UTM_KEYS) {
      const v = clean(param(key));
      if (v) entry[key] = v;
    }
    const fbclid = param('fbclid');
    if (fbclid && fbclid.length <= FBCLID_MAX && /^[A-Za-z0-9_.-]+$/.test(fbclid)) entry.fbclid = fbclid;
    const referrer = externalReferrer();
    if (referrer) entry.referrer = referrer;
    localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(entry));
  } catch {
    // armazenamento bloqueado (navegação privada etc.): sem origem, o cadastro segue normal
  }
}

export function clearAttribution(): void {
  try {
    localStorage.removeItem(ATTRIBUTION_KEY);
  } catch {
    // ignorado
  }
}

export function buildSignupAttributionPayload(): SignupAttributionPayload | null {
  const s = readStored();
  if (!s) return null;
  const ua = typeof navigator !== 'undefined' ? clean(navigator.userAgent, 300) : undefined;
  return {
    p_utm_source: s.utm_source ?? null,
    p_utm_medium: s.utm_medium ?? null,
    p_utm_campaign: s.utm_campaign ?? null,
    p_utm_content: s.utm_content ?? null,
    p_utm_term: s.utm_term ?? null,
    p_fbclid: readConsent() === 'accepted' ? (s.fbclid ?? null) : null,
    p_referrer: s.referrer ?? null,
    p_landing_path: s.landing_path ?? null,
    p_user_agent: ua ?? null,
    p_first_seen_at: new Date(s.capturedAt).toISOString(),
  };
}

interface RpcClient {
  rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data?: unknown; error?: unknown }>;
}

/** Envia a origem ao servidor (uma vez). Melhor esforço: erro nunca atrapalha o cadastro. */
export async function saveSignupAttribution(client: RpcClient): Promise<void> {
  try {
    const payload = buildSignupAttributionPayload();
    if (!payload) return;
    const { error } = await client.rpc('save_signup_attribution', payload as unknown as Record<string, unknown>);
    if (!error) clearAttribution();
  } catch {
    // mantém o registro local para uma nova tentativa
  }
}
