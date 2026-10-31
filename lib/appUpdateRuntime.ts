import { createUpdateManager, type UpdateManager } from './appUpdate';

/** Versão do código em execução (injetada no build; "dev" fora do build de produção). */
export const CURRENT_BUILD_ID: string = typeof __APP_BUILD_ID__ === 'undefined' ? 'dev' : __APP_BUILD_ID__;

let manager: UpdateManager | null = null;

/** Gerenciador único do app. No servidor de desenvolvimento (sem Service Worker) fica inerte. */
export function getAppUpdateManager(): UpdateManager | null {
  if (typeof window === 'undefined' || import.meta.env.DEV) return null;
  if (!manager) manager = createUpdateManager({ currentVersion: CURRENT_BUILD_ID });
  return manager;
}
