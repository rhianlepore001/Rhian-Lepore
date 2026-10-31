import { describe, expect, it } from 'vitest';
import vercel from '../vercel.json';

type Rule = { source: string; headers: { key: string; value: string }[] };
const rules = (vercel as { headers: Rule[] }).headers;

function ruleFor(source: string): Rule | undefined {
  return rules.find((r) => r.source === source);
}
const cacheControl = (source: string) => ruleFor(source)?.headers.find((h) => h.key === 'Cache-Control')?.value ?? '';

describe('cache de publicação (PWA)', () => {
  it.each(['/', '/index.html', '/sw.js', '/sw-bridge.js', '/version.json', '/registerSW.js', '/manifest.webmanifest', '/manifest-(.*).webmanifest'])(
    '%s nunca fica em cache',
    (source) => {
      const value = cacheControl(source);
      expect(value).toContain('no-cache');
      expect(value).toContain('max-age=0');
      expect(value).toContain('must-revalidate');
      expect(value).not.toContain('immutable');
    },
  );

  it('assets com hash podem ser immutable', () => {
    expect(cacheControl('/assets/(.*)')).toBe('public, max-age=31536000, immutable');
  });

  it('o sw.js pode controlar o escopo raiz', () => {
    expect(ruleFor('/sw.js')?.headers).toContainEqual({ key: 'Service-Worker-Allowed', value: '/' });
  });

  it('nenhuma regra de no-cache cobre /assets', () => {
    for (const r of rules) {
      if (cacheControl(r.source).includes('no-cache')) expect(r.source.startsWith('/assets')).toBe(false);
    }
  });
});
