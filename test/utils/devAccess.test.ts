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

  it('retorna true quando app_metadata.is_dev e true mesmo com env vazia', () => {
    vi.stubEnv('VITE_DEV_EMAIL', '');
    expect(resolveIsDev('qualquer@example.com', { is_dev: true })).toBe(true);
  });

  it('nao libera ADM quando is_dev e false, ausente ou string "true"', () => {
    vi.stubEnv('VITE_DEV_EMAIL', '');
    expect(resolveIsDev('qualquer@example.com', { is_dev: false })).toBe(false);
    expect(resolveIsDev('qualquer@example.com', {})).toBe(false);
    expect(resolveIsDev('qualquer@example.com', { is_dev: 'true' })).toBe(false);
    expect(resolveIsDev('qualquer@example.com', null)).toBe(false);
    expect(resolveIsDev('qualquer@example.com', undefined)).toBe(false);
  });

  it('retorna true com is_dev true mesmo quando o email difere da env', () => {
    vi.stubEnv('VITE_DEV_EMAIL', 'admin@example.com');
    expect(resolveIsDev('outro@example.com', { is_dev: true })).toBe(true);
  });
});
