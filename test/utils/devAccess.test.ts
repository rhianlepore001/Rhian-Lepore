import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveIsDev } from '@/utils/devAccess';

describe('resolveIsDev', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('retorna false quando VITE_DEV_EMAIL nao esta definida', () => {
    vi.stubEnv('VITE_DEV_EMAIL', '');
    expect(resolveIsDev('rleporesilva@gmail.com')).toBe(false);
  });

  it('retorna false quando o email da sessao e diferente', () => {
    vi.stubEnv('VITE_DEV_EMAIL', 'admin@example.com');
    expect(resolveIsDev('outro@example.com')).toBe(false);
  });

  it('retorna false quando a sessao nao tem email', () => {
    vi.stubEnv('VITE_DEV_EMAIL', 'admin@example.com');
    expect(resolveIsDev(null)).toBe(false);
    expect(resolveIsDev(undefined)).toBe(false);
  });

  it('retorna true quando o email bate com a env (case-insensitive)', () => {
    vi.stubEnv('VITE_DEV_EMAIL', 'Admin@Example.com');
    expect(resolveIsDev('admin@example.com')).toBe(true);
  });

  it('ignora espacos em volta da env', () => {
    vi.stubEnv('VITE_DEV_EMAIL', '  admin@example.com  ');
    expect(resolveIsDev('admin@example.com')).toBe(true);
  });
});
