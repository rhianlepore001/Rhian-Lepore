import { clearMetaCookies, readConsent } from './marketingConsent';

type MetaEventName = 'PageView' | 'Lead' | 'CompleteRegistration';
interface Identity { email?: string; phone?: string; fbp?: string; fbc?: string }
export interface MetaEvent {
  consent: true;
  event_name: MetaEventName;
  event_id: string;
  event_time: number;
  event_source_url: string;
  user_data?: Identity;
}
interface RegistrationContext { id: string; source: string }
interface TrackerOptions {
  pixelId: string;
  hasConsent: () => boolean;
  canSend?: (source: string) => boolean;
  pixel: (name: MetaEventName, id: string) => void;
  send: (event: MetaEvent, signal?: AbortSignal) => Promise<unknown>;
  waitForFbp?: () => Promise<string | undefined>;
  getAbortSignal?: () => AbortSignal;
}

export function isMetaRoute(path: string, search: string, authenticated: boolean): boolean {
  if (authenticated || !['/login', '/register'].includes(path)) return false;
  const params = new URLSearchParams(search);
  return Array.from(params).every(([key, value]) =>
    path === '/register' && key === 'type' && ['barber', 'beauty'].includes(value),
  ) && params.getAll('type').length <= 1;
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
        const fbc = readMetaCookie('_fbc') || createFbcFromFbclid();
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
      const key = path + search;
      if (lastPage === key) return;
      lastPage = key;
      emit('PageView', source);
    },
    lead() {
      if (!eligible || path !== '/register' || leadSent || !enabled(source)) return;
      leadSent = true;
      emit('Lead', source);
    },
    captureRegistration(): RegistrationContext | null {
      if (!eligible || path !== '/register' || !enabled(source)) return null;
      const context = { id: crypto.randomUUID(), source };
      registrations.set(context, visit);
      return context;
    },
    completeRegistration(context: RegistrationContext | null, identity: Identity) {
      if (!context || completed.has(context) || registrations.get(context) !== visit
        || path !== '/register' || !isMetaRoute(path, search, false)
        || context.source !== source || !enabled(context.source)) return;
      completed.add(context);
      emit('CompleteRegistration', context.source, context.id, identity);
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
const META_SEARCH_PARAMS = new Set(['fbclid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']);
const META_COOKIE_VALUE = /^fb\.\d\.\d+\.[A-Za-z0-9_.-]+$/;
let loaded = false;
let scopeAllowed = false;
let completingRegistration = false;
let pending = new AbortController();

export function currentMetaSource(): string | null {
  const { pathname, search, hash, origin } = window.location;
  if (!['/', '/index.html'].includes(pathname) || !hash.startsWith('#/')) return null;
  if (Array.from(new URLSearchParams(search).keys()).some(key => !META_SEARCH_PARAMS.has(key))) return null;
  const route = hash.slice(1);
  const separator = route.indexOf('?');
  const path = separator < 0 ? route : route.slice(0, separator);
  const query = separator < 0 ? '' : route.slice(separator + 1);
  if (!isMetaRoute(path, query, false)) return null;
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
  const fbclid = new URLSearchParams(window.location.search).get('fbclid');
  if (!fbclid || !/^[A-Za-z0-9_.-]+$/.test(fbclid)) return undefined;
  const value = 'fb.1.' + Date.now() + '.' + fbclid;
  return value.length <= 256 ? value : undefined;
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
