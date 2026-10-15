import { describe, expect, it } from 'vitest';
import vercel from '../vercel.json';

describe('A-04 vercel security headers', () => {
  const headers = (vercel as { headers?: { source: string; headers: { key: string; value: string }[] }[] }).headers ?? [];
  const flat = Object.fromEntries((headers[0]?.headers ?? []).map((h) => [h.key, h.value]));

  it('define headers básicos', () => {
    expect(flat['X-Content-Type-Options']).toBe('nosniff');
    expect(flat['X-Frame-Options']).toBe('DENY');
    expect(flat['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(flat['Permissions-Policy']).toContain('camera=()');
  });

  it('CSP é Report-Only (não enforce)', () => {
    expect(flat['Content-Security-Policy-Report-Only']).toBeTruthy();
    expect(flat['Content-Security-Policy']).toBeUndefined();
    const csp = flat['Content-Security-Policy-Report-Only'];
    expect(csp).toContain('https://*.supabase.co');
    expect(csp).toContain('https://js.stripe.com');
    expect(csp).toContain("frame-ancestors 'none'");
  });
});
