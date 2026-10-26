/**
 * Erro de "chunk" (arquivo JS de uma tela) que sumiu depois de um deploy: a aba aberta ainda
 * aponta para os arquivos da versão anterior. Não é bug do usuário; recarregar resolve.
 *  - Chrome/Edge: "Failed to fetch dynamically imported module: …/Agenda-xxxx.js"
 *  - Safari: "Importing a module script failed."
 *  - Firefox: "error loading dynamically imported module"
 *  - Vite (preload de CSS/JS): "Unable to preload CSS for …"
 */
const CHUNK_ERROR_RE = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS|ChunkLoadError|Loading chunk [\w-]+ failed/i;

export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const e = error as { name?: unknown; message?: unknown };
  const text = `${typeof e.name === 'string' ? e.name : ''} ${typeof e.message === 'string' ? e.message : String(error)}`;
  return CHUNK_ERROR_RE.test(text);
}

export const CHUNK_RELOAD_KEY = 'agendix_chunk_reload_at';
/** Janela em que não recarregamos de novo sozinhos (evita loop se o arquivo continuar faltando). */
export const CHUNK_RELOAD_WINDOW_MS = 5 * 60 * 1000;

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

/**
 * Recarrega a página uma única vez por janela. Devolve true se disparou o reload; false se já
 * recarregou há pouco (ou se não há storage), e aí a tela de "nova versão" fica com o botão.
 */
export function reloadOnceForNewVersion(
  reload: () => void = () => window.location.reload(),
  storage: StorageLike | null = typeof window !== 'undefined' ? safeSessionStorage() : null,
  now: number = Date.now(),
): boolean {
  if (!storage) return false;
  const last = Number(storage.getItem(CHUNK_RELOAD_KEY) || 0);
  if (Number.isFinite(last) && last > 0 && now - last < CHUNK_RELOAD_WINDOW_MS) return false;
  try {
    storage.setItem(CHUNK_RELOAD_KEY, String(now));
  } catch {
    return false; // sem como marcar → não arrisca loop
  }
  window.dispatchEvent(new Event('agendix:before-reload'));
  reload();
  return true;
}

function safeSessionStorage(): StorageLike | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}
