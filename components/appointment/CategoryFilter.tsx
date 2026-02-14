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
    setActiveCategory,
    isBeauty
}) => {
    return (
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 custom-scrollbar -mx-2 px-2 md:mx-0 md:px-0">
            <button
                onClick={() => setActiveCategory('all')}
                className={`
                    px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all
                    ${activeCategory === 'all'
                        ? (isBeauty
                            ? 'bg-beauty-neon text-black border-2 border-beauty-neon'
                            : 'bg-accent-gold text-black border-2 border-accent-gold')
                        : 'bg-neutral-800 text-neutral-400 border-2 border-transparent hover:bg-neutral-700 hover:text-white'}
                `}
            >
                Todos
            </button>
            {categories && categories.length > 0 && categories.map(cat => (
                <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`
                        px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all
                        ${activeCategory === cat.id
                            ? (isBeauty
                                ? 'bg-beauty-neon text-black border-2 border-beauty-neon'
                                : 'bg-accent-gold text-black border-2 border-accent-gold')
                            : 'bg-neutral-800 text-neutral-400 border-2 border-transparent hover:bg-neutral-700 hover:text-white'}
                    `}
                >
                    {cat.name}
                </button>
            ))}
        </div>
    );
};
