/**
 * Resolve se a sessão atual tem modo admin/dev no frontend.
 *
 * Duas fontes (nessa ordem):
 * 1. `app_metadata.is_dev === true` no JWT do Supabase (fonte segura; só o
 *    backend/service role grava `raw_app_meta_data`).
 * 2. Fallback de build: email da sessão igual a `VITE_DEV_EMAIL` (trim,
 *    case-insensitive). Sem a env e sem a flag, ninguém recebe o modo —
 *    seguro para repo público.
 *
 * Usado por Auditoria, Lixeira, Preview UI, DevBugButton e switcher de tema
 * no Header.
 */
function hasDevFlag(appMetadata: unknown): boolean {
  if (!appMetadata || typeof appMetadata !== 'object') return false;
  return (appMetadata as { is_dev?: unknown }).is_dev === true;
}

export function resolveIsDev(
  userEmail: string | undefined | null,
  appMetadata?: unknown,
): boolean {
  if (hasDevFlag(appMetadata)) return true;

  const devEmail = String(import.meta.env.VITE_DEV_EMAIL || '').trim();
  if (!devEmail || !userEmail) return false;
  return userEmail.toLowerCase() === devEmail.toLowerCase();
}
