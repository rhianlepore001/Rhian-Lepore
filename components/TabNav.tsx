import React, { useRef } from 'react';

interface Tab {
  id: string;
  label: string;
  /** Ícone só a partir de 768 px (no celular o controle fica só com texto). */
  icon?: React.ReactNode;
}

interface TabNavProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  /** Nome do grupo para leitores de tela (ex.: "Seções do financeiro"). */
  ariaLabel: string;
  /** id do painel controlado pelas abas. */
  panelId?: string;
  className?: string;
  /** @deprecated o controle segmentado não usa a cor de destaque; mantido por compat. */
  accentBg?: string;
}

/**
 * Controle segmentado de uma linha (PR-E): colunas iguais, nunca quebra nem rola,
 * de 320 px até o computador. Setas ←/→, Home e End trocam de aba (tabindex itinerante).
 */
export const TabNav: React.FC<TabNavProps> = ({ tabs, activeTab, onChange, ariaLabel, panelId, className }) => {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  if (tabs.length < 2) return null;

  const go = (index: number) => {
    const next = (index + tabs.length) % tabs.length;
    onChange(tabs[next].id);
    refs.current[next]?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (event.key === 'ArrowRight') go(index + 1);
    else if (event.key === 'ArrowLeft') go(index - 1);
    else if (event.key === 'Home') go(0);
    else if (event.key === 'End') go(tabs.length - 1);
    else return;
    event.preventDefault();
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`grid w-full gap-0.5 p-0.5 rounded-[10px] bg-[var(--color-surface)] border border-[var(--color-border)] ${className || ''}`}
      style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
    >
      {tabs.map((tab, index) => {
        const selected = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            ref={(el) => { refs.current[index] = el; }}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={panelId}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={`min-w-0 min-h-[40px] px-2 inline-flex items-center justify-center gap-1.5 rounded-lg font-sans text-[13px] min-[360px]:text-sm transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--color-surface)] ${
              selected
                ? 'bg-[var(--color-card)] text-[var(--color-text)] font-semibold shadow-[0_1px_2px_rgb(0_0_0/0.12)] ring-1 ring-[var(--color-border)]'
                : 'text-[var(--color-text-secondary)] font-medium hover:text-[var(--color-text)]'
            }`}
          >
            {tab.icon && <span className="hidden md:inline-flex shrink-0" aria-hidden="true">{tab.icon}</span>}
            <span data-tab-label className="min-w-0 truncate whitespace-nowrap">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};
