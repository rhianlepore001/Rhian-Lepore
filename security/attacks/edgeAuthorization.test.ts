import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { loadEdgeHandler } from '../tests/edgeHarness';

describe('reminder authorization before privileged effects (local fixtures)', () => {
  function fixture(options: { jobSecret?: string; booking?: boolean; queryError?: boolean } = {}) {
    const send = vi.fn().mockResolvedValue({ data: { id: 'fictional-email' }, error: null });
    const booking = {
      id: 'fictional-booking', start_time: '2026-10-20T12:00:00Z',
      clients: { name: '<img src=x onerror="fictional()">', email: 'fictional-client@example.invalid' },
      services: { name: '<a href="https://example.invalid">Fictional service</a>' },
      business_profiles: { business_name: '<strong>Fictional business</strong>' },
    };
    const lte = vi.fn().mockResolvedValue({ data: options.booking ? [booking] : [], error: options.queryError ? { message: 'fictional-private-query-detail' } : null });
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), gte: vi.fn().mockReturnThis(), lte };
    const createClient = vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue(query) });
    const env = { SUPABASE_URL: 'http://127.0.0.1:54321', SUPABASE_SERVICE_ROLE_KEY: 'fictional-service-key', RESEND_API_KEY: 'fictional-resend', REMINDER_JOB_SECRET: options.jobSecret ?? 'fictional-job-secret' };
    const handler = loadEdgeHandler(resolve(__dirname, '../../supabase/functions/send-appointment-reminder/index.ts'), {
      createClient,
      Resend: class { emails = { send }; },
      Deno: { env: { get: (key: keyof typeof env) => env[key] } },
    });
    return { handler, createClient, send };
  }

  it.each([{}, { Authorization: 'Bearer fictional-user-jwt' }, { 'x-reminder-secret': 'wrong' }])('rejects unauthorized caller %j without querying or sending', async (headers) => {
    const { handler, createClient, send } = fixture();
    const response = await handler(new Request('http://localhost/reminder', { method: 'POST', headers }));
    expect(response.status).toBe(401);
    expect(createClient).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it.each(['GET', 'HEAD', 'PUT', 'PATCH', 'DELETE'])('rejects %s before privileged effects', async (method) => {
    const { handler, createClient } = fixture();
    const response = await handler(new Request('http://localhost/reminder', { method, headers: { 'x-reminder-secret': 'fictional-job-secret' } }));
    expect(response.status).toBe(405);
    expect(createClient).not.toHaveBeenCalled();
  });

  it('rejects missing job configuration before privileged effects', async () => {
    const { handler, createClient } = fixture({ jobSecret: '' });
    expect((await handler(new Request('http://localhost/reminder', { method: 'POST' }))).status).toBe(503);
    expect(createClient).not.toHaveBeenCalled();
  });

  it('permits OPTIONS without privileged effects', async () => {
    const { handler, createClient } = fixture();
    expect((await handler(new Request('http://localhost/reminder', { method: 'OPTIONS' }))).status).toBe(200);
    expect(createClient).not.toHaveBeenCalled();
  });

  it('encodes client, service and business names in the authorized mock email', async () => {
    const { handler, send } = fixture({ booking: true });
    const response = await handler(new Request('http://localhost/reminder', { method: 'POST', headers: { 'x-reminder-secret': 'fictional-job-secret' } }));
    expect(response.status).toBe(200);
    expect(send).toHaveBeenCalledOnce();
    const { html, to } = send.mock.calls[0][0];
    expect(to).toEqual(['fictional-client@example.invalid']);
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<a href=');
    expect(html).not.toContain('<strong>Fictional business</strong>');
    expect(html).toContain('&lt;img');
    expect(html).toContain('&lt;strong&gt;Fictional business&lt;/strong&gt;');
  });

  it('does not return query internals in the authorized job error', async () => {
    const { handler, send } = fixture({ queryError: true });
    const response = await handler(new Request('http://localhost/reminder', { method: 'POST', headers: { 'x-reminder-secret': 'fictional-job-secret' } }));
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain('fictional-private-query-detail');
    expect(send).not.toHaveBeenCalled();
  });

  it('permits the authorized job with an empty local fixture', async () => {
    const { handler, createClient, send } = fixture();
    const response = await handler(new Request('http://localhost/reminder', { method: 'POST', headers: { 'x-reminder-secret': 'fictional-job-secret' } }));
    expect(response.status).toBe(200);
    expect(createClient).toHaveBeenCalledOnce();
    expect(send).not.toHaveBeenCalled();
  });
});
