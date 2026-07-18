import React from 'react';

interface CategoryFilterProps {
    categories: any[];
    activeCategory: string;
    setActiveCategory: (id: string) => void;
    accentColor: string;
    isBeauty: boolean;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
    categories,
    activeCategory,
    setActiveCategory
}) => {
    const chipBase = 'px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all';
    const chipActive = 'bg-theme-accent text-[var(--color-bg)] border-2 border-theme-accent';
    const chipInactive = 'bg-[var(--color-card-hover)] text-theme-textSecondary border-2 border-transparent hover:bg-[var(--color-divider)] hover:text-theme-text';

    return (
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 custom-scrollbar -mx-2 px-2 md:mx-0 md:px-0">
            <button
                onClick={() => setActiveCategory('all')}
                className={`${chipBase} ${activeCategory === 'all' ? chipActive : chipInactive}`}
            >
                Todos
            </button>
            {categories && categories.length > 0 && categories.map(cat => (
                <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`${chipBase} ${activeCategory === cat.id ? chipActive : chipInactive}`}
                >
                    {cat.name}
                </button>
            ))}
        </div>
    );
};
