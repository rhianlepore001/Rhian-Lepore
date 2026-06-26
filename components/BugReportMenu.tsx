import React from 'react';
import { createPortal } from 'react-dom';
import { Bug, Lightbulb, MessageCircle } from 'lucide-react';
import { useBrutalTheme } from '../hooks/useBrutalTheme';

interface BugReportMenuProps {
  onClose: () => void;
  onReportBug: () => void;
  onSuggestIdea: () => void;
  onContactSupport: () => void;
}

interface MenuOption {
  key: 'bug' | 'idea' | 'support';
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  onSelect: () => void;
}

export const BugReportMenu: React.FC<BugReportMenuProps> = ({
  onClose,
  onReportBug,
  onSuggestIdea,
  onContactSupport,
}) => {
  const { classes, colors, accent, radius } = useBrutalTheme();

  const options: MenuOption[] = [
    {
      key: 'bug',
      title: 'Reportar problema',
      description: 'Encontrou um bug? Nos avise para corrigirmos rápido.',
      icon: Bug,
      onSelect: onReportBug,
    },
    {
      key: 'idea',
      title: 'Sugerir melhoria',
      description: 'Tem uma ideia de funcionalidade? Compartilhe com a gente.',
      icon: Lightbulb,
      onSelect: onSuggestIdea,
    },
    {
      key: 'support',
      title: 'Falar com suporte',
      description: 'Tira dúvidas direto pelo WhatsApp com nosso time.',
      icon: MessageCircle,
      onSelect: onContactSupport,
    },
  ];

  const content = (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="menu"
        aria-label="Ajuda e reportar problema"
        className={[
          'fixed right-3 top-16 z-50 w-[min(20rem,calc(100vw-1.5rem))]',
          'md:right-6 md:top-24',
          classes.card,
          'p-2',
          'animate-in fade-in slide-in-from-top-2 duration-200',
        ].join(' ')}
      >
        <div className="flex flex-col gap-1">
          {options.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.key}
                type="button"
                role="menuitem"
                onClick={option.onSelect}
                className={[
                  'group flex items-start gap-3 w-full text-left p-3',
                  radius.card,
                  'transition-colors duration-150 cursor-pointer',
                  colors.surfaceHover,
                  `hover:border-[var(--color-accent-border)] border border-transparent`,
                ].join(' ')}
              >
                <span
                  className={[
                    'shrink-0 inline-flex items-center justify-center w-9 h-9',
                    accent.bgDim,
                    accent.text,
                    radius.button,
                  ].join(' ')}
                >
                  <Icon className="w-5 h-5" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className={`block text-sm font-semibold ${colors.text}`}>
                    {option.title}
                  </span>
                  <span className={`block text-xs leading-snug ${colors.textMuted}`}>
                    {option.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
};