import React from 'react';
import { Check, Clock, Sparkles } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { Service } from './types';

interface ServiceListProps {
    services: Service[];
    selectedServiceIds: string[];
    toggleService: (id: string) => void;
    isBeauty: boolean;
    currencyRegion: string;
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
    isBeauty,
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
    const getCategoryName = (catId: string) => {
        if (catId === 'uncategorized') return 'Outros Serviços';
        const cat = categories.find(c => c.id === catId);
        return cat?.name || 'Serviços';
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
            const categoryId = service.category_id || 'uncategorized';
            if (!acc[categoryId]) acc[categoryId] = [];
            acc[categoryId].push(service);
            return acc;
        }, {} as Record<string, Service[]>);

    // Sort services within each category alphabetically
    Object.keys(servicesByCategory).forEach(catId => {
        servicesByCategory[catId].sort((a, b) => a.name.localeCompare(b.name));
    });

    const hasServices = Object.keys(servicesByCategory).length > 0;

    if (!hasServices) {
        return (
            <div className={`text-center py-12 px-4 rounded-xl border-2 border-dashed ${isBeauty ? 'border-white/10 bg-beauty-card/30' : 'border-neutral-800 bg-neutral-900/30'}`}>
                <Sparkles className={`w-12 h-12 mx-auto mb-4 ${isBeauty ? 'text-beauty-neon/50' : 'text-accent-gold/50'}`} />
                <h3 className="text-white font-bold text-lg mb-2">Nenhum serviço encontrado</h3>
                <p className="text-neutral-400 text-sm mb-4">
                    {searchQuery
                        ? `Não encontramos serviços com "${searchQuery}"`
                        : 'Não há serviços nesta categoria'}
                </p>
                {searchQuery && (
                    <button
                        onClick={() => setSearchQuery('')}
                        className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${isBeauty ? 'bg-beauty-neon text-black hover:bg-beauty-neon/80' : 'bg-accent-gold text-black hover:bg-accent-gold/80'}`}
                    >
                        Limpar pesquisa
                    </button>
                )}
            </div>
        );
    }

    const result = (Object.entries(servicesByCategory) as [string, Service[]][]).map(([categoryId, categoryServices]) => (
        <div key={categoryId} className="space-y-3">
            {/* Category Header (only show if not filtering by specific category) */}
            {activeCategory === 'all' && (
                <h3 className="text-lg font-heading text-white uppercase tracking-tight border-b border-white/10 pb-2">
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
                                        relative cursor-pointer transition-all duration-200 group overflow-hidden flex items-center gap-4 p-4
                                        ${isBeauty
                                    ? 'rounded-xl border'
                                    : 'border-2 border-black'}
                                        ${isSelected
                                    ? (isBeauty
                                        ? 'bg-beauty-card border-beauty-neon shadow-neon'
                                        : 'bg-neutral-900 border-accent-gold shadow-heavy-sm')
                                    : (isBeauty
                                        ? 'bg-beauty-card/30 border-white/5 hover:border-beauty-neon/30 hover:bg-beauty-card/50'
                                        : 'bg-brutal-card border-transparent hover:border-neutral-700')}
                                    `}
                        >
                            {/* Selection Indicator */}
                            <div className={`
                                        shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
                                        ${isSelected
                                    ? (isBeauty ? 'bg-beauty-neon border-beauty-neon' : 'bg-accent-gold border-accent-gold')
                                    : 'border-neutral-600 bg-transparent'}
                                    `}>
                                {isSelected && <Check className="w-4 h-4 text-black" />}
                            </div>

                            {/* Service Info */}
                            <div className="flex-1 min-w-0">
                                <h4 className={`font-bold text-base leading-tight truncate ${isSelected ? (isBeauty ? 'text-beauty-neon' : 'text-accent-gold') : 'text-white'}`}>
                                    {service.name}
                                </h4>
                                {service.description && (
                                    <p className="text-neutral-400 text-xs mt-1 line-clamp-1">
                                        {service.description}
                                    </p>
                                )}
                            </div>

                            {/* Price and Duration */}
                            <div className="shrink-0 text-right">
                                <div className={`text-lg font-mono font-bold ${isBeauty ? 'text-white' : 'text-white'}`}>
                                    {formatCurrency(service.price, currencyRegion)}
                                </div>
                                <div className="flex items-center justify-end gap-1 text-neutral-400 text-[10px] font-mono mt-1">
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
    if (activeCategory === 'all' || activeCategory === 'uncategorized') {
        result.push(
            <div key="custom-service-item" className="mt-8 space-y-3">
                <h3 className="text-lg font-heading text-white uppercase tracking-tight border-b border-white/10 pb-2">
                    Outros / Personalizado
                </h3>
                <div
                    className={`
                        p-4 rounded-xl border transition-all duration-200
                        ${isCustomService
                            ? (isBeauty ? 'bg-beauty-card border-beauty-neon shadow-neon' : 'bg-neutral-900 border-accent-gold shadow-heavy-sm')
                            : (isBeauty ? 'bg-beauty-card/30 border-white/5' : 'bg-brutal-card border-transparent')}
                    `}
                >
                    <div className="flex items-center gap-4 mb-4">
                        <div
                            onClick={() => setIsCustomService(!isCustomService)}
                            className={`
                                shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all
                                ${isCustomService
                                    ? (isBeauty ? 'bg-beauty-neon border-beauty-neon' : 'bg-accent-gold border-accent-gold')
                                    : 'border-neutral-600 bg-transparent'}
                            `}
                        >
                            {isCustomService && <Check className="w-4 h-4 text-black" />}
                        </div>
                        <input
                            value={customServiceName}
                            onChange={e => {
                                setCustomServiceName(e.target.value);
                                if (!isCustomService) setIsCustomService(true);
                            }}
                            className={`flex-1 bg-transparent border-none text-white focus:outline-none placeholder:text-neutral-500 font-bold text-base`}
                            placeholder="Descreva o serviço avulso..."
                        />
                        <div className="flex items-center gap-2">
                            <span className="text-neutral-500 font-mono">{currencySymbol}</span>
                            <input
                                type="number"
                                value={customServicePrice}
                                onChange={e => {
                                    setCustomServicePrice(e.target.value);
                                    if (!isCustomService) setIsCustomService(true);
                                }}
                                className={`w-20 bg-black/20 text-white p-2 rounded border border-white/10 focus:outline-none focus:border-white/30 font-mono text-right`}
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                    <p className="text-[10px] text-neutral-500 italic">
                        * Use esta opção para pacotes, promoções ou serviços não listados.
                    </p>
                </div>
            </div>
        );
    }

    return <div className="space-y-6 pb-12">{result}</div>;
};
