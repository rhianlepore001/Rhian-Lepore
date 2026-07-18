import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';

interface Option {
    id: string;
    name: string;
    subtext?: string;
}

interface SearchableSelectProps {
    options: Option[];
    value: string | string[];
    onChange: (id: any) => void;
    placeholder: string;
    label: string;
    accentColor: string;
    disabled?: boolean;
    multiple?: boolean;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
    options,
    value,
    onChange,
    placeholder,
    label,
    accentColor,
    multiple = false,
    disabled
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Helper to check if selected
    const isSelected = (id: string) => {
        if (multiple && Array.isArray(value)) {
            return value.includes(id);
        }
        return value === id;
    };

    const getDisplayValue = () => {
        if (multiple && Array.isArray(value)) {
            if (value.length === 0) return placeholder;
            const selectedNames = options
                .filter(o => value.includes(o.id))
                .map(o => o.name);

            if (selectedNames.length <= 2) return selectedNames.join(', ');
            return `${selectedNames.length} selecionados`;
        }
        const selected = options.find(o => o.id === value);
        return selected ? selected.name : placeholder;
    };

    // Filter options based on search term
    const filteredOptions = useMemo(() => {
        if (!searchTerm) return options;
        const lowerCaseSearch = searchTerm.toLowerCase();
        return options.filter(option =>
            option.name.toLowerCase().includes(lowerCaseSearch) ||
            option.subtext?.toLowerCase().includes(lowerCaseSearch)
        );
    }, [options, searchTerm]);

    // Handle clicks outside to close the dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (id: string) => {
        if (multiple) {
            const currentValues = Array.isArray(value) ? [...value] : [];
            const newValues = currentValues.includes(id)
                ? currentValues.filter(v => v !== id)
                : [...currentValues, id];
            onChange(newValues);
            // Don't close on multiple selection to allow picking more
        } else {
            onChange(id);
            setSearchTerm('');
            setIsOpen(false);
        }
    };

    const accentBorder = `focus:border-theme-accent`;
    const accentBg = `bg-theme-accent/10`;

    return (
        <div className="relative" ref={containerRef}>
            <label className="text-theme-text font-mono text-sm mb-2 block">{label}</label>

            {/* Input/Display Field */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                disabled={disabled}
                className={`w-full p-3 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-lg text-left text-theme-text focus:outline-none transition-colors flex items-center justify-between ${accentBorder} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-theme-accent'}`}
            >
                <span className={(multiple ? (value as string[]).length > 0 : value) ? 'text-theme-text' : 'text-[var(--color-text-muted)]'}>
                    {getDisplayValue()}
                </span>
                <ChevronDown className={`w-4 h-4 text-[var(--color-text-muted)] transition-transform ${isOpen ? 'rotate-180' : 'rotate-0'}`} />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute z-20 w-full mt-1 bg-theme-card border border-[var(--color-input-border)] rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {/* Search Input */}
                    <div className="p-2 sticky top-0 bg-theme-card border-b border-[var(--color-divider)]">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar..."
                                className={`w-full p-2 pl-10 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-lg text-theme-text focus:outline-none ${accentBorder} text-sm`}
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Options List */}
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map(option => (
                            <div
                                key={option.id}
                                onClick={() => handleSelect(option.id)}
                                className={`p-3 cursor-pointer hover:bg-[var(--color-card-hover)] flex items-center justify-between transition-colors ${isSelected(option.id) ? accentBg : ''}`}
                            >
                                <div>
                                    <p className="text-theme-text text-sm font-medium">{option.name}</p>
                                    {option.subtext && <p className="text-xs text-theme-textSecondary">{option.subtext}</p>}
                                </div>
                                {isSelected(option.id) && <Check className={`w-4 h-4 text-theme-accent`} />}
                            </div>
                        ))
                    ) : (
                        <div className="p-3 text-center text-[var(--color-text-muted)] text-sm">
                            Nenhum resultado encontrado.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};