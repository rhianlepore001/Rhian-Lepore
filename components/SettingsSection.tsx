import React from 'react';
import { Card } from './ui/Card';
import { useBrutalTheme } from '../hooks/useBrutalTheme';

interface SettingsSectionProps {
  title: React.ReactNode;
  description?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
  noPadding?: boolean;
  accent?: boolean;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  title,
  description,
  children,
  className = '',
  action,
  noPadding = false,
  accent: accentProp = false
}) => {
  const { colors } = useBrutalTheme();

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <span>{title}</span>
        </div>
      }
      action={action}
      noPadding={noPadding}
      variant={accentProp ? 'elevated' : 'outlined'}
      className={`mb-4 md:mb-6 ${className}`}
    >
      {description && (
        <p className={`${colors.textSecondary} text-sm mb-6 leading-relaxed`}>
          {description}
        </p>
      )}
      {children}
    </Card>
  );
};

