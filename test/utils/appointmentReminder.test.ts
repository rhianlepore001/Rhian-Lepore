import { describe, expect, it, vi } from 'vitest';
import { createReminderJobHandler, escapeReminderHtml } from '../../supabase/functions/send-appointment-reminder/handler';

const jobSecret = 'fake-appointment-reminder-secret-for-tests';

function request(method = 'POST', secret?: string) {
  const headers = secret ? { 'x-reminder-job-token': secret } : undefined;
  return new Request('https://example.test/reminders', { method, headers });
}

describe('appointment reminder job', () => {
  it('rejects methods and tokens before privileged work', async () => {
    const runJob = vi.fn();
    const handle = createReminderJobHandler(jobSecret, runJob);

    expect((await handle(request('GET', jobSecret))).status).toBe(405);
    expect((await handle(request())).status).toBe(401);
    expect((await handle(request('POST', 'different-test-token'))).status).toBe(401);
    expect((await createReminderJobHandler(undefined, runJob)(request('POST', jobSecret))).status).toBe(503);
    expect(runJob).not.toHaveBeenCalled();
  });

  it('returns only counters to the authorized job caller', async () => {
    const runJob = vi.fn(async () => ({ sent: 1, failed: 0, skipped: 1, email: 'synthetic@example.test' }));
    const response = await createReminderJobHandler(jobSecret, runJob)(request('POST', jobSecret));

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ sent: 1, failed: 0, skipped: 1 });
  });

  it('signals partial delivery failure for a retry', async () => {
    const runJob = async () => ({ sent: 1, failed: 1, skipped: 1 });
    const response = await createReminderJobHandler(jobSecret, runJob)(request('POST', jobSecret));

    expect(response.status).toBe(502);
  });

  it('inserts customer and business data in the template as text', () => {
    expect(escapeReminderHtml('Salão <X> & "Y"')).toBe('Salão &lt;X&gt; &amp; &quot;Y&quot;');
  });
});
