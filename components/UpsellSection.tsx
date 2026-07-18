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
    const cardBg = isBeauty ? 'bg-theme-surface border border-[var(--color-divider)] rounded-xl' : 'bg-theme-surface border-2 border-[var(--color-divider)]';

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
                <TrendingUp className={`w-5 h-5 text-theme-accent`} />
                <h3 className="text-theme-text font-heading text-lg uppercase">
                    💎 Complete sua Experiência
                </h3>
            </div>

            <p className="text-theme-textSecondary text-sm mb-4">
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
                                    ? `border-theme-accent bg-theme-accent/10`
                                    : 'border-[var(--color-input-border)] hover:border-[var(--color-text-muted)]'
                                }
              `}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3 flex-1">
                                    {/* Checkbox */}
                                    <div className={`
                    w-6 h-6 rounded border-2 flex items-center justify-center mt-0.5
                    ${isSelected
                                            ? `border-theme-accent bg-theme-accent`
                                            : 'border-[var(--color-input-border)]'
                                        }
                  `}>
                                        {isSelected && <Check className="w-4 h-4 text-[var(--color-bg)]" />}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-theme-text font-bold">{upsell.name}</span>
                                            {savings > 0 && (
                                                <span className={`text-xs px-2 py-0.5 rounded-full bg-theme-accent/20 text-theme-accent font-bold`}>
                                                    Economize R$ {savings.toFixed(2)}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-3 text-sm">
                                            <span className={`text-theme-accent font-bold`}>
                                                +R$ {upsell.price.toFixed(2)}
                                            </span>
                                            <span className="text-theme-textSecondary">
                                                +{upsell.duration_minutes} min
                                            </span>
                                        </div>

                                        {/* Social Proof */}
                                        {upsell.upsell_text && (
                                            <div className="flex items-center gap-1 mt-2 text-xs text-theme-textSecondary">
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
                <div className={`mt-4 pt-4 border-t border-[var(--color-divider)]`}>
                    <div className="flex justify-between items-center">
                        <span className="text-theme-textSecondary text-sm">
                            {selectedUpsells.length} adicional{selectedUpsells.length > 1 ? 'is' : ''} selecionado{selectedUpsells.length > 1 ? 's' : ''}
                        </span>
                        <span className={`text-theme-accent font-bold`}>
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
