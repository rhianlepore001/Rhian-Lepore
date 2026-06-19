import React from 'react';
import { useBrutalTheme, type ThemeVariant } from '../../hooks/useBrutalTheme';

/**
 * Card canônico — apenas `outlined` (default) e `elevated`.
 * Variants legados `accent` e `glow` são aceitos por compat e mapeados para `elevated`
 * com aviso de deprecação em runtime (dev only).
 */
export type CardVariant = 'outlined' | 'elevated';
type CardVariantInput = CardVariant | 'default' | 'accent' | 'glow';

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariantInput;
  title?: React.ReactNode;
  action?: React.ReactNode;
  noPadding?: boolean;
  className?: string;
  id?: string;
  style?: React.CSSProperties;
  forceTheme?: ThemeVariant;
}

const DEPRECATED_VARIANTS = new Set(['default', 'accent', 'glow']);

function normalizeVariant(variant: CardVariantInput): CardVariant {
  if (variant === 'elevated') return 'elevated';
  if (variant === 'outlined') return 'outlined';
  if (variant === 'accent' || variant === 'glow') return 'elevated';
  return 'outlined';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'outlined',
  title,
  action,
  noPadding = false,
  className = '',
  id,
  style,
  forceTheme,
}) => {
  const { classes, colors, density, radius, shadow } = useBrutalTheme({ override: forceTheme });

  if (import.meta.env.DEV && DEPRECATED_VARIANTS.has(variant)) {
    console.warn(
      `[ui/Card] variant="${variant}" está deprecado. Use "outlined" ou "elevated". (DS Lock §3.3)`
    );
  }

  const normalized = normalizeVariant(variant);

  const containerByVariant: Record<CardVariant, string> = {
    outlined: [
      colors.card,
      colors.border,
      'border',
      radius.card,
      'overflow-hidden select-none',
      'transition-[box-shadow,transform] duration-200 ease-out',
    ].join(' '),
    elevated: [
      colors.card,
      radius.card,
      'overflow-hidden select-none',
      shadow.card,
      'transition-[box-shadow,transform] duration-200 ease-out',
    ].join(' '),
  };

  // mantém a forma legada do classes.card como fallback se o usuário forçar default
  const containerClass =
    variant === 'default' ? classes.card : containerByVariant[normalized];

  return (
    <div
      id={id}
      className={[containerClass, className].filter(Boolean).join(' ')}
      style={style}
    >
      {(title || action) && (
        <div
          className={[
            'flex items-center justify-between',
            density.cardPadding,
            `border-b ${colors.divider}`,
          ].join(' ')}
        >
          {title && (
            <div className="flex-1 min-w-0">
              {typeof title === 'string' ? (
                <h3 className={`text-base md:text-lg font-bold tracking-tight ${colors.text}`}>
                  {title}
                </h3>
              ) : (
                title
              )}
            </div>
          )}
          {action && <div className="ml-3 shrink-0">{action}</div>}
        </div>
      )}
      <div className={noPadding ? '' : density.cardPadding}>
        {children}
      </div>
    </div>
  );
};
