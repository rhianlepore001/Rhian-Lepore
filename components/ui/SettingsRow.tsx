import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';

interface SettingsRowProps {
  label: string;
  /** Texto de ajuda abaixo do label — explica a consequência da opção. */
  help?: string;
  icon?: LucideIcon;
  /** Controle à direita: switch, select, botão etc. */
  children?: React.ReactNode;
  className?: string;
}

/**
 * Linha de configuração padrão do DS v1.1: label + ajuda à esquerda, controle
 * à direita. Empilhe várias dentro de um SettingsSection com `divide-y`:
 *
 *   <div className="divide-y divide-[var(--color-divider)]">
 *     <SettingsRow label="..." help="...">{controle}</SettingsRow>
 *   </div>
 */
export const SettingsRow: React.FC<SettingsRowProps> = ({
  label, help, icon: Icon, children, className = '',
}) => {
  const { colors, accent } = useBrutalTheme();

  return (
    <div className={`flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0 ${className}`}>
      <div className="flex items-start gap-3 min-w-0">
        {Icon && (
          <div className={`p-2 rounded-lg ${accent.bgDim} ${accent.text} shrink-0`}>
            <Icon className="w-4 h-4" aria-hidden="true" />
          </div>
        )}
        <div className="min-w-0">
          <p className={`text-sm font-semibold ${colors.text}`}>{label}</p>
          {help && (
            <p className={`text-xs ${colors.textMuted} mt-0.5 leading-relaxed`}>{help}</p>
          )}
        </div>
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
};
