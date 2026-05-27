import React, { useId } from 'react';
import { useBrutalTheme, type ThemeVariant } from '../../hooks/useBrutalTheme';

export interface TabItem {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
  className?: string;
  size?: 'sm' | 'md';
  forceTheme?: ThemeVariant;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs, activeTab, onTabChange, className = '', size = 'md', forceTheme,
}) => {
  const { colors, accent } = useBrutalTheme({ override: forceTheme });
  const baseId = useId();

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    const enabledTabs = tabs.filter((t) => !t.disabled);
    const currentEnabledIndex = enabledTabs.findIndex((t) => t.id === tabs[index].id);
    let next: TabItem | undefined;

    if (e.key === 'ArrowRight') {
      next = enabledTabs[(currentEnabledIndex + 1) % enabledTabs.length];
    } else if (e.key === 'ArrowLeft') {
      next = enabledTabs[(currentEnabledIndex - 1 + enabledTabs.length) % enabledTabs.length];
    } else if (e.key === 'Home') {
      next = enabledTabs[0];
    } else if (e.key === 'End') {
      next = enabledTabs[enabledTabs.length - 1];
    }

    if (next) {
      e.preventDefault();
      onTabChange(next.id);
      const el = document.getElementById(`${baseId}-tab-${next.id}`);
      el?.focus();
    }
  };

  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
  const py = size === 'sm' ? 'py-1.5' : 'py-2';

  return (
    <div
      role="tablist"
      className={[
        'flex gap-1 overflow-x-auto scrollbar-none',
        `border-b ${colors.divider}`,
        className,
      ].join(' ')}
    >
      {tabs.map((tab, i) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            id={`${baseId}-tab-${tab.id}`}
            role="tab"
            type="button"
            aria-selected={isActive}
            aria-controls={`${baseId}-panel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            disabled={tab.disabled}
            onClick={() => onTabChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            className={[
              'relative flex items-center gap-1.5 px-3 font-medium whitespace-nowrap',
              'transition-colors duration-150 select-none',
              textSize, py,
              tab.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
              isActive
                ? `${accent.text} border-b-2 border-current -mb-px`
                : `${colors.textSecondary} hover:${colors.text}`,
            ].filter(Boolean).join(' ')}
          >
            {tab.icon && <span className="[&>svg]:w-4 [&>svg]:h-4 shrink-0" aria-hidden="true">{tab.icon}</span>}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};
