import React from 'react';
import { Search, X } from 'lucide-react';

interface ServiceSearchBarProps {
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    isBeauty: boolean;
}

export const ServiceSearchBar: React.FC<ServiceSearchBarProps> = ({
    searchQuery,
    setSearchQuery
}) => (
    <div className="flex flex-col gap-2 mb-6">
        <label className="text-xs font-mono text-[var(--color-text-muted)] uppercase tracking-widest">Pesquisar serviço:</label>
        <div className="relative">
            <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Digite o nome do serviço..."
                className="w-full px-4 py-3 pl-10 rounded-lg font-medium transition-all bg-[var(--color-input-bg)] border border-[var(--color-input-border)] text-theme-text placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-theme-accent"
            />
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${searchQuery ? 'text-theme-accent' : 'text-[var(--color-text-muted)]'}`} />
            {searchQuery && (
                <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-textSecondary hover:text-theme-text transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            )}
        </div>
    </div>
);
