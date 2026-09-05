import React from 'react';

export const CHUNK_IMPORT_TIMEOUT_MS = 12_000;
export const STALE_CHUNK_RELOAD_KEY = 'agendix:stale-chunk-reload';
const RELOAD_COOLDOWN_MS = 15_000;

export async function clearPwaCaches(): Promise<void> {
  try {
    const regs = await navigator.serviceWorker?.getRegistrations();
    await Promise.all((regs ?? []).map((reg) => reg.unregister()));
  } catch {
    // SW pode estar indisponível (Safari privado, etc.)
  }
  try {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  } catch {
    // Cache Storage pode estar bloqueado
  }
}

/**
 * Após um deploy, o service worker pode entregar JS velho que pede chunks
 * que já não existem. Recarrega uma vez com cache limpo.
 */
export async function reloadPastStaleDeployment(): Promise<void> {
  const now = Date.now();
  const last = Number(sessionStorage.getItem(STALE_CHUNK_RELOAD_KEY) || '0');
  if (now - last <= RELOAD_COOLDOWN_MS) return;
  sessionStorage.setItem(STALE_CHUNK_RELOAD_KEY, String(now));
  await clearPwaCaches();
  window.location.reload();
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = window.setTimeout(() => {
      reject(new Error('Timeout ao carregar módulo da aplicação'));
    }, ms);
    promise.then(
      (value) => {
        window.clearTimeout(id);
        resolve(value);
      },
      (err) => {
        window.clearTimeout(id);
        reject(err);
      },
    );
  });
}

export async function loadWithChunkReload<T>(
  importer: () => Promise<T>,
  timeoutMs: number = CHUNK_IMPORT_TIMEOUT_MS,
): Promise<T> {
  try {
    return await withTimeout(importer(), timeoutMs);
  } catch (error) {
    await reloadPastStaleDeployment();
    throw error;
  }
}

export function lazyWithChunkReload<T extends React.ComponentType<any>>(
  importer: () => Promise<{ default: T }>,
): React.LazyExoticComponent<T> {
  return React.lazy(() => loadWithChunkReload(importer));
}
