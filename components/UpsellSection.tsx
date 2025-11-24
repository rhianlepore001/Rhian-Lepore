import React from 'react';
import { Check, TrendingUp, Users } from 'lucide-react';

interface Service {
    id: string;
    name: string;
    price: number;
    duration_minutes: number;
    upsell_text?: string | null;
    combo_discount?: number | null;
}

interface UpsellSectionProps {
    mainService: Service;
    availableUpsells: Service[];
    selectedUpsells: string[];
    onToggleUpsell: (serviceId: string) => void;
    isBeauty?: boolean;
}

export const UpsellSection: React.FC<UpsellSectionProps> = ({
    mainService,
    availableUpsells,
    selectedUpsells,
    onToggleUpsell,
    isBeauty = false
}) => {
    const accentColor = isBeauty ? 'beauty-neon' : 'accent-gold';
    const cardBg = isBeauty ? 'bg-white/5 border border-white/10 rounded-xl' : 'bg-black/40 border-2 border-neutral-800';

    if (availableUpsells.length === 0) {
        return null;
    }

    const calculateSavings = (upsell: Service) => {
        if (upsell.combo_discount && upsell.combo_discount > 0) {
            return upsell.combo_discount;
        }
        return 0;
    };

    return (
        <div className={`${cardBg} p-6 mt-4 animate-fadeIn`}>
            <div className="flex items-center gap-2 mb-4">
                <TrendingUp className={`w-5 h-5 text-${accentColor}`} />
                <h3 className="text-white font-heading text-lg uppercase">
                    💎 Complete sua Experiência
                </h3>
            </div>

            <p className="text-neutral-400 text-sm mb-4">
                Aproveite para adicionar serviços complementares e economizar:
            </p>

            <div className="space-y-3">
                {availableUpsells.map(upsell => {
                    const isSelected = selectedUpsells.includes(upsell.id);
                    const savings = calculateSavings(upsell);

                    return (
                        <button
                            key={upsell.id}
                            onClick={() => onToggleUpsell(upsell.id)}
                            className={`
                w-full p-4 rounded-lg border-2 transition-all text-left
                ${isSelected
                                    ? `border-${accentColor} bg-${accentColor}/10`
                                    : 'border-neutral-700 hover:border-neutral-600'
                                }
              `}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3 flex-1">
                                    {/* Checkbox */}
                                    <div className={`
                    w-6 h-6 rounded border-2 flex items-center justify-center mt-0.5
                    ${isSelected
                                            ? `border-${accentColor} bg-${accentColor}`
                                            : 'border-neutral-600'
                                        }
                  `}>
                                        {isSelected && <Check className="w-4 h-4 text-black" />}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-white font-bold">{upsell.name}</span>
                                            {savings > 0 && (
                                                <span className={`text-xs px-2 py-0.5 rounded-full bg-${accentColor}/20 text-${accentColor} font-bold`}>
                                                    Economize R$ {savings.toFixed(2)}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-3 text-sm">
                                            <span className={`text-${accentColor} font-bold`}>
                                                +R$ {upsell.price.toFixed(2)}
                                            </span>
                                            <span className="text-neutral-400">
                                                +{upsell.duration_minutes} min
                                            </span>
                                        </div>

                                        {/* Social Proof */}
                                        {upsell.upsell_text && (
                                            <div className="flex items-center gap-1 mt-2 text-xs text-neutral-400">
                                                <Users className="w-3 h-3" />
                                                <span>{upsell.upsell_text}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Summary */}
            {selectedUpsells.length > 0 && (
                <div className={`mt-4 pt-4 border-t border-neutral-700`}>
                    <div className="flex justify-between items-center">
                        <span className="text-neutral-400 text-sm">
                            {selectedUpsells.length} adicional{selectedUpsells.length > 1 ? 'is' : ''} selecionado{selectedUpsells.length > 1 ? 's' : ''}
                        </span>
                        <span className={`text-${accentColor} font-bold`}>
                            +R$ {availableUpsells
                                .filter(u => selectedUpsells.includes(u.id))
                                .reduce((sum, u) => sum + u.price, 0)
                                .toFixed(2)}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};
