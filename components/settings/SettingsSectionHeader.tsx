import React from 'react';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';

interface SettingsSectionHeaderProps {
  title: string;
  description?: React.ReactNode;
  id?: string;
  action?: React.ReactNode;
}

/** Título de seção dos Ajustes: 18 px semibold + uma frase de apoio (sem rótulo mono em caixa alta). */
export const SettingsSectionHeader: React.FC<SettingsSectionHeaderProps> = ({ title, description, id, action }) => {
  const { colors } = useBrutalTheme();
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h3 id={id} className={`text-lg font-semibold leading-7 tracking-tight ${colors.text}`}>{title}</h3>
        {description && <p className={`mt-0.5 text-sm ${colors.textSecondary}`}>{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};
