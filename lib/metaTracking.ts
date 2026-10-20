import { clearMetaCookies, readConsent } from './marketingConsent';

type MetaEventName = 'PageView' | 'Lead' | 'CompleteRegistration';
interface Identity { email?: string; phone?: string }
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
  pixel: (name: MetaEventName, id: string) => void;
  send: (event: MetaEvent) => Promise<unknown>;
}

export function isMetaRoute(path: string, search: string, authenticated: boolean): boolean {
  if (authenticated) return false;
  if (path === '/login') return true;
  return path === '/register' && !new URLSearchParams(search).has('company') && !new URLSearchParams(search).has('member');
}

export function createMetaTracker(options: TrackerOptions) {
  let eligible = false;
  let source = '';
  let path = '';
  let lastPage = '';
  let leadSent = false;
  const completed = new WeakSet<RegistrationContext>();
  const enabled = () => Boolean(options.pixelId.trim()) && options.hasConsent();
  const emit = (name: MetaEventName, eventSource: string, id: string = crypto.randomUUID(), identity?: Identity) => {
    if (!enabled()) return;
    try { options.pixel(name, id); } catch { void 0; }
    try {
      void options.send({
        consent: true, event_name: name, event_id: id,
        event_time: Math.floor(Date.now() / 1000), event_source_url: eventSource,
        ...(identity ? { user_data: identity } : {}),
      }).catch(() => undefined);
    } catch { void 0; }
  };
  return {
    pageView(nextPath: string, search: string, authenticated: boolean) {
      if (nextPath !== path) leadSent = false;
      path = nextPath;
      eligible = isMetaRoute(path, search, authenticated);
      source = window.location.origin + window.location.pathname + '#' + path;
      if (!eligible || !enabled()) { lastPage = ''; return; }
      const key = path + search;
      if (lastPage === key) return;
      lastPage = key;
      emit('PageView', source);
    },
    lead() {
      if (!eligible || path !== '/register' || leadSent || !enabled()) return;
      leadSent = true;
      emit('Lead', source);
    },
    captureRegistration(): RegistrationContext | null {
      return eligible && path === '/register' && enabled() ? { id: crypto.randomUUID(), source } : null;
    },
    completeRegistration(context: RegistrationContext | null, identity: Identity) {
      if (!context || completed.has(context) || !enabled()) return;
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
}
declare global {
  interface Window { fbq?: PixelQueue; _fbq?: PixelQueue }
}

const pixelId = (import.meta.env.VITE_META_PIXEL_ID || '').trim();
let loaded = false;
let scopeAllowed = false;
let pending = new AbortController();

function loadPixel(): void {
  if (loaded || !pixelId || readConsent() !== 'accepted') return;
  const queue = function (...args: unknown[]) {
    if (queue.callMethod) queue.callMethod(...args);
    else queue.queue.push(args);
  } as PixelQueue;
  queue.queue = [];
  queue.push = queue;
  queue.loaded = true;
  queue.version = '2.0';
  window.fbq = window._fbq = queue;
  queue('consent', 'grant');
  queue('set', 'autoConfig', false, pixelId);
  queue('init', pixelId);
  const script = document.createElement('script');
  script.id = 'agendix-meta-pixel';
  script.async = true;
  script.src = 'https://connect.facebook.net/en_US/fbevents.js';
  document.head.appendChild(script);
  loaded = true;
}

export function setMetaScope(allowed: boolean): void {
  scopeAllowed = allowed && readConsent() === 'accepted';
  if (!scopeAllowed) {
    if (readConsent() !== 'accepted') {
      pending.abort();
      pending = new AbortController();
    }
    if (window.fbq) {
      window.fbq.queue = [];
      window.fbq('consent', 'revoke');
    }
    clearMetaCookies();
  } else if (loaded) {
    window.fbq?.('consent', 'grant');
  }
}

export const metaTracker = createMetaTracker({
  pixelId,
  hasConsent: () => readConsent() === 'accepted',
  pixel: (name, id) => {
    loadPixel();
    window.fbq?.('consent', 'grant');
    window.fbq?.('trackSingle', pixelId, name, {}, { eventID: id });
    if (!scopeAllowed) window.fbq?.('consent', 'revoke');
  },
  send: async event => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key || readConsent() !== 'accepted') return;
    await fetch(url + '/functions/v1/meta-capi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: key, Authorization: 'Bearer ' + key },
      body: JSON.stringify(event),
      keepalive: true,
      signal: pending.signal,
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
