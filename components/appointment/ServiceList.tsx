import React from 'react';
import { Check, Clock, Sparkles } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { Service } from './types';

interface ServiceListProps {
    services: Service[];
    selectedServiceIds: string[];
    toggleService: (id: string) => void;
    isBeauty: boolean;
    currencyRegion: 'BR' | 'PT';
    searchQuery: string;
    activeCategory: string;
    categories: any[];
    setSearchQuery: (q: string) => void;
    isCustomService: boolean;
    setIsCustomService: (v: boolean) => void;
    customServiceName: string;
    setCustomServiceName: (v: string) => void;
    customServicePrice: string;
    setCustomServicePrice: (v: string) => void;
    currencySymbol: string;
}

export const ServiceList: React.FC<ServiceListProps> = ({
    services,
    selectedServiceIds,
    toggleService,
    currencyRegion,
    searchQuery,
    activeCategory,
    categories,
    setSearchQuery,
    isCustomService,
    setIsCustomService,
    customServiceName,
    setCustomServiceName,
    customServicePrice,
    setCustomServicePrice,
    currencySymbol
}) => {
    // Nome de categoria desconhecido NUNCA vira um "Serviços" genérico repetido
    // (era o que o colaborador via quando não conseguia ler as categorias).
    // - sem nenhuma categoria conhecida: lista única, sem cabeçalhos;
    // - algumas desconhecidas: agrupadas em "Outros serviços", no fim.
    const knownCategoryIds = new Set(categories.map(c => c.id));
    const showGroupHeaders = activeCategory === 'all' && categories.length > 0;
    const UNCATEGORIZED = 'uncategorized';

    const getCategoryName = (catId: string) => {
        if (catId === UNCATEGORIZED) return 'Outros serviços';
        return categories.find(c => c.id === catId)?.name ?? 'Outros serviços';
    };

    // Group services by category with search filter
    const servicesByCategory = services
        .filter(service => {
            // Category filter
            const matchesCategory = activeCategory === 'all' || service.category_id === activeCategory;
            // Search filter
            const matchesSearch = !searchQuery ||
                service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (service.description && service.description.toLowerCase().includes(searchQuery.toLowerCase()));
            return matchesCategory && matchesSearch;
        })
        .reduce((acc, service) => {
            const categoryId = !showGroupHeaders
                ? 'all'
                : service.category_id && knownCategoryIds.has(service.category_id)
                    ? service.category_id
                    : UNCATEGORIZED;
            if (!acc[categoryId]) acc[categoryId] = [];
            acc[categoryId].push(service);
            return acc;
        }, {} as Record<string, Service[]>);

    // Sort services within each category alphabetically
    Object.keys(servicesByCategory).forEach(catId => {
        servicesByCategory[catId].sort((a, b) => a.name.localeCompare(b.name));
    });

    // Grupos na ordem das categorias (a mesma dos chips); "Outros serviços" por último
    const categoryOrder = (id: string) => {
        if (id === UNCATEGORIZED) return Number.MAX_SAFE_INTEGER;
        const idx = categories.findIndex(c => c.id === id);
        return idx === -1 ? Number.MAX_SAFE_INTEGER - 1 : idx;
    };

    const hasServices = Object.keys(servicesByCategory).length > 0;

    if (!hasServices) {
        return (
            <div className="text-center py-12 px-4 rounded-xl border border-dashed border-[var(--color-divider)] bg-theme-surface">
                <Sparkles className="w-12 h-12 mx-auto mb-4 text-theme-accent opacity-60" />
                <h3 className="text-theme-text font-bold text-lg mb-2">Nenhum serviço encontrado</h3>
                <p className="text-theme-textSecondary text-sm mb-4">
                    {searchQuery
                        ? `Não encontramos serviços com "${searchQuery}"`
                        : 'Não há serviços nesta categoria'}
                </p>
                {searchQuery && (
                    <button
                        onClick={() => setSearchQuery('')}
                        className="px-4 py-2 rounded-lg font-bold text-sm transition-all bg-theme-accent text-[var(--color-bg)] hover:brightness-110"
                    >
                        Limpar pesquisa
                    </button>
                )}
            </div>
        );
    }

    const groups = (Object.entries(servicesByCategory) as [string, Service[]][])
        .sort(([a], [b]) => categoryOrder(a) - categoryOrder(b));

    const result = groups.map(([categoryId, categoryServices]) => (
        <div key={categoryId} className="space-y-2.5">
            {/* Cabeçalho do grupo (só em "Todos" e quando os nomes são conhecidos) */}
            {showGroupHeaders && (
                <h3
                    data-testid="service-group-header"
                    className="text-xs font-mono uppercase tracking-widest pl-3 border-l-2 text-theme-textSecondary border-[var(--color-accent-border)]"
                >
                    {getCategoryName(categoryId)}
                </h3>
            )}

            {/* Services List - Compact Layout */}
            <div className="space-y-2">
                {categoryServices.map(service => {
                    const isSelected = selectedServiceIds.includes(service.id);
                    return (
                        <div
                            key={service.id}
                            onClick={() => toggleService(service.id)}
                            className={`
                                        relative cursor-pointer transition-all duration-200 group overflow-hidden flex items-center gap-3 sm:gap-4 px-3.5 py-3 sm:p-4
                                        rounded-xl border
                                        ${isSelected
                                    ? 'bg-theme-card border-theme-accent shadow-[var(--shadow-card-accent)]'
                                    : 'bg-theme-surface border-[var(--color-divider)] hover:bg-[var(--color-card-hover)] hover:border-[var(--color-input-border)]'}
                                    `}
                        >
                            {/* Selection Indicator */}
                            <div className={`
                                        shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center transition-all
                                        ${isSelected
                                    ? 'bg-theme-accent border-theme-accent'
                                    : 'border-[var(--color-input-border)] bg-transparent'}
                                    `}>
                                {isSelected && <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[var(--color-bg)]" />}
                            </div>

                            {/* Service Info */}
                            <div className="flex-1 min-w-0">
                                <h4
                                    title={service.name}
                                    className={`font-bold text-[15px] sm:text-base leading-snug line-clamp-2 break-words ${isSelected ? 'text-theme-accent' : 'text-theme-text'}`}
                                >
                                    {service.name}
                                </h4>
                                {service.description && (
                                    <p className="text-theme-textSecondary text-xs mt-1 line-clamp-1">
                                        {service.description}
                                    </p>
                                )}
                            </div>

                            {/* Price and Duration */}
                            <div className="shrink-0 text-right">
                                <div className="text-base sm:text-lg font-mono font-bold text-theme-text whitespace-nowrap">
                                    {formatCurrency(service.price, currencyRegion)}
                                </div>
                                <div className="flex items-center justify-end gap-1 text-theme-textSecondary text-xs font-mono mt-1">
                                    <Clock className="w-3 h-3" />
                                    {service.duration_minutes}min
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    ));

    // ADD CUSTOM SERVICE BOX AT THE BOTTOM
    // Updated: Always show custom service option regardless of category filter
    result.push(
        <div key="custom-service-item" className="pt-2 space-y-2.5">
            <h3 className="text-xs font-mono uppercase tracking-widest pl-3 border-l-2 text-theme-textSecondary border-[var(--color-divider)]">
                Serviço avulso
            </h3>
            <div
                className={`
                        px-3.5 py-3 sm:p-4 rounded-xl border transition-all duration-200
                        ${isCustomService
                        ? 'bg-theme-card border-theme-accent shadow-[var(--shadow-card-accent)]'
                        : 'bg-theme-surface border-[var(--color-divider)]'}
                    `}
            >
                <div className="flex items-center gap-3 sm:gap-4 mb-3">
                    <div
                        onClick={() => setIsCustomService(!isCustomService)}
                        className={`
                                shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all
                                ${isCustomService
                                ? 'bg-theme-accent border-theme-accent'
                                : 'border-[var(--color-input-border)] bg-transparent'}
                            `}
                    >
                        {isCustomService && <Check className="w-4 h-4 text-[var(--color-bg)]" />}
                    </div>
                    <input
                        value={customServiceName}
                        onChange={e => {
                            setCustomServiceName(e.target.value);
                            if (!isCustomService) setIsCustomService(true);
                        }}
                        className="flex-1 min-w-0 bg-transparent border-none text-theme-text focus:outline-none placeholder:text-[var(--color-text-muted)] font-bold text-[15px] sm:text-base"
                        placeholder="Descreva o serviço avulso..."
                    />
                    <div className="flex items-center gap-2">
                        <span className="text-[var(--color-text-muted)] font-mono">{currencySymbol}</span>
                        <input
                            type="number"
                            value={customServicePrice}
                            onChange={e => {
                                setCustomServicePrice(e.target.value);
                                if (!isCustomService) setIsCustomService(true);
                            }}
                            className="w-20 bg-[var(--color-input-bg)] text-theme-text p-2 rounded border border-[var(--color-input-border)] focus:outline-none focus:border-theme-accent font-mono text-right"
                            placeholder="0.00"
                        />
                    </div>
                </div>
                <p className="text-xs text-[var(--color-text-muted)]">
                    Para pacotes, promoções ou serviços fora da lista.
                </p>
            </div>
        </div>
    );
    return <div data-testid="service-groups" className="space-y-6 pb-4">{result}</div>;
};
