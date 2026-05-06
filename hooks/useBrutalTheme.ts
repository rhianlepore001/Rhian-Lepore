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

const ACCENT_MAP: Record<ThemeVariant, Record<ColorMode, BrutalThemeTokens['accent']>> = {
  barber: {
    dark: {
      text: 'text-accent-gold',
      bg: 'bg-accent-gold',
      bgDim: 'bg-accent-gold/20',
      bgHover: 'hover:bg-accent-goldHover',
      border: 'border-accent-gold/60',
      borderDim: 'border-accent-gold/20',
      shadow: 'shadow-gold',
      shadowStrong: 'shadow-promax-depth',
      ring: 'ring-accent-gold/30',
      hex: '#C29B40',
      hexHover: '#D4AF50',
    },
    light: {
      text: 'text-accent-gold',
      bg: 'bg-accent-gold',
      bgDim: 'bg-accent-gold/15',
      bgHover: 'hover:bg-accent-goldHover',
      border: 'border-accent-gold/40',
      borderDim: 'border-accent-gold/15',
      shadow: 'shadow-gold',
      shadowStrong: 'shadow-promax-depth',
      ring: 'ring-accent-gold/20',
      hex: '#A07A2A',
      hexHover: '#B8892F',
    },
  },
  beauty: {
    dark: {
      text: 'text-beauty-neon',
      bg: 'bg-beauty-neon',
      bgDim: 'bg-beauty-neon/20',
      bgHover: 'hover:bg-beauty-neonHover',
      border: 'border-beauty-neon/50',
      borderDim: 'border-beauty-neon/20',
      shadow: 'shadow-neon',
      shadowStrong: 'shadow-neon-strong',
      ring: 'ring-beauty-neon/30',
      hex: '#A78BFA',
      hexHover: '#C4B5FD',
    },
    light: {
      text: 'text-beauty-neon',
      bg: 'bg-beauty-neon',
      bgDim: 'bg-beauty-neon/12',
      bgHover: 'hover:bg-beauty-neonHover',
      border: 'border-beauty-neon/30',
      borderDim: 'border-beauty-neon/12',
      shadow: 'shadow-neon',
      shadowStrong: 'shadow-neon-strong',
      ring: 'ring-beauty-neon/20',
      hex: '#7C3AED',
      hexHover: '#6D28D9',
    },
  },
};

const COLOR_MAP: Record<ThemeVariant, Record<ColorMode, BrutalThemeTokens['colors']>> = {
  barber: {
    dark: {
      bg: 'bg-brutal-main',
      card: 'bg-brutal-card',
      surface: 'bg-brutal-surface',
      text: 'text-text-primary',
      textSecondary: 'text-text-secondary',
      textMuted: 'text-text-muted',
      border: 'border-white/5',
      divider: 'border-white/5',
      overlay: 'bg-black/70',
      inputBg: 'bg-black/30',
      inputBorder: 'border-neutral-700/60',
    },
    light: {
      bg: 'bg-[#F5F1E8]',
      card: 'bg-white',
      surface: 'bg-[#EDE9E0]',
      text: 'text-[#1A1A1A]',
      textSecondary: 'text-[#6B5E45]',
      textMuted: 'text-black/40',
      border: 'border-black/8',
      divider: 'border-black/8',
      overlay: 'bg-[#1F180A]/45',
      inputBg: 'bg-black/4',
      inputBorder: 'border-black/10',
    },
  },
  beauty: {
    dark: {
      bg: 'bg-beauty-dark',
      card: 'bg-beauty-card',
      surface: 'bg-[#3D3A4D]',
      text: 'text-text-primary',
      textSecondary: 'text-[#B8AED4]',
      textMuted: 'text-[#7B6F96]',
      border: 'border-white/10',
      divider: 'border-white/8',
      overlay: 'bg-black/70',
      inputBg: 'bg-white/5',
      inputBorder: 'border-white/10',
    },
    light: {
      bg: 'bg-[#F7F5FF]',
      card: 'bg-white',
      surface: 'bg-[#EDE8FF]',
      text: 'text-[#1A1225]',
      textSecondary: 'text-[#5B4D7A]',
      textMuted: 'text-black/35',
      border: 'border-[#7C3AED]/12',
      divider: 'border-[#7C3AED]/10',
      overlay: 'bg-[#1F1B2E]/45',
      inputBg: 'bg-[#7C3AED]/4',
      inputBorder: 'border-[#7C3AED]/15',
    },
  },
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

const RADIUS_MAP: BrutalThemeTokens['radius'] = {
  card: 'rounded-2xl',
  input: 'rounded-xl',
  button: 'rounded-2xl',
  badge: 'rounded-full',
  avatar: 'rounded-xl',
  modal: 'rounded-2xl',
};

export function useBrutalTheme(options?: UseBrutalThemeOptions): BrutalThemeTokens {
  const { userType } = useAuth();
  const theme: ThemeVariant = options?.override || userType || getThemeFromDOM();
  const mode: ColorMode = getMode();
  const isBeauty = theme === 'beauty';
  const isBarber = theme === 'barber';
  const isDark = mode === 'dark';
  const isLight = mode === 'light';

  const accent = ACCENT_MAP[theme][mode];
  const colors = COLOR_MAP[theme][mode];
  const font = FONT_MAP[theme];
  const radius = RADIUS_MAP;

  const classes = useMemo<BrutalThemeTokens['classes']>(() => {
    const commonCard = `${colors.card} ${colors.border} ${radius.card} overflow-hidden select-none touch-pan-y`;
    const commonMobileShadow = isMobile() ? 'shadow-lite-glass' : 'shadow-promax-glass';

    return {
      card: `${commonCard} ${commonMobileShadow} transition-all duration-500`,
      cardAccent: `${commonCard} ${commonMobileShadow} ${accent.border} ${accent.shadow} transition-all duration-500`,
      cardGlow: `${commonCard} ${commonMobileShadow} ${accent.shadowStrong} ${accent.ring} transition-all duration-500`,

      buttonPrimary: `${accent.bg} ${isBeauty ? 'text-white' : 'text-black'} font-bold ${radius.button} ${accent.shadow} hover:brightness-110 active:scale-[0.97] transition-all duration-300`,
      buttonSecondary: `${isBeauty ? 'bg-white/10 text-white border-white/10 hover:bg-white/20' : 'bg-white/5 text-text-primary border-white/10 hover:bg-white/10'} font-bold ${radius.button} transition-all duration-300`,
      buttonGhost: `bg-transparent border-transparent ${accent.text} hover:bg-white/5 transition-all duration-300`,
      buttonDanger: `${isBeauty ? 'bg-red-500/20 text-red-300' : 'bg-red-500/10 text-red-400'} border border-red-500/20 ${radius.button} hover:brightness-110 transition-all duration-300`,
      buttonSuccess: `${isBeauty ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'} ${radius.button} hover:brightness-110 transition-all duration-300`,
      buttonOutline: `${isBeauty ? 'bg-transparent border-white/20 text-white hover:bg-white/5' : 'bg-transparent border-accent-gold/30 text-accent-gold hover:bg-accent-gold/5'} ${radius.button} transition-all duration-300`,

      input: `w-full px-4 py-3 ${radius.input} text-sm ${colors.text} ${colors.inputBg} ${colors.inputBorder} focus:outline-none focus:${accent.border} focus:bg-black/50 transition-all`,
      inputFocus: `focus:outline-none focus:${accent.border} focus:ring-0`,
      label: `text-xs font-semibold uppercase tracking-wider ${colors.textMuted} ${font.label}`,
      error: `p-3.5 ${radius.input} text-xs ${isBeauty ? 'bg-red-500/10 text-red-300 border-red-500/20' : 'bg-red-500/8 text-red-400 border-red-500/30'} font-mono`,

      badgeAccent: `px-2 py-0.5 ${radius.badge} text-xs font-bold uppercase ${accent.bgDim} ${accent.text} ${accent.borderDim}`,
      badgeDanger: `px-2 py-0.5 ${radius.badge} text-xs font-bold uppercase bg-red-500/10 text-red-400 border-red-500/20`,
      badgeSuccess: `px-2 py-0.5 ${radius.badge} text-xs font-bold uppercase bg-emerald-500/10 text-emerald-400 border-emerald-500/20`,
      badgeWarning: `px-2 py-0.5 ${radius.badge} text-xs font-bold uppercase bg-amber-500/10 text-amber-400 border-amber-500/20`,
      badgeNeutral: `px-2 py-0.5 ${radius.badge} text-xs font-bold uppercase bg-white/5 text-text-secondary border-white/10`,

      tableRow: `rounded-lg ${colors.border} hover:bg-white/[0.03] transition-colors`,
      tableHeader: `text-xs ${font.mono} uppercase tracking-wider text-neutral-500`,
      section: `space-y-4 md:space-y-6`,
      pageContainer: `min-h-screen ${colors.bg} text-text-primary`,
      sidebar: `${isBeauty ? 'bg-beauty-dark/95 backdrop-blur-xl' : 'bg-brutal-main'} border-r ${colors.divider}`,
      sidebarItem: `group relative flex items-center px-4 py-3 font-sans font-medium text-sm transition-all duration-200 rounded-xl`,
      sidebarItemActive: `${accent.bgDim} ${accent.text} ${accent.borderDim} before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-0.5 before:rounded-full before:${accent.bg.replace('bg-', '')}`,
      sidebarItemInactive: `text-text-secondary hover:${colors.text} hover:bg-white/[0.04]`,

      modalOverlay: `${isBeauty ? 'bg-beauty-dark/80' : 'bg-black/80'} backdrop-blur-md transition-opacity duration-300`,
      modalContainer: `${colors.card} ${colors.border} ${radius.modal} shadow-promax-glass transform transition-all duration-300 animate-in fade-in zoom-in-95`,
      modalHeader: `flex items-center justify-between border-b ${colors.divider} px-6 py-4`,
    };
  }, [theme, mode, accent, colors, font, radius]);

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
