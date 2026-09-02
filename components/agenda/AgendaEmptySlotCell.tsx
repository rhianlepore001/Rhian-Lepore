import React from 'react';
import { Plus } from 'lucide-react';

interface AgendaEmptySlotCellProps {
  time: string;
  professionalName: string;
  onClick: () => void;
  className?: string;
}

/**
 * Célula vazia da grade da Agenda — hover com "+" e clique abre
 * novo agendamento já com profissional + horário.
 */
export const AgendaEmptySlotCell: React.FC<AgendaEmptySlotCellProps> = ({
  time,
  professionalName,
  onClick,
  className = '',
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Novo agendamento às ${time} com ${professionalName}`}
      className={`group/slot relative flex-1 min-w-0 h-full border-r last:border-r-0 p-1 flex items-center justify-center
        transition-colors duration-200 ease-out
        hover:bg-[var(--color-accent-dim)]
        focus-visible:outline-none focus-visible:bg-[var(--color-accent-dim)]
        focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-theme-accent
        active:bg-[var(--color-accent-dim)]
        ${className}`}
    >
      <span
        className="pointer-events-none flex items-center justify-center w-7 h-7 rounded-full
          border border-dashed border-[var(--color-divider)]
          text-[var(--color-text-muted)]
          opacity-40 scale-100
          md:opacity-0 md:scale-75
          transition-all duration-200 ease-out
          group-hover/slot:opacity-100 group-hover/slot:scale-100
          group-hover/slot:border-theme-accent group-hover/slot:text-theme-accent
          group-hover/slot:bg-theme-accent/15 group-hover/slot:shadow-[0_0_12px_color-mix(in_srgb,var(--color-accent)_35%,transparent)]
          group-focus-visible/slot:opacity-100 group-focus-visible/slot:scale-100
          group-focus-visible/slot:border-theme-accent group-focus-visible/slot:text-theme-accent
          group-active/slot:scale-95"
        aria-hidden
      >
        <Plus className="w-4 h-4 transition-transform duration-300 ease-out group-hover/slot:rotate-90 group-focus-visible/slot:rotate-90" />
      </span>
    </button>
  );
};
