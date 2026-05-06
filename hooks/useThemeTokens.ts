/**
 * useThemeTokens — Hook para consumir variáveis CSS do design system.
 * Útil quando precisar de valores dinâmicos (ex: cores para Chart.js, canvas, etc.)
 * que não podem ser expressos apenas com classes Tailwind.
 *
 * NOTA: Para estilização de componentes, prefira useBrutalTheme() que retorna
 * classes Tailwind prontas. Este hook é para casos especiais.
 */

import { useSyncExternalStore } from 'react';

export interface ThemeTokenValues {
  bg: string;
  card: string;
  surface: string;
  accent: string;
  accentHover: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  divider: string;
  overlay: string;
  inputBg: string;
  inputBorder: string;
  inputFocus: string;
  danger: string;
  success: string;
  warning: string;
}

let cachedSnapshot: ThemeTokenValues | null = null;

function getSnapshot(): ThemeTokenValues {
  const style = getComputedStyle(document.documentElement);
  const next: ThemeTokenValues = {
    bg: style.getPropertyValue('--color-bg').trim(),
    card: style.getPropertyValue('--color-card').trim(),
    surface: style.getPropertyValue('--color-surface').trim(),
    accent: style.getPropertyValue('--color-accent').trim(),
    accentHover: style.getPropertyValue('--color-accent-hover').trim(),
    text: style.getPropertyValue('--color-text').trim(),
    textSecondary: style.getPropertyValue('--color-text-secondary').trim(),
    textMuted: style.getPropertyValue('--color-text-muted').trim(),
    border: style.getPropertyValue('--color-border').trim(),
    divider: style.getPropertyValue('--color-divider').trim(),
    overlay: style.getPropertyValue('--color-overlay').trim(),
    inputBg: style.getPropertyValue('--color-input-bg').trim(),
    inputBorder: style.getPropertyValue('--color-input-border').trim(),
    inputFocus: style.getPropertyValue('--color-input-focus').trim(),
    danger: style.getPropertyValue('--color-danger').trim(),
    success: style.getPropertyValue('--color-success').trim(),
    warning: style.getPropertyValue('--color-warning').trim(),
  };

  if (
    cachedSnapshot &&
    cachedSnapshot.bg === next.bg &&
    cachedSnapshot.card === next.card &&
    cachedSnapshot.surface === next.surface &&
    cachedSnapshot.accent === next.accent &&
    cachedSnapshot.accentHover === next.accentHover &&
    cachedSnapshot.text === next.text &&
    cachedSnapshot.textSecondary === next.textSecondary &&
    cachedSnapshot.textMuted === next.textMuted &&
    cachedSnapshot.border === next.border &&
    cachedSnapshot.divider === next.divider &&
    cachedSnapshot.overlay === next.overlay &&
    cachedSnapshot.inputBg === next.inputBg &&
    cachedSnapshot.inputBorder === next.inputBorder &&
    cachedSnapshot.inputFocus === next.inputFocus &&
    cachedSnapshot.danger === next.danger &&
    cachedSnapshot.success === next.success &&
    cachedSnapshot.warning === next.warning
  ) {
    return cachedSnapshot;
  }

  cachedSnapshot = next;
  return next;
}

function subscribe(callback: () => void): () => void {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme', 'data-mode'],
  });
  return () => observer.disconnect();
}

export function useThemeTokens(): ThemeTokenValues {
  return useSyncExternalStore<ThemeTokenValues>(
    subscribe,
    getSnapshot,
    () => ({
      bg: '#121212',
      card: '#1E1E1E',
      surface: '#252525',
      accent: '#C29B40',
      accentHover: '#D4AF50',
      text: '#EAEAEA',
      textSecondary: '#A0A0A0',
      textMuted: '#525252',
      border: 'rgba(255, 255, 255, 0.05)',
      divider: 'rgba(255, 255, 255, 0.08)',
      overlay: 'rgba(0, 0, 0, 0.7)',
      inputBg: 'rgba(0, 0, 0, 0.3)',
      inputBorder: 'rgba(255, 255, 255, 0.06)',
      inputFocus: 'rgba(194, 155, 64, 0.6)',
      danger: '#EF4444',
      success: '#10B981',
      warning: '#F59E0B',
    })
  );
}
