/**
 * Resolve se a sessão atual tem modo admin/dev no frontend.
 *
 * Fonte única: `VITE_DEV_EMAIL` (build-time). Sem a variável, ninguém recebe
 * o modo — fallback seguro para repo público. Usado por Auditoria, Lixeira,
 * Preview UI, DevBugButton e switcher de tema no Header.
 */
export function resolveIsDev(userEmail: string | undefined | null): boolean {
  const devEmail = String(import.meta.env.VITE_DEV_EMAIL || '').trim();
  if (!devEmail || !userEmail) return false;
  return userEmail.toLowerCase() === devEmail.toLowerCase();
}
