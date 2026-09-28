import React from 'react';

interface CategoryFilterProps {
    categories: Array<{ id: string; name: string }>;
    activeCategory: string;
    setActiveCategory: (id: string) => void;
    accentColor: string;
    isBeauty: boolean;
}

type Chip = { id: string; name: string };

/**
 * Divide os chips em 2 linhas (leitura por linha), equilibrando a largura
 * estimada pelo tamanho do texto. Até 3 chips: uma linha só.
 */
export function splitChipRows(chips: Chip[]): Chip[][] {
    if (chips.length <= 3) return [chips];
    const width = (c: Chip) => c.name.length + 4; // padding do chip ≈ 4 caracteres
    const total = chips.reduce((sum, c) => sum + width(c), 0);
    let acc = 0;
    let cut = 1;
    for (let i = 0; i < chips.length - 1; i++) {
        const w = width(chips[i]);
        // corta onde a 1ª linha fica mais perto da metade
        if (Math.abs(acc + w - total / 2) > Math.abs(acc - total / 2) && i > 0) break;
        acc += w;
        cut = i + 1;
    }
    return [chips.slice(0, cut), chips.slice(cut)];
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
    categories,
    activeCategory,
    setActiveCategory
}) => {
    // Sem categorias (ex.: colaborador sem leitura antes da migration) um filtro
    // só com "Todos" não ajuda — não renderiza.
    if (!categories || categories.length === 0) return null;

    const chipBase = 'px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors border';
    const chipActive = 'bg-theme-accent text-[var(--color-on-accent)] border-theme-accent';
    const chipInactive = 'bg-[var(--color-card-hover)] text-theme-textSecondary border-transparent hover:bg-[var(--color-divider)] hover:text-theme-text';

    const rows = splitChipRows([{ id: 'all', name: 'Todos' }, ...categories.map(c => ({ id: c.id, name: c.name }))]);

    return (
        <div
            data-testid="category-filter"
            role="group"
            aria-label="Filtrar por categoria"
            className="mb-5 overflow-x-auto overscroll-x-contain pb-1.5 custom-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0"
        >
            <div className="flex w-max flex-col gap-2">
                {rows.map((row, idx) => (
                    <div key={idx} data-testid="category-filter-row" className="flex gap-2">
                        {row.map(chip => {
                            const active = activeCategory === chip.id;
                            return (
                                <button
                                    key={chip.id}
                                    type="button"
                                    aria-pressed={active}
                                    onClick={() => setActiveCategory(chip.id)}
                                    className={`${chipBase} ${active ? chipActive : chipInactive}`}
                                >
                                    {chip.name}
                                </button>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
};
