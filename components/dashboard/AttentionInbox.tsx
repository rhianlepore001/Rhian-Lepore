import React from 'react';
import { AlertTriangle, Bell, ChevronRight } from 'lucide-react';
import { Card } from '../ui/Card';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';

export interface AttentionItem {
  id: string;
  text: string;
  tone?: 'warning' | 'danger' | 'info';
  onClick?: () => void;
}

export interface AttentionInboxProps {
  items: AttentionItem[];
  title?: string;
}

export const AttentionInbox: React.FC<AttentionInboxProps> = ({
  items,
  title = 'Precisa da sua atenção',
}) => {
  const { colors, status, accent } = useBrutalTheme();

  if (items.length === 0) return null;

  return (
    <Card variant="outlined">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className={`h-4 w-4 shrink-0 ${status.warning}`} aria-hidden="true" />
        <h2 className={`text-sm font-semibold ${colors.text}`}>{title}</h2>
      </div>
      <ul className="space-y-2">
        {items.map((item) => {
          const toneClass =
            item.tone === 'danger'
              ? status.danger
              : item.tone === 'info'
                ? accent.text
                : status.warning;
          const interactive = Boolean(item.onClick);

          return (
            <li key={item.id}>
              <button
                type="button"
                disabled={!interactive}
                onClick={item.onClick}
                className={`flex w-full items-start gap-3 rounded-2xl p-3 text-left transition-opacity ${colors.surface} ${
                  interactive ? 'hover:opacity-90 min-h-[44px]' : 'cursor-default'
                }`}
              >
                <Bell className={`mt-0.5 h-4 w-4 shrink-0 ${toneClass}`} aria-hidden="true" />
                <span className={`flex-1 text-sm leading-relaxed ${colors.textSecondary}`}>
                  {item.text}
                </span>
                {interactive && (
                  <ChevronRight className={`mt-0.5 h-4 w-4 shrink-0 ${colors.textMuted}`} aria-hidden="true" />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
};
