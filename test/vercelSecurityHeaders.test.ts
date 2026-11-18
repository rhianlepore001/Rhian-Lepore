import { describe, expect, it } from 'vitest';
import vercel from '../vercel.json';

describe('A-04 vercel security headers', () => {
  const headers = (vercel as { headers?: { source: string; headers: { key: string; value: string }[] }[] }).headers ?? [];
  const flat = Object.fromEntries((headers[0]?.headers ?? []).map((h) => [h.key, h.value]));

  it('define headers básicos', () => {
    expect(flat['X-Content-Type-Options']).toBe('nosniff');
    // SAMEORIGIN: a landing embute a simulação (/#/demo) num iframe da mesma origem.
    expect(flat['X-Frame-Options']).toBe('SAMEORIGIN');
    expect(flat['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(flat['Permissions-Policy']).toContain('camera=()');
  });

  it('CSP é Report-Only (não enforce)', () => {
    expect(flat['Content-Security-Policy-Report-Only']).toBeTruthy();
    expect(flat['Content-Security-Policy']).toBeUndefined();
    const csp = flat['Content-Security-Policy-Report-Only'];
    expect(csp).toContain('https://*.supabase.co');
    expect(csp).toContain('https://js.stripe.com');
    expect(csp).toContain("frame-ancestors 'self'");
    expect(csp).not.toContain("frame-ancestors 'none'");
  });

  it('só a própria origem (e a Stripe) pode ser embutida; ninguém de fora embute o site', () => {
    const csp = flat['Content-Security-Policy-Report-Only'];
    const directive = (name: string) => csp.split(';').map((d) => d.trim()).find((d) => d.startsWith(`${name} `)) ?? '';
    expect(directive('frame-ancestors')).toBe("frame-ancestors 'self'");
    expect(directive('frame-src').split(/\s+/).slice(1).sort()).toEqual(["'self'", 'https://hooks.stripe.com', 'https://js.stripe.com'].sort());
    expect(flat['X-Frame-Options']).not.toMatch(/ALLOW|\*/i);
  });
});
