import { describe, it, expect, vi } from 'vitest';
import { isChunkLoadError, reloadOnceForNewVersion, CHUNK_RELOAD_KEY, CHUNK_RELOAD_WINDOW_MS } from '../../utils/chunkLoadError';

const mem = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); } };
};

describe('isChunkLoadError', () => {
  it.each([
    'TypeError: Failed to fetch dynamically imported module: https://www.agendixstudio.com/assets/Agenda-UO9PMw3_.js',
    'Importing a module script failed.',
    'error loading dynamically imported module: https://x/assets/Finance-1.js',
    'Unable to preload CSS for /assets/index-1.css',
  ])('reconhece %s', (msg) => {
    expect(isChunkLoadError(new TypeError(msg))).toBe(true);
  });
  it('não confunde com outros erros', () => {
    expect(isChunkLoadError(new Error('SecurityError: Attempt to use history.replaceState() more than 100 times per 10 seconds'))).toBe(false);
    expect(isChunkLoadError(new Error('Cannot read properties of undefined'))).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
  });
});

describe('reloadOnceForNewVersion (sem loop)', () => {
  it('recarrega na primeira vez e marca o horário', () => {
    const s = mem(); const reload = vi.fn();
    expect(reloadOnceForNewVersion(reload, s, 1_000_000)).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(s.getItem(CHUNK_RELOAD_KEY)).toBe('1000000');
  });
  it('não recarrega de novo dentro da janela (fica a tela com o botão)', () => {
    const s = mem(); const reload = vi.fn();
    reloadOnceForNewVersion(reload, s, 1_000_000);
    expect(reloadOnceForNewVersion(reload, s, 1_000_000 + 10_000)).toBe(false);
    expect(reloadOnceForNewVersion(reload, s, 1_000_000 + CHUNK_RELOAD_WINDOW_MS - 1)).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });
  it('depois da janela pode recarregar de novo (deploy seguinte)', () => {
    const s = mem(); const reload = vi.fn();
    reloadOnceForNewVersion(reload, s, 1_000_000);
    expect(reloadOnceForNewVersion(reload, s, 1_000_000 + CHUNK_RELOAD_WINDOW_MS + 1)).toBe(true);
    expect(reload).toHaveBeenCalledTimes(2);
  });
  it('sem storage (ou storage que falha) nunca recarrega sozinho', () => {
    const reload = vi.fn();
    expect(reloadOnceForNewVersion(reload, null)).toBe(false);
    const broken = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
    expect(reloadOnceForNewVersion(reload, broken)).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});
