import { useSyncExternalStore } from 'react';

export type ColorMode = 'dark' | 'light';

/**
 * Fonte única de verdade para o modo de cor (claro/escuro).
 *
 * O modo é controlado pelo atributo `data-mode` no `<html>` (ver ThemeContext).
 * Aqui expomos as primitivas de leitura reativa para que tanto o ThemeContext
 * quanto o useBrutalTheme observem a MESMA store, sem duplicar a lógica do
 * MutationObserver (evita divergência entre as duas cópias).
 */

export function getModeSnapshot(): ColorMode {
  if (typeof document === 'undefined') return 'dark';
  return (document.documentElement.getAttribute('data-mode') as ColorMode) || 'dark';
}

export function subscribeMode(callback: () => void): () => void {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-mode'],
  });
  return () => observer.disconnect();
}

/** Hook reativo: re-renderiza o componente quando `data-mode` muda. */
export function useColorMode(): ColorMode {
  return useSyncExternalStore<ColorMode>(subscribeMode, getModeSnapshot, () => 'dark');
}
