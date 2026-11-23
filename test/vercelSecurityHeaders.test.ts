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

  it('aplica a CSP de scripts ao app e ao iframe da demonstração', () => {
    const enforced = flat['Content-Security-Policy'];
    const iframe = headers.find((entry) => entry.source === '/demo-preview');
    expect(iframe?.headers.find((header) => header.key === 'Content-Security-Policy')?.value).toBe(enforced);
    expect(enforced).toContain("script-src 'self' https://js.stripe.com https://connect.facebook.net");
    expect(enforced).toContain("script-src-attr 'none'");
    expect(enforced).toContain("frame-ancestors 'self'");
    expect(enforced).not.toMatch(/unsafe-inline|unsafe-eval/);
  });

  it('mantém as origens de API autorizadas na política de observação', () => {
    const report = flat['Content-Security-Policy-Report-Only'];
    expect(report).toContain('https://*.supabase.co');
    expect(report).toContain('https://api.stripe.com');
    expect(report).not.toContain('unsafe-eval');
  });

  it('só a própria origem (e a Stripe) pode ser embutida; ninguém de fora embute o site', () => {
    const csp = flat['Content-Security-Policy-Report-Only'];
    const directive = (name: string) => csp.split(';').map((d) => d.trim()).find((d) => d.startsWith(`${name} `)) ?? '';
    expect(directive('frame-ancestors')).toBe("frame-ancestors 'self'");
    expect(directive('frame-src').split(/\s+/).slice(1).sort()).toEqual(["'self'", 'https://hooks.stripe.com', 'https://js.stripe.com'].sort());
    expect(flat['X-Frame-Options']).not.toMatch(/ALLOW|\*/i);
  });
});
