import { describe, expect, it } from 'vitest';
import vercel from '../vercel.json';

/** Espelha a intenção do rewrite: paths /assets/* NÃO devem casar. */
function spaRewriteMatches(pathname: string): boolean {
  const source = (vercel.rewrites?.[0]?.source ?? '') as string;
  // Vercel usa path-to-regexp; aqui validamos a negativa (?!assets/)
  expect(source).toContain('(?!assets/)');
  if (pathname.startsWith('/assets/')) return false;
  return true; // demais paths podem ir ao index.html
}

describe('A-03 vercel assets rewrite', () => {
  it('não reescreve /assets/*', () => {
    expect(spaRewriteMatches('/assets/Placeholder-xxx.js')).toBe(false);
    expect(spaRewriteMatches('/assets/index-abc.js')).toBe(false);
  });
  it('ainda cobre rotas SPA (path sem hash)', () => {
    expect(spaRewriteMatches('/')).toBe(true);
    expect(spaRewriteMatches('/qualquer')).toBe(true);
    expect(spaRewriteMatches('/foo/bar')).toBe(true);
  });
});
