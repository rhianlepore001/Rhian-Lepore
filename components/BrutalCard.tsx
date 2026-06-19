import React from 'react';
import { Card, type CardVariant } from './ui/Card';
import type { ThemeVariant } from '../hooks/useBrutalTheme';

/**
 * @deprecated Use `Card` de `components/ui/Card`. Esta versão mapeia as props legadas
 * para a API canônica e segue como wrapper apenas para minimizar regressão.
 * Mapeamento:
 * - `accent={true}` e `glow={true}` → `variant="elevated"` (DS Lock §3.3)
 * - `animate` é ignorado (motion controlado por `prefers-reduced-motion`, DS Lock §2)
 *
 * Plano de migração: trocar imports para `import { Card } from 'components/ui/Card'`.
 */
interface BrutalCardProps {
  id?: string;
  children: React.ReactNode;
  className?: string;
  title?: string | React.ReactNode;
  action?: React.ReactNode;
  noPadding?: boolean;
  accent?: boolean;
  glow?: boolean;
  /** @deprecated motion é controlado globalmente — não passe mais animate */
  animate?: boolean;
  forceTheme?: ThemeVariant;
  style?: React.CSSProperties;
}

export const BrutalCard: React.FC<BrutalCardProps> = ({
  id,
  children,
  className,
  title,
  action,
  noPadding,
  accent,
  glow,
  forceTheme,
  style,
}) => {
  if (import.meta.env.DEV) {
    console.warn(
      '[BrutalCard] deprecated — use `Card` de components/ui/Card. ' +
        'props mapeadas automaticamente; animate é ignorado.'
    );
  }
  const variant: CardVariant = accent || glow ? 'elevated' : 'outlined';

  return (
    <Card
      id={id}
      className={className}
      title={title}
      action={action}
      noPadding={noPadding}
      variant={variant}
      forceTheme={forceTheme}
      style={style}
    >
      {children}
    </Card>
  );
};
