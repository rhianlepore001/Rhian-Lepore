import React from 'react';

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabNavProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  accentBg: string;
  className?: string;
}

export const TabNav: React.FC<TabNavProps> = ({ tabs, activeTab, onChange, accentBg, className }) => {
  return (
    <div className={`relative ${className || ''}`}>
      <div className="overflow-x-auto pb-1 -mb-1 hide-scrollbar">
        <div role="tablist" className="inline-flex bg-[var(--color-bg)]/40 border border-[var(--color-text)]/[0.06] rounded-full p-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => onChange(tab.id)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 font-mono text-xs uppercase tracking-wide transition-all duration-200 whitespace-nowrap ${
                activeTab === tab.id
                  ? `${accentBg} text-[var(--color-bg)] font-semibold`
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-card-hover)]'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      {/* Indica que há mais abas fora da viewport (scroll horizontal) */}
      <div className="pointer-events-none absolute right-0 top-0 bottom-1 w-8 bg-gradient-to-l from-[var(--color-bg)] to-transparent sm:hidden" />
    </div>
  );
};
