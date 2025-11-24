import React from 'react';
import { Star, User } from 'lucide-react';

interface Professional {
    id: string;
    full_name: string;
    photo_url: string | null;
    specialties: string[];
    individual_rating: number;
    total_reviews: number;
}

interface ProfessionalSelectorProps {
    professionals: Professional[];
    selectedProfessional: string | null;
    onSelect: (professionalId: string | null) => void;
    isBeauty?: boolean;
}

export const ProfessionalSelector: React.FC<ProfessionalSelectorProps> = ({
    professionals,
    selectedProfessional,
    onSelect,
    isBeauty = false
}) => {
    const accentColor = isBeauty ? 'beauty-neon' : 'accent-gold';
    const cardBg = isBeauty ? 'bg-white/5 border border-white/10 rounded-xl' : 'bg-black/40 border-2 border-neutral-800';

    return (
        <div className={`${cardBg} p-6 mb-6`}>
            <h3 className="text-white font-heading text-lg uppercase mb-4">
                Escolha seu Profissional
            </h3>

            <div className="overflow-x-auto pb-4 -mx-2 px-2">
                <div className="flex gap-4 min-w-max">
                    {/* "Qualquer Profissional" Option */}
                    <button
                        onClick={() => onSelect(null)}
                        className={`
              flex flex-col items-center gap-2 p-4 rounded-lg transition-all
              ${selectedProfessional === null
                                ? `border-2 border-${accentColor} bg-${accentColor}/10`
                                : 'border-2 border-neutral-700 hover:border-neutral-600'
                            }
              min-w-[120px]
            `}
                    >
                        <div className={`
              w-20 h-20 rounded-full flex items-center justify-center
              ${selectedProfessional === null
                                ? `bg-${accentColor}/20`
                                : 'bg-neutral-800'
                            }
            `}>
                            <User className={`w-10 h-10 ${selectedProfessional === null ? `text-${accentColor}` : 'text-neutral-500'}`} />
                        </div>
                        <div className="text-center">
                            <div className="text-white text-sm font-bold">Qualquer</div>
                            <div className="text-neutral-400 text-xs">Profissional</div>
                        </div>
                    </button>

                    {/* Professional Cards */}
                    {professionals.map(professional => {
                        const isSelected = selectedProfessional === professional.id;

                        return (
                            <button
                                key={professional.id}
                                onClick={() => onSelect(professional.id)}
                                className={`
                  flex flex-col items-center gap-2 p-4 rounded-lg transition-all
                  ${isSelected
                                        ? `border-2 border-${accentColor} bg-${accentColor}/10`
                                        : 'border-2 border-neutral-700 hover:border-neutral-600'
                                    }
                  min-w-[120px]
                `}
                            >
                                {/* Avatar */}
                                <div className={`
                  w-20 h-20 rounded-full overflow-hidden
                  ${isSelected ? `ring-2 ring-${accentColor}` : ''}
                `}>
                                    {professional.photo_url ? (
                                        <img
                                            src={professional.photo_url}
                                            alt={professional.full_name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
                                            <User className="w-10 h-10 text-neutral-500" />
                                        </div>
                                    )}
                                </div>

                                {/* Name */}
                                <div className="text-center">
                                    <div className="text-white text-sm font-bold">
                                        {professional.full_name.split(' ')[0]}
                                    </div>

                                    {/* Rating */}
                                    <div className="flex items-center justify-center gap-1 mt-1">
                                        <Star className={`w-3 h-3 text-${accentColor} fill-current`} />
                                        <span className="text-white text-xs font-bold">
                                            {professional.individual_rating.toFixed(1)}
                                        </span>
                                    </div>

                                    {/* Specialties */}
                                    {professional.specialties.length > 0 && (
                                        <div className="text-neutral-400 text-xs mt-1 truncate max-w-[100px]">
                                            {professional.specialties.slice(0, 2).join(', ')}
                                        </div>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Selected Professional Info */}
            {selectedProfessional && (
                <div className="mt-4 pt-4 border-t border-neutral-700">
                    {(() => {
                        const selected = professionals.find(p => p.id === selectedProfessional);
                        if (!selected) return null;

                        return (
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full overflow-hidden">
                                    {selected.photo_url ? (
                                        <img
                                            src={selected.photo_url}
                                            alt={selected.full_name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
                                            <User className="w-6 h-6 text-neutral-500" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <div className="text-white font-bold">{selected.full_name}</div>
                                    <div className="text-neutral-400 text-sm">
                                        {selected.specialties.join(', ')}
                                    </div>
                                    <div className="flex items-center gap-1 mt-1">
                                        <Star className={`w-3 h-3 text-${accentColor} fill-current`} />
                                        <span className="text-neutral-400 text-xs">
                                            {selected.individual_rating.toFixed(1)} ({selected.total_reviews} avaliações)
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}
        </div>
    );
};
