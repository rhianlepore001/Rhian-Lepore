/**
 * useBrutalTheme — Hook centralizado de tokens visuais
 * Substitui todos os `const isBeauty = userType === 'beauty'` espalhados.
 *
 * Regras:
 * 1. NUNCA use interpolação dinâmica (ex: `bg-${color}`). Tailwind não processa.
 * 2. SEMPRE use mapeamento estático (ex: `accent.bg` retorna string pronta).
 * 3. Para páginas públicas sem auth, passe override: 'barber' | 'beauty'.
 * 4. Para forçar um modo específico, use o ThemeContext (data-mode).
 */

import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';

export type ThemeVariant = 'barber' | 'beauty';
export type ColorMode = 'dark' | 'light';

/**
 * Tokens de densidade por tema (Decisão B do DS Lock).
 * barber = compacto/operacional; beauty = respirado/premium.
 * Sempre classes estáticas (Tailwind não processa interpolação dinâmica).
 */
export interface DensityTokens {
  pagePadding: string;
  cardPadding: string;
  sectionGap: string;
  inlineGap: string;
  tableRowPy: string;
  navItemPy: string;
  kpiMinHeight: string;
  touchMin: string;
}

export interface BrutalThemeTokens {
  theme: ThemeVariant;
  mode: ColorMode;
  isBeauty: boolean;
  isBarber: boolean;
  isDark: boolean;
  isLight: boolean;

  colors: {
    bg: string;
    card: string;
    surface: string;
    surfaceHover: string;
    text: string;
    textSecondary: string;
    textMuted: string;
    border: string;
    divider: string;
    overlay: string;
    inputBg: string;
    inputBorder: string;
  };

  accent: {
    text: string;
    bg: string;
    bgDim: string;
    bgHover: string;
    border: string;
    borderDim: string;
    shadow: string;
    shadowStrong: string;
    ring: string;
    hex: string;
    hexHover: string;
  };

  font: {
    heading: string;
    body: string;
    label: string;
    mono: string;
  };

  radius: {
    card: string;
    input: string;
    button: string;
    badge: string;
    avatar: string;
    modal: string;
  };

  density: DensityTokens;

  shadow: {
    card: string;
    cardHover: string;
    elevated: string;
    modal: string;
    glow: string;
    button: string;
  };

  focus: {
    ring: string;
    ringOffset: string;
  };

  status: {
    success: string;
    successBg: string;
    successBorder: string;
    danger: string;
    dangerBg: string;
    dangerBorder: string;
    warning: string;
    warningBg: string;
    warningBorder: string;
  };

  classes: {
    card: string;
    cardAccent: string;
    cardGlow: string;
    buttonPrimary: string;
    buttonSecondary: string;
    buttonGhost: string;
    buttonDanger: string;
    buttonSuccess: string;
    buttonOutline: string;
    input: string;
    inputFocus: string;
    label: string;
    error: string;
    badgeAccent: string;
    badgeDanger: string;
    badgeSuccess: string;
    badgeWarning: string;
    badgeNeutral: string;
    tableRow: string;
    tableHeader: string;
    section: string;
    pageContainer: string;
    sidebar: string;
    sidebarItem: string;
    sidebarItemActive: string;
    sidebarItemInactive: string;
    modalOverlay: string;
    modalContainer: string;
    modalHeader: string;
    focusRing: string;
  };
}

interface UseBrutalThemeOptions {
  override?: ThemeVariant;
}

function getMode(): ColorMode {
  if (typeof document === 'undefined') return 'dark';
  return (document.documentElement.getAttribute('data-mode') as ColorMode) || 'dark';
}

function getThemeFromDOM(): ThemeVariant {
  if (typeof document === 'undefined') return 'barber';
  return (document.documentElement.getAttribute('data-theme') as ThemeVariant) || 'barber';
}

const accent: BrutalThemeTokens['accent'] = {
  text: 'text-theme-accent',
  bg: 'bg-theme-accent',
  bgDim: 'bg-[var(--color-accent-dim)]',
  bgHover: 'hover:bg-theme-accentHover',
  border: 'border-[var(--color-accent-border)]',
  borderDim: 'border-[var(--color-accent-dim)]',
  shadow: 'shadow-[var(--shadow-card-accent)]',
  shadowStrong: 'shadow-[var(--shadow-card-glow)]',
  ring: 'ring-[var(--color-input-focus)]',
  hex: 'var(--color-accent)',
  hexHover: 'var(--color-accent-hover)',
};

const colors: BrutalThemeTokens['colors'] = {
  bg: 'bg-theme-bg',
  card: 'bg-theme-card',
  surface: 'bg-theme-surface',
  surfaceHover: 'hover:bg-[var(--color-card-hover)]',
  text: 'text-theme-text',
  textSecondary: 'text-theme-textSecondary',
  textMuted: 'text-[var(--color-text-muted)]',
  border: 'border-theme-border',
  divider: 'border-[var(--color-divider)]',
  overlay: 'bg-[var(--color-overlay)]',
  inputBg: 'bg-theme-input',
  inputBorder: 'border-[var(--color-input-border)]',
};

const FONT_MAP: Record<ThemeVariant, BrutalThemeTokens['font']> = {
  barber: {
    heading: 'font-heading',
    body: 'font-sans',
    label: 'font-mono',
    mono: 'font-mono',
  },
  beauty: {
    heading: 'font-heading',
    body: 'font-sans',
    label: 'font-sans',
    mono: 'font-mono',
  },
};

// Decisão A do DS Lock — barber sharp / beauty soft (antes era flat para os dois temas)
const RADIUS_MAP: Record<ThemeVariant, BrutalThemeTokens['radius']> = {
  barber: {
    card: 'rounded-lg',
    button: 'rounded-lg',
    input: 'rounded-md',
    modal: 'rounded-xl',
    badge: 'rounded-md',
    avatar: 'rounded-lg',
  },
  beauty: {
    card: 'rounded-2xl',
    button: 'rounded-xl',
    input: 'rounded-lg',
    modal: 'rounded-2xl',
    badge: 'rounded-full',
    avatar: 'rounded-full',
  },
};

// Decisão B do DS Lock — densidade por tema (novo: não existia)
const DENSITY_MAP: Record<ThemeVariant, DensityTokens> = {
  barber: {
    pagePadding: 'p-3 md:p-6',
    cardPadding: 'p-4 md:p-5',
    sectionGap: 'space-y-4 md:space-y-5',
    inlineGap: 'gap-2 md:gap-3',
    tableRowPy: 'py-2.5',
    navItemPy: 'py-2 px-3',
    kpiMinHeight: 'min-h-[140px]',
    touchMin: 'min-h-[44px] min-w-[44px]',
  },
  beauty: {
    pagePadding: 'p-4 md:p-8',
    cardPadding: 'p-5 md:p-8',
    sectionGap: 'space-y-6 md:space-y-8',
    inlineGap: 'gap-3 md:gap-4',
    tableRowPy: 'py-3.5',
    navItemPy: 'py-2.5 px-4',
    kpiMinHeight: 'min-h-[160px]',
    touchMin: 'min-h-[44px] min-w-[44px]',
  },
};

const shadow: BrutalThemeTokens['shadow'] = {
  card: 'shadow-[var(--shadow-card)]',
  cardHover: 'hover:shadow-[var(--shadow-card-hover)]',
  elevated: 'shadow-[var(--shadow-modal)]',
  modal: 'shadow-[var(--shadow-modal)]',
  glow: 'shadow-[var(--shadow-card-glow)]',
  button: 'shadow-[var(--shadow-btn-primary)]',
};

const status: BrutalThemeTokens['status'] = {
  success: 'text-[var(--color-success)]',
  successBg: 'bg-[var(--color-success-bg)]',
  successBorder: 'border-[var(--color-success-border)]',
  danger: 'text-[var(--color-danger)]',
  dangerBg: 'bg-[var(--color-danger-bg)]',
  dangerBorder: 'border-[var(--color-danger-border)]',
  warning: 'text-[var(--color-warning)]',
  warningBg: 'bg-[var(--color-warning-bg)]',
  warningBorder: 'border-[var(--color-warning-border)]',
};

const focus: BrutalThemeTokens['focus'] = {
  ring: 'ring-[var(--color-input-focus)]',
  ringOffset: 'ring-offset-2 ring-offset-[var(--color-card)]',
};

export function useBrutalTheme(options?: UseBrutalThemeOptions): BrutalThemeTokens {
  const { userType } = useAuth();
  const theme: ThemeVariant = options?.override || userType || getThemeFromDOM();
  const mode: ColorMode = getMode();
  const isBeauty = theme === 'beauty';
  const isBarber = theme === 'barber';
  const isDark = mode === 'dark';
  const isLight = mode === 'light';

  const font = FONT_MAP[theme];
  const radius = RADIUS_MAP[theme];
  const density = DENSITY_MAP[theme];

  const classes = useMemo<BrutalThemeTokens['classes']>(() => {
    const commonCard = `${colors.card} ${colors.border} ${radius.card} overflow-hidden select-none touch-pan-y`;
    const commonMobileShadow = isMobile() ? 'shadow-lite-glass' : 'shadow-promax-glass';

    return {
      card: `bg-theme-card border-theme-border border ${radius.card} overflow-hidden select-none touch-pan-y shadow-[var(--shadow-card)] transition-[box-shadow,transform] duration-200 ease-out`,
      cardAccent: `bg-theme-card border-[var(--color-accent-border)] border ${radius.card} overflow-hidden select-none touch-pan-y shadow-[var(--shadow-card-accent)] transition-[box-shadow,transform] duration-200 ease-out`,
      cardGlow: `bg-theme-card border-theme-border border ${radius.card} overflow-hidden select-none touch-pan-y shadow-[var(--shadow-card-glow)] ring-[var(--color-input-focus)] transition-[box-shadow,transform] duration-200 ease-out`,

      buttonPrimary: `bg-theme-accent text-[var(--color-bg)] font-bold ${radius.button} shadow-[var(--shadow-btn-primary)] hover:brightness-110 active:scale-[0.97] transition-all duration-150 ease-out`,
      buttonSecondary: `bg-[var(--color-card-hover)] text-theme-text border-[var(--color-border)] border font-bold ${radius.button} hover:bg-[var(--color-divider)] transition-all duration-150 ease-out`,
      buttonGhost: `bg-transparent border-transparent text-theme-accent hover:bg-[var(--color-card-hover)] transition-all duration-150 ease-out`,
      buttonDanger: `bg-[var(--color-danger-bg)] text-[var(--color-danger)] border border-[var(--color-danger-border)] ${radius.button} hover:brightness-110 transition-all duration-150 ease-out`,
      buttonSuccess: `bg-[var(--color-success-bg)] text-[var(--color-success)] border border-[var(--color-success-border)] ${radius.button} hover:brightness-110 transition-all duration-150 ease-out`,
      buttonOutline: `bg-transparent border border-[var(--color-accent-border)] text-theme-accent hover:bg-[var(--color-accent-dim)] ${radius.button} transition-all duration-150 ease-out`,

      input: `w-full px-4 py-3 ${radius.input} text-sm text-theme-text bg-[var(--color-input-bg)] border border-[var(--color-input-border)] focus:outline-none focus:border-theme-accent focus:bg-black/50 transition-all`,
      inputFocus: `focus:outline-none focus:border-theme-accent focus:ring-0`,
      label: `text-xs font-semibold text-theme-textSecondary ${font.label}`,
      error: `p-3.5 ${radius.input} text-xs bg-[var(--color-danger-bg)] text-[var(--color-danger)] border border-[var(--color-danger-border)] font-mono`,

      badgeAccent: `px-2 py-0.5 ${radius.badge} text-xs font-bold bg-[var(--color-accent-dim)] text-theme-accent border border-[var(--color-accent-border)]`,
      badgeDanger: `px-2 py-0.5 ${radius.badge} text-xs font-bold bg-[var(--color-danger-bg)] text-[var(--color-danger)] border border-[var(--color-danger-border)]`,
      badgeSuccess: `px-2 py-0.5 ${radius.badge} text-xs font-bold bg-[var(--color-success-bg)] text-[var(--color-success)] border border-[var(--color-success-border)]`,
      badgeWarning: `px-2 py-0.5 ${radius.badge} text-xs font-bold bg-[var(--color-warning-bg)] text-[var(--color-warning)] border border-[var(--color-warning-border)]`,
      badgeNeutral: `px-2 py-0.5 ${radius.badge} text-xs font-bold bg-[var(--color-card-hover)] text-theme-textSecondary border border-[var(--color-divider)]`,

      tableRow: `${radius.input} border-theme-border hover:bg-[var(--color-card-hover)] ${density.tableRowPy} transition-colors`,
      tableHeader: `text-xs ${font.mono} tracking-wide text-theme-textSecondary`,
      section: density.sectionGap,
      pageContainer: `min-h-screen bg-theme-bg text-theme-text`,
      sidebar: `bg-theme-bg border-r border-[var(--color-divider)]`,
      sidebarItem: `group relative flex items-center ${density.navItemPy} font-sans font-medium text-sm transition-all duration-200 ${radius.button}`,
      sidebarItemActive: `bg-[var(--color-accent-dim)] text-theme-accent border border-[var(--color-accent-border)]`,
      sidebarItemInactive: `text-theme-textSecondary hover:text-theme-text hover:bg-[var(--color-card-hover)]`,

      modalOverlay: `bg-[var(--color-overlay)] backdrop-blur-md transition-opacity duration-200`,
      modalContainer: `bg-[var(--color-modal-bg)] border-[var(--color-modal-border)] border ${radius.modal} shadow-[var(--shadow-modal)] transition-[opacity,transform] duration-200 ease-out`,
      modalHeader: `flex items-center justify-between border-b border-[var(--color-divider)] px-6 py-4`,
      focusRing: `focus:outline-none focus:ring-2 focus:ring-[var(--color-input-focus)] focus:ring-offset-2 focus:ring-offset-theme-card transition-shadow`,
    };
  }, [theme, mode, accent, colors, font, radius, density, shadow, focus, isBeauty]);

  return {
    theme,
    mode,
    isBeauty,
    isBarber,
    isDark,
    isLight,
    colors,
    accent,
    font,
    radius,
    density,
    shadow,
    focus,
    status,
    classes,
  };
}

/** Helper para detectar mobile no runtime (para shadows otimizadas) */
function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
}

/** Hook leve para consumir apenas o accent (quando só precisa da cor) */
export function useAccentColor(options?: UseBrutalThemeOptions): BrutalThemeTokens['accent'] {
  return useBrutalTheme(options).accent;
}

/** Hook leve para consumir apenas classes de componente */
export function useComponentClasses(options?: UseBrutalThemeOptions): BrutalThemeTokens['classes'] {
  return useBrutalTheme(options).classes;
}
