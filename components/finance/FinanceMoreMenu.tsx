import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';

export interface FinanceMoreMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onSelect: () => void;
}

interface FinanceMoreMenuProps {
  label: string;
  items: FinanceMoreMenuItem[];
  className?: string;
}

/**
 * Menu "⋯" do topo do Financeiro no celular (PR-F #9). Sem dependência nova:
 * botão com aria-haspopup, lista role=menu, setas/Home/End, ESC devolve o foco ao botão.
 */
export const FinanceMoreMenu: React.FC<FinanceMoreMenuProps> = ({ label, items, className = '' }) => {
  const { colors, radius } = useBrutalTheme();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const menuId = useId();

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) buttonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    itemRefs.current[0]?.focus();
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) close(false);
    };
    // ESC fecha mesmo se o foco saiu do menu (ex.: tocou fora sem fechar).
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); close(true); }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    const list = itemRefs.current.filter(Boolean) as HTMLButtonElement[];
    const idx = list.indexOf(document.activeElement as HTMLButtonElement);
    const focus = (i: number) => list[(i + list.length) % list.length]?.focus();
    if (e.key === 'ArrowDown') { e.preventDefault(); focus(idx + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); focus(idx - 1); }
    else if (e.key === 'Home') { e.preventDefault(); focus(0); }
    else if (e.key === 'End') { e.preventDefault(); focus(list.length - 1); }
    else if (e.key === 'Tab') close(false);
  };

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex h-11 w-11 items-center justify-center ${radius.button} border ${colors.border} ${colors.card} ${colors.text} transition-colors hover:bg-[var(--color-card-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]`}
      >
        <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKeyDown}
          className={`absolute right-0 top-full z-40 mt-2 w-52 p-1 ${colors.card} border ${colors.border} ${radius.card} shadow-[var(--shadow-modal)]`}
        >
          {items.map((item, i) => (
            <button
              key={item.id}
              ref={(el) => { itemRefs.current[i] = el; }}
              type="button"
              role="menuitem"
              tabIndex={-1}
              onClick={() => { close(false); item.onSelect(); }}
              className={`flex w-full min-h-[44px] items-center gap-3 px-3 text-left text-sm font-medium ${colors.text} ${radius.button} hover:bg-[var(--color-card-hover)] focus:bg-[var(--color-card-hover)] focus:outline-none`}
            >
              {item.icon && <span className={colors.textSecondary} aria-hidden="true">{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
