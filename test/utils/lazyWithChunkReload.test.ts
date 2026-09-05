import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CHUNK_IMPORT_TIMEOUT_MS,
  STALE_CHUNK_RELOAD_KEY,
  clearPwaCaches,
  loadWithChunkReload,
  reloadPastStaleDeployment,
} from '@/utils/lazyWithChunkReload';

describe('lazyWithChunkReload', () => {
  const originalReload = window.location.reload;
  const unregister = vi.fn(async () => true);
  const cachesDelete = vi.fn(async () => true);

  beforeEach(() => {
    sessionStorage.clear();
    unregister.mockClear();
    cachesDelete.mockClear();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: vi.fn() },
    });
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        getRegistrations: vi.fn(async () => [{ unregister }]),
      },
    });
    Object.defineProperty(window, 'caches', {
      configurable: true,
      value: {
        keys: vi.fn(async () => ['workbox-precache-v2']),
        delete: cachesDelete,
      },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: originalReload },
    });
  });

  it('resolve o import quando o chunk chega a tempo', async () => {
    const mod = { default: () => null };
    await expect(loadWithChunkReload(async () => mod, 50)).resolves.toBe(mod);
    expect(window.location.reload).not.toHaveBeenCalled();
  });

  it('recarrega com cache limpo se o chunk estourar o timeout', async () => {
    await expect(
      loadWithChunkReload(() => new Promise(() => {}), 20),
    ).rejects.toThrow('Timeout ao carregar módulo da aplicação');

    expect(unregister).toHaveBeenCalledTimes(1);
    expect(cachesDelete).toHaveBeenCalledWith('workbox-precache-v2');
    expect(window.location.reload).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(STALE_CHUNK_RELOAD_KEY)).toBeTruthy();
  });

  it('não entra em loop de reload dentro do cooldown', async () => {
    sessionStorage.setItem(STALE_CHUNK_RELOAD_KEY, String(Date.now()));
    await reloadPastStaleDeployment();
    expect(window.location.reload).not.toHaveBeenCalled();
  });

  it('limpa registrations e caches do PWA', async () => {
    await clearPwaCaches();
    expect(unregister).toHaveBeenCalledTimes(1);
    expect(cachesDelete).toHaveBeenCalledWith('workbox-precache-v2');
  });

  it('expõe timeout padrão acima de 10s para 3G', () => {
    expect(CHUNK_IMPORT_TIMEOUT_MS).toBeGreaterThanOrEqual(10_000);
  });
});
