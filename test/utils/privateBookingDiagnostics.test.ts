import { describe, it, expect, vi, afterEach } from 'vitest';
import { supabase } from '../../lib/supabase';
import { logger } from '../../utils/Logger';
import { captureContext, isBugReportChrome, stopCapturing } from '../../lib/bugReport';
vi.mock('../../lib/supabase', () => ({ supabase: { rpc: vi.fn().mockResolvedValue({ error: null }) } }));
const token = 'b'.repeat(64);
afterEach(() => { window.history.replaceState({}, '', '/'); stopCapturing(); vi.restoreAllMocks(); });
describe('private link diagnostic privacy', () => {
  it('redacts the bearer token from error context and stacks', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const url = `/#/book/espaco?edit=fictional-id&token=${token}`;
    window.history.replaceState({}, '', url);
    await logger.error('Fictional failure', new Error(url), { management_token: token });
    expect(JSON.stringify(vi.mocked(supabase.rpc).mock.lastCall)).not.toContain(token);
  });
  it('redacts the hash URL from bug reports and excludes the private link from screenshots', () => {
    window.history.replaceState({}, '', `/#/minha-area/espaco?booking=fictional-id&token=${token}`);
    expect(JSON.stringify(captureContext())).not.toContain(token);
    const el = document.createElement('div'); el.setAttribute('data-private-booking-link', '');
    expect(isBugReportChrome(el)).toBe(true);
  });
});
