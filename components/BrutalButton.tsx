import React from 'react';
import { Button } from './ui/Button';
import type { ThemeVariant } from '../hooks/useBrutalTheme';

/**
 * @deprecated Use `Button` de `components/ui/Button`. Wrapper de compat enquanto telas
 * fora do escopo da auditoria são migradas. Mapeamento direto de props.
 *
 * Plano de migração: trocar imports para `import { Button } from 'components/ui/Button'`.
 */
interface BrutalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  fullWidth?: boolean;
  loading?: boolean;
  forceTheme?: ThemeVariant;
}

export const BrutalButton: React.FC<BrutalButtonProps> = ({
  children,
  variant,
  size,
  icon,
  fullWidth,
  loading,
  forceTheme,
  ...rest
}) => {
  if (import.meta.env.DEV) {
    console.warn(
      '[BrutalButton] deprecated — use `Button` de components/ui/Button.'
    );
  }
  return (
    <Button
      variant={variant}
      size={size}
      icon={icon}
      fullWidth={fullWidth}
      loading={loading}
      forceTheme={forceTheme}
      {...rest}
    >
      {children}
    </Button>
  );
};
