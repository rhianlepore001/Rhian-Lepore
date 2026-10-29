import { clearMetaCookies, readConsent } from './marketingConsent';

type MetaEventName = 'PageView' | 'Lead' | 'CompleteRegistration';
interface Identity { email?: string; phone?: string; external_id?: string; fbp?: string; fbc?: string }
export interface MetaEvent {
  consent: true;
  event_name: MetaEventName;
  event_id: string;
  event_time: number;
  event_source_url: string;
  user_data?: Identity;
}
interface RegistrationContext { id: string; leadId: string; source: string }
interface TrackerOptions {
  pixelId: string;
  hasConsent: () => boolean;
  canSend?: (source: string) => boolean;
  pixel: (name: MetaEventName, id: string) => void;
  send: (event: MetaEvent, signal?: AbortSignal) => Promise<unknown>;
  waitForFbp?: () => Promise<string | undefined>;
  getAbortSignal?: () => AbortSignal;
}

// Rotas públicas de aquisição. "/" redireciona para /login (a landing é o login) e rotas
// públicas de clientes dos salões (/book, /queue, /pro, /minha-area, /clube) ficam de fora:
// carregam slugs/ids de terceiros. Rotas autenticadas e /update-password também.
export const META_PUBLIC_PATHS = ['/login', '/register', '/termos', '/privacidade'] as const;

// O Pixel envia a URL inteira do documento (dl=location.href), então parâmetros que
// carreguem credenciais, convites ou dados pessoais nunca podem estar na URL ao rastrear.
// Parâmetros desconhecidos (utm_id, ad_id, gclid, placement, ref...) são permitidos,
// desde que nome e valor não indiquem dado sensível.
const SENSITIVE_KEY_EXACT = new Set([
  'code', 'state', 'nonce', 'sig', 'signature', 'fluxo', 'error', 'company', 'member',
  'invite', 'convite', 'next', 'redirect', 'redirect_to', 'return_to', 'returnurl',
]);
const SENSITIVE_KEY_SEGMENTS = new Set([
  'token', 'tokens', 'password', 'passwd', 'senha', 'secret', 'email', 'mail', 'phone',
  'telefone', 'cpf', 'cnpj', 'jwt', 'otp', 'session', 'auth', 'apikey', 'key', 'error',
]);
const JWT_LIKE = /^eyJ[\w-]+\.[\w-]+\./;

function isSensitiveParam(key: string, value: string): boolean {
  const name = key.toLowerCase();
  if (SENSITIVE_KEY_EXACT.has(name)) return true;
  if (name.split(/[^a-z0-9]+/).some(part => SENSITIVE_KEY_SEGMENTS.has(part))) return true;
  if (name === 'type') return !['barber', 'beauty'].includes(value);
  if (name === 'fbclid') return value.length > 256 || !/^[A-Za-z0-9_.-]+$/.test(value);
  // Valores que parecem e-mail, JWT, caminho interno do app ou blob grande.
  return value.includes('@') || JWT_LIKE.test(value) || value.startsWith('/')
    || value.includes('#') || value.length > 200;
}

/** true quando nenhum parâmetro da query (com ou sem "?") parece sensível. */
export function areMetaParamsSafe(search: string): boolean {
  if (!search) return true;
  const params = new URLSearchParams(search);
  const entries = Array.from(params);
  if (params.getAll('type').length > 1) return false;
  return entries.every(([key, value]) => !isSensitiveParam(key, value));
}

export function isMetaRoute(path: string, search: string, authenticated: boolean): boolean {
  if (authenticated || !(META_PUBLIC_PATHS as readonly string[]).includes(path)) return false;
  return areMetaParamsSafe(search);
}

/** Cria o valor do cookie _fbc (fb.<subdomainIndex>.<criação em ms>.<fbclid>). */
export function buildFbc(fbclid: string | null | undefined, now: number = Date.now()): string | undefined {
  if (!fbclid || !/^[A-Za-z0-9_.-]+$/.test(fbclid)) return undefined;
  const value = 'fb.1.' + now + '.' + fbclid;
  return value.length <= 256 ? value : undefined;
}

export function createMetaTracker(options: TrackerOptions) {
  let eligible = false;
  let source = '';
  let path = '';
  let search = '';
  let visit = 0;
  let lastPage = '';
  let leadSent = false;
  const registrations = new WeakMap<RegistrationContext, number>();
  const completed = new WeakSet<RegistrationContext>();
  const led = new WeakSet<RegistrationContext>();
  const enabled = (eventSource: string) => Boolean(options.pixelId.trim())
    && options.hasConsent() && (options.canSend?.(eventSource) ?? true);
  const emit = (name: MetaEventName, eventSource: string, id: string = crypto.randomUUID(), identity?: Identity) => {
    if (!enabled(eventSource)) return;
    const eventTime = Math.floor(Date.now() / 1000);
    try { options.pixel(name, id); } catch { void 0; }
    const signal = options.getAbortSignal?.();
    void (async () => {
      try {
        const fbp = readMetaCookie('_fbp') || await (options.waitForFbp ?? waitForFbpCookie)();
        if (signal?.aborted || !options.hasConsent()) return;

        const userData: Identity = { ...identity };
        const fbc = readMetaCookie('_fbc') || persistFbc(createFbcFromFbclid());
        if (fbp) userData.fbp = fbp;
        if (fbc) userData.fbc = fbc;
        await options.send({
          consent: true, event_name: name, event_id: id,
          event_time: eventTime, event_source_url: eventSource,
          ...(Object.keys(userData).length ? { user_data: userData } : {}),
        }, signal);
      } catch { void 0; }
    })();
  };
  const isContextValid = (context: RegistrationContext | null): boolean =>
    Boolean(context) && registrations.get(context!) === visit
    && path === '/register' && isMetaRoute(path, search, false)
    && context!.source === source && enabled(context!.source);
  return {
    pageView(nextPath: string, nextSearch: string, authenticated: boolean) {
      if (nextPath !== path || nextSearch !== search) {
        visit += 1;
        leadSent = false;
      }
      path = nextPath;
      search = nextSearch;
      eligible = isMetaRoute(path, search, authenticated);
      source = window.location.origin + window.location.pathname + '#' + path;
      if (!eligible || !enabled(source)) { lastPage = ''; return; }
      // Um PageView por troca de rota (path); mudança só de query na mesma rota não repete.
      if (lastPage === path) return;
      lastPage = path;
      emit('PageView', source);
    },
    captureRegistration(): RegistrationContext | null {
      if (!eligible || path !== '/register' || !enabled(source)) return null;
      const context = { id: crypto.randomUUID(), leadId: crypto.randomUUID(), source };
      registrations.set(context, visit);
      return context;
    },
    // Lead: conta criada no servidor (signUp com identidade nova). Uma vez por visita.
    lead(context: RegistrationContext | null, identity?: Identity) {
      if (!isContextValid(context) || leadSent || led.has(context!)) return;
      leadSent = true;
      led.add(context!);
      emit('Lead', context!.source, context!.leadId, identity);
    },
    completeRegistration(context: RegistrationContext | null, identity: Identity) {
      if (!isContextValid(context) || completed.has(context!)) return;
      completed.add(context!);
      emit('CompleteRegistration', context!.source, context!.id, identity);
    },
  };
}

interface PixelQueue {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  push: PixelQueue;
  loaded: boolean;
  version: string;
  disablePushState: boolean;
  allowDuplicatePageViews: boolean;
}
declare global {
  interface Window { fbq?: PixelQueue; _fbq?: PixelQueue }
}

const pixelId = (import.meta.env.VITE_META_PIXEL_ID || '').trim();
const META_COOKIE_VALUE = /^fb\.\d\.\d+\.[A-Za-z0-9_.-]+$/;
let loaded = false;
let scopeAllowed = false;
let completingRegistration = false;
let pending = new AbortController();

export function currentMetaSource(): string | null {
  const { pathname, search, hash, origin } = window.location;
  if (!['/', '/index.html'].includes(pathname) || !hash.startsWith('#/')) return null;
  // Query externa (anúncios): parâmetros desconhecidos são aceitos, sensíveis não.
  if (!areMetaParamsSafe(search)) return null;
  const route = hash.slice(1);
  // Um segundo "#" indica fragmento de auth (ex.: #/x#access_token=...): nunca rastrear.
  if (route.includes('#')) return null;
  const separator = route.indexOf('?');
  const path = separator < 0 ? route : route.slice(0, separator);
  const query = separator < 0 ? '' : route.slice(separator + 1);
  if (!isMetaRoute(path, query, false)) return null;
  // Sem query/hash-query: event_source_url e o contexto capturado são sempre sanitizados.
  return origin + pathname + '#' + path;
}

function readMetaCookie(name: '_fbp' | '_fbc'): string | undefined {
  const prefix = name + '=';
  const entry = document.cookie.split(';').map(cookie => cookie.trim()).find(cookie => cookie.startsWith(prefix));
  const value = entry?.slice(prefix.length);
  return value && value.length <= 256 && META_COOKIE_VALUE.test(value) ? value : undefined;
}

async function waitForFbpCookie(): Promise<string | undefined> {
  const timeout = 1000;
  const interval = 75;
  const deadline = Date.now() + timeout;
  let value = readMetaCookie('_fbp');
  while (!value && Date.now() < deadline) {
    await new Promise<void>(resolve => window.setTimeout(resolve, Math.min(interval, deadline - Date.now())));
    value = readMetaCookie('_fbp');
  }
  return value;
}

function createFbcFromFbclid(): string | undefined {
  return buildFbc(new URLSearchParams(window.location.search).get('fbclid'));
}

// Persiste o _fbc construído (90 dias, como o Pixel) para manter o mesmo timestamp nos
// próximos eventos. Só é chamado depois de conferir o consentimento.
function persistFbc(value: string | undefined): string | undefined {
  if (!value || !META_COOKIE_VALUE.test(value) || readConsent() !== 'accepted') return value;
  try {
    document.cookie = '_fbc=' + value + '; Max-Age=' + 90 * 24 * 60 * 60 + '; path=/; SameSite=Lax'
      + (window.location.protocol === 'https:' ? '; Secure' : '');
  } catch { void 0; }
  return value;
}

function canUsePixel(): boolean {
  return Boolean(pixelId && currentMetaSource()) && readConsent() === 'accepted'
    && (scopeAllowed || completingRegistration);
}

function discardPixelQueue(): void {
  const queue = window.fbq;
  if (queue) {
    queue.queue.length = 0;
    queue.callMethod?.('consent', 'revoke');
  }
  document.getElementById('agendix-meta-pixel')?.remove();
  if (!queue?.callMethod) loaded = false;
}

function loadPixel(): void {
  if (loaded || !canUsePixel()) return;
  const queue = function (...args: unknown[]) {
    if (!canUsePixel()) return;
    if (queue.callMethod) queue.callMethod(...args);
    else queue.queue.push(args);
  } as PixelQueue;
  queue.queue = [];
  queue.push = queue;
  queue.loaded = true;
  queue.version = '2.0';
  queue.disablePushState = true;
  queue.allowDuplicatePageViews = true;
  window.fbq = window._fbq = queue;
  queue('consent', 'grant');
  queue('set', 'autoConfig', false, pixelId);
  queue('init', pixelId);
  const script = document.createElement('script');
  script.id = 'agendix-meta-pixel';
  script.async = true;
  script.referrerPolicy = 'no-referrer';
  script.src = 'https://connect.facebook.net/en_US/fbevents.js';
  document.head.appendChild(script);
  loaded = true;
}

export function setMetaScope(allowed: boolean): void {
  const consented = readConsent() === 'accepted';
  scopeAllowed = allowed && consented && Boolean(currentMetaSource());
  if (!scopeAllowed) {
    if (!currentMetaSource() || !consented) {
      discardPixelQueue();
    } else {
      window.fbq?.callMethod?.('consent', 'revoke');
    }
    if (!consented) {
      pending.abort();
      pending = new AbortController();
      clearMetaCookies();
    }
  } else if (loaded) {
    window.fbq?.('consent', 'grant');
  }
}

const guardLocation = () => {
  if (!currentMetaSource()) setMetaScope(false);
};
window.addEventListener('hashchange', guardLocation);
window.addEventListener('popstate', guardLocation);

export const metaTracker = createMetaTracker({
  pixelId,
  hasConsent: () => readConsent() === 'accepted',
  canSend: source => currentMetaSource() === source,
  getAbortSignal: () => pending.signal,
  pixel: (name, id) => {
    if (!currentMetaSource() || (!scopeAllowed && name !== 'CompleteRegistration')) return;
    completingRegistration = name === 'CompleteRegistration';
    try {
      loadPixel();
      window.fbq?.('consent', 'grant');
      window.fbq?.('trackSingle', pixelId, name, {}, { eventID: id });
    } finally {
      completingRegistration = false;
      if (!scopeAllowed) window.fbq?.callMethod?.('consent', 'revoke');
    }
  },
  send: async (event, signal) => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key || readConsent() !== 'accepted') return;
    await fetch(url + '/functions/v1/meta-capi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: key },
      body: JSON.stringify(event),
      keepalive: true,
      signal: signal ?? pending.signal,
    });
  },
});

export function normalizeMetaPhone(phone: string, region: 'BR' | 'PT'): string | undefined {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return undefined;
  if (region === 'BR' && (digits.length === 10 || digits.length === 11)) return '55' + digits;
  if (region === 'PT' && digits.length === 9) return '351' + digits;
  return digits;
}
