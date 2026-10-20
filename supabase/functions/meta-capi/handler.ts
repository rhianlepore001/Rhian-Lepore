interface Config {
  pixelId: string;
  token: string;
  allowedOrigins: string[];
  testEventCode?: string;
  fetcher?: typeof fetch;
  crypto?: Crypto;
  maxRequests?: number;
  now?: () => number;
}

const EVENT_NAMES = new Set(['PageView', 'Lead', 'CompleteRegistration']);
const MAX_BYTES = 8192;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validPayload(value: unknown, origin: string, now: number): value is {
  consent: true; event_name: string; event_id: string; event_time: number;
  event_source_url: string; user_data?: { email?: string; phone?: string };
} {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  if (Object.keys(v).some(key => !['consent', 'event_name', 'event_id', 'event_time', 'event_source_url', 'user_data'].includes(key))) return false;
  if (v.consent !== true || typeof v.event_name !== 'string' || !EVENT_NAMES.has(v.event_name)) return false;
  if (typeof v.event_id !== 'string' || !UUID.test(v.event_id)) return false;
  if (typeof v.event_time !== 'number' || !Number.isInteger(v.event_time) || v.event_time < now - 3600 || v.event_time > now + 60) return false;
  if (typeof v.event_source_url !== 'string' || v.event_source_url.length > 512) return false;
  try {
    const source = new URL(v.event_source_url);
    if (source.origin !== origin || source.username || source.password || source.search) return false;
    if (!['#/login', '#/register'].includes(source.hash)) return false;
    if (v.event_name !== 'PageView' && source.hash !== '#/register') return false;
  } catch { return false; }
  if (v.user_data !== undefined) {
    if (!v.user_data || typeof v.user_data !== 'object' || Array.isArray(v.user_data)) return false;
    const user = v.user_data as Record<string, unknown>;
    if (Object.keys(user).some(key => !['email', 'phone'].includes(key))) return false;
    if (user.email !== undefined && (typeof user.email !== 'string' || user.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email.trim()))) return false;
    if (user.phone !== undefined && (typeof user.phone !== 'string' || user.phone.length > 32 || !/^\+?[\d\s().-]+$/.test(user.phone) || !/^\d{8,15}$/.test(user.phone.replace(/\D/g, '')))) return false;
  }
  return true;
}

export function createMetaCapiHandler(config: Config): (request: Request) => Promise<Response> {
  const fetcher = config.fetcher || fetch;
  const cryptoApi = config.crypto || crypto;
  const now = config.now || Date.now;
  const buckets = new Map<string, { count: number; until: number }>();
  const hash = async (value: string) => Array.from(new Uint8Array(
    await cryptoApi.subtle.digest('SHA-256', new TextEncoder().encode(value)),
  )).map(byte => byte.toString(16).padStart(2, '0')).join('');

  return async request => {
    const origin = request.headers.get('origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Vary': 'Origin',
    };
    const response = (status: number, message: string, extra = {}) =>
      new Response(JSON.stringify({ message }), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extra } });
    if (!config.allowedOrigins.includes(origin)) return new Response('Forbidden', { status: 403 });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return response(405, 'Method not allowed', { Allow: 'POST, OPTIONS' });
    if (!/^\d+$/.test(config.pixelId) || !config.token) return response(503, 'Tracking unavailable');
    if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return response(415, 'Expected JSON');

    const timestamp = now();
    for (const [key, bucket] of buckets) if (bucket.until <= timestamp) buckets.delete(key);
    const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    const ip = forwarded && /^[\da-f:.]+$/i.test(forwarded) && forwarded.length <= 45 ? forwarded : undefined;
    const bucketKey = ip || 'unknown';
    const bucket = buckets.get(bucketKey) || { count: 0, until: timestamp + 60_000 };
    if (bucket.count >= (config.maxRequests || 30) || (!buckets.has(bucketKey) && buckets.size >= 10_000)) {
      return response(429, 'Too many requests', { 'Retry-After': '60' });
    }
    bucket.count += 1;
    buckets.set(bucketKey, bucket);

    if (Number(request.headers.get('content-length')) > MAX_BYTES) return response(413, 'Payload too large');
    let value: unknown;
    try {
      const reader = request.body?.getReader();
      if (!reader) return response(400, 'Invalid payload');
      const chunks: Uint8Array[] = [];
      let size = 0;
      for (let part = await reader.read(); !part.done; part = await reader.read()) {
        const chunk = part.value;
        size += chunk.byteLength;
        if (size > MAX_BYTES) { await reader.cancel(); return response(413, 'Payload too large'); }
        chunks.push(chunk);
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      value = JSON.parse(new TextDecoder().decode(bytes));
    } catch { return response(400, 'Invalid payload'); }
    if (!validPayload(value, origin, Math.floor(timestamp / 1000))) return response(400, 'Invalid payload');

    try {
      const email = value.user_data?.email?.trim().toLowerCase();
      const phone = value.user_data?.phone?.replace(/\D/g, '');
      const userData = {
        ...(email ? { em: [await hash(email)] } : {}),
        ...(phone ? { ph: [await hash(phone)] } : {}),
        ...(ip ? { client_ip_address: ip } : {}),
        client_user_agent: (request.headers.get('user-agent') || '').slice(0, 512),
      };
      const result = await fetcher('https://graph.facebook.com/v25.0/' + config.pixelId + '/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000),
        body: JSON.stringify({
          access_token: config.token,
          data: [{
            event_name: value.event_name, event_id: value.event_id, event_time: value.event_time,
            event_source_url: value.event_source_url, action_source: 'website', user_data: userData,
          }],
          ...(config.testEventCode ? { test_event_code: config.testEventCode } : {}),
        }),
      });
      if (!result.ok) return response(502, 'Event delivery failed');
      const resultBody = await result.json();
      if (resultBody.events_received !== 1) return response(502, 'Event delivery failed');
      return response(200, 'Event received');
    } catch { return response(502, 'Event delivery failed'); }
  };
}
