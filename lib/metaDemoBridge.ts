import { isDemoPreview } from './demo/mode';

/** Canal postMessage entre a demo embutida (/demo-preview) e a landing. Sem Pixel no iframe. */
export const META_DEMO_MESSAGE_TYPE = 'agendix:meta-demo' as const;

export type MetaDemoScreen =
  | 'inicio'
  | 'agenda'
  | 'fila'
  | 'financeiro'
  | 'comissoes'
  | 'clientes'
  | 'hora_cadeira'
  | 'presenca';

export type MetaDemoMessage =
  | { type: typeof META_DEMO_MESSAGE_TYPE; action: 'start' }
  | { type: typeof META_DEMO_MESSAGE_TYPE; action: 'screen'; screen: MetaDemoScreen };

const SCREENS = new Set<string>([
  'inicio', 'agenda', 'fila', 'financeiro', 'comissoes', 'clientes', 'hora_cadeira', 'presenca',
]);

/** Mapeia a rota interna da demo para o token de tela rastreável (ou null se fora da lista). */
export function demoPathToScreen(innerPath: string, search = ''): MetaDemoScreen | null {
  const path = innerPath.split('?')[0] || '/';
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  if (path === '/' || path === '') return 'inicio';
  if (path === '/agenda') return 'agenda';
  if (path === '/fila' || path.startsWith('/fila/')) return 'fila';
  if (path === '/clientes' || path.startsWith('/clientes/')) return 'clientes';
  if (path === '/resultados-por-hora') return 'hora_cadeira';
  if (path === '/financeiro') {
    return params.get('tab') === 'commissions' ? 'comissoes' : 'financeiro';
  }
  if (path.startsWith('/financeiro/')) return 'financeiro';
  return null;
}

export function isMetaDemoMessage(data: unknown, origin: string, expectedOrigin: string): data is MetaDemoMessage {
  if (origin !== expectedOrigin) return false;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  const message = data as Record<string, unknown>;
  if (message.type !== META_DEMO_MESSAGE_TYPE) return false;
  if (message.action === 'start') return Object.keys(message).every(key => key === 'type' || key === 'action');
  if (message.action === 'screen') {
    return typeof message.screen === 'string' && SCREENS.has(message.screen)
      && Object.keys(message).every(key => key === 'type' || key === 'action' || key === 'screen');
  }
  return false;
}

type MetaDemoPayload =
  | { action: 'start' }
  | { action: 'screen'; screen: MetaDemoScreen };

/** Envia evento à landing-pai. Só no iframe /demo-preview e só para a mesma origem. */
export function postMetaDemoToParent(message: MetaDemoPayload): void {
  if (!isDemoPreview() || typeof window === 'undefined' || window.parent === window) return;
  try {
    const payload: MetaDemoMessage = { type: META_DEMO_MESSAGE_TYPE, ...message };
    window.parent.postMessage(payload, window.location.origin);
  } catch { void 0; }
}
