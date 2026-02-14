import React from 'react';
import { Search, X } from 'lucide-react';

interface ServiceSearchBarProps {
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    isBeauty: boolean;
}

export const ServiceSearchBar: React.FC<ServiceSearchBarProps> = ({
    searchQuery,
    setSearchQuery,
    isBeauty
}) => (
    <div className="flex flex-col gap-2 mb-6">
        <label className="text-xs font-mono text-neutral-500 uppercase tracking-widest">Pesquisar serviço:</label>
        <div className="relative">
            <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Digite o nome do serviço..."
                className={`w-full px-4 py-3 pl-10 rounded-lg font-medium transition-all ${isBeauty
                    ? 'bg-beauty-card border border-beauty-neon/20 text-white placeholder:text-neutral-500 focus:border-beauty-neon'
                    : 'bg-neutral-900 border-2 border-neutral-800 text-white placeholder:text-neutral-500 focus:border-accent-gold'
                    }`}
            />
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${searchQuery ? (isBeauty ? 'text-beauty-neon' : 'text-accent-gold') : 'text-neutral-500'}`} />
            {searchQuery && (
                <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            )}
        </div>
    </div>
);
