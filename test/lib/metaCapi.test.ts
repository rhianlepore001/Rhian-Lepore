import { webcrypto } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { createMetaCapiHandler } from '../../supabase/functions/meta-capi/handler';

const origin = 'https://app.example.com';
const payload = () => ({
  consent: true, event_name: 'CompleteRegistration', event_id: '8efdc721-ff7c-4c90-9101-e053cde1f649',
  event_time: Math.floor(Date.now() / 1000), event_source_url: origin + '/#/register',
  user_data: {
    email: ' PERSON@EXAMPLE.COM ', phone: '+351 912 345 678',
    fbp: 'fb.1.1234567890.1234567890', fbc: 'fb.1.1234567890.click_123',
  },
});
const setup = (extra = {}) => {
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ events_received: 1 }), { status: 200 }));
  const handler = createMetaCapiHandler({
    pixelId: '123', token: 'server-only', allowedOrigins: [origin], fetcher,
    crypto: webcrypto as unknown as Crypto, ...extra,
  });
  const request = (body: unknown = payload(), headers = {}) => new Request('https://edge.example.com/meta-capi', {
    method: 'POST', headers: { origin, 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.4', 'user-agent': 'test-agent', ...headers },
    body: JSON.stringify(body),
  });
  return { handler, fetcher, request };
};

describe('meta-capi', () => {
  it('hashes contact data and forwards the browser ID, IP, UA and test code', async () => {
    const s = setup({ testEventCode: 'TEST123' });
    expect((await s.handler(s.request())).status).toBe(200);
    const [url, options] = s.fetcher.mock.calls[0];
    expect(url).toMatch(/^https:\/\/graph.facebook.com\/v\d+\.0\/123\/events$/);
    const body = JSON.parse(options.body);
    expect(body.access_token).toBe('server-only');
    expect(body.test_event_code).toBe('TEST123');
    const event = body.data[0];
    expect(event.event_id).toBe(payload().event_id);
    expect(event.action_source).toBe('website');
    const hash = async (value: string) => Array.from(new Uint8Array(await webcrypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))).map(b => b.toString(16).padStart(2, '0')).join('');
    expect(event.user_data.em).toEqual([await hash('person@example.com')]);
    expect(event.user_data.ph).toEqual([await hash('351912345678')]);
    expect(event.user_data.fbp).toBe('fb.1.1234567890.1234567890');
    expect(event.user_data.fbc).toBe('fb.1.1234567890.click_123');
    expect(event.user_data.client_ip_address).toBe('203.0.113.4');
    expect(event.user_data.client_user_agent).toBe('test-agent');
    expect(JSON.stringify(body)).not.toContain('PERSON@');
  });
  it.each([
    { consent: false }, { event_name: 'Purchase' }, { event_id: 'bad' },
    { event_source_url: origin + '/#/book/demo' }, { event_source_url: 'https://evil.example/#/register' },
    { event_source_url: origin + '/?fbclid=private#/register' },
    { event_source_url: origin + '/#/register?email=private@example.com' },
    { event_time: 0 }, { user_data: { email: 'bad' } }, { user_data: { phone: '123' } },
  ])('rejects invalid payload %j without contacting Meta', async patch => {
    const s = setup();
    expect((await s.handler(s.request({ ...payload(), ...patch }))).status).toBe(400);
    expect(s.fetcher).not.toHaveBeenCalled();
  });
  it.each([
    { fbp: 'not-an-fb-cookie' },
    { fbc: 'fb.1.no-timestamp.click' },
    { fbp: 'fb.1.123.click'.padEnd(257, 'x') },
    { unknown: 'value' },
  ])('rejects malformed or unknown browser identifiers %j', async patch => {
    const s = setup();
    const body = payload();
    Object.assign(body.user_data, patch);
    expect((await s.handler(s.request(body))).status).toBe(400);
    expect(s.fetcher).not.toHaveBeenCalled();
  });
  it('accepts events without optional browser identifiers', async () => {
    const s = setup();
    const body = payload();
    const { email, phone } = body.user_data;
    expect((await s.handler(s.request({ ...body, user_data: { email, phone } }))).status).toBe(200);
    const forwarded = JSON.parse(s.fetcher.mock.calls[0][1].body).data[0].user_data;
    expect(forwarded).not.toHaveProperty('fbp');
    expect(forwarded).not.toHaveProperty('fbc');
  });
  it('rejects wrong origins, methods, malformed and oversized JSON', async () => {
    const s = setup();
    expect((await s.handler(s.request(payload(), { origin: 'https://evil.example' }))).status).toBe(403);
    expect((await s.handler(new Request('https://edge.example', { method: 'GET', headers: { origin } }))).status).toBe(405);
    expect((await s.handler(new Request('https://edge.example', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: '{' }))).status).toBe(400);
    expect((await s.handler(s.request({ padding: 'x'.repeat(9000) }))).status).toBe(413);
    expect(s.fetcher).not.toHaveBeenCalled();
  });
  it('supports preflight and rate limits the same IP', async () => {
    const s = setup({ maxRequests: 2 });
    expect((await s.handler(new Request('https://edge.example', { method: 'OPTIONS', headers: { origin } }))).status).toBe(204);
    await s.handler(s.request()); await s.handler(s.request());
    const response = await s.handler(s.request());
    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBeTruthy();
    expect(s.fetcher).toHaveBeenCalledTimes(2);
  });
  it('fails closed when unconfigured and hides upstream errors', async () => {
    const disabled = setup({ token: '' });
    expect((await disabled.handler(disabled.request())).status).toBe(503);
    const s = setup();
    s.fetcher.mockResolvedValue(new Response('sensitive upstream detail', { status: 400 }));
    const response = await s.handler(s.request());
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain('sensitive');
  });
});
