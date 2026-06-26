import React from 'react';
import { MessageSquare, Zap } from 'lucide-react';
import { useBrutalTheme, type ThemeVariant } from '../../hooks/useBrutalTheme';

interface BookingModeToggleProps {
  mode: 'chat' | 'quick';
  onChange: (mode: 'chat' | 'quick') => void;
  forceTheme?: ThemeVariant;
}

export const BookingModeToggle: React.FC<BookingModeToggleProps> = ({ mode, onChange, forceTheme }) => {
  const { colors, accent } = useBrutalTheme({ override: forceTheme });

  const baseBtn = `flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-[0.15em] transition-all duration-300`;

  return (
    <div className={`flex items-center justify-center gap-1 p-1.5 ${colors.card} ${colors.border} border rounded-2xl w-fit mx-auto`}>
      <button
        onClick={() => onChange('quick')}
        className={`${baseBtn} ${mode === 'quick'
            ? `${accent.bg} text-[var(--color-bg)] shadow-lg scale-105`
            : `${colors.textSecondary} hover:${colors.text} hover:bg-[var(--color-card-hover)]`
          }`}
        aria-pressed={mode === 'quick'}
      >
        <Zap className="w-4 h-4" />
        Rápido
      </button>
      <button
        onClick={() => onChange('chat')}
        className={`${baseBtn} ${mode === 'chat'
            ? `${accent.bg} text-[var(--color-bg)] shadow-lg scale-105`
            : `${colors.textSecondary} hover:${colors.text} hover:bg-[var(--color-card-hover)]`
          }`}
        aria-pressed={mode === 'chat'}
      >
        <MessageSquare className="w-4 h-4" />
        Chat
      </button>
    </div>
  );
};
