import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';

interface Option {
    id: string;
    name: string;
    subtext?: string;
}

interface SearchableSelectProps {
    options: Option[];
    value: string;
    onChange: (id: string) => void;
    placeholder: string;
    label: string;
    accentColor: string;
    disabled?: boolean;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
    options,
    value,
    onChange,
    placeholder,
    label,
    accentColor,
    disabled = false
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(o => o.id === value);

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
        onChange(id);
        setSearchTerm('');
        setIsOpen(false);
    };

    const accentBorder = `focus:border-${accentColor}`;
    const accentBg = `bg-${accentColor}/10`;

    return (
        <div className="relative" ref={containerRef}>
            <label className="text-white font-mono text-sm mb-2 block">{label}</label>
            
            {/* Input/Display Field */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                disabled={disabled}
                className={`w-full p-3 bg-neutral-800 border border-neutral-700 rounded-lg text-left text-white focus:outline-none transition-colors flex items-center justify-between ${accentBorder} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-neutral-600'}`}
            >
                <span className={selectedOption ? 'text-white' : 'text-neutral-500'}>
                    {selectedOption ? selectedOption.name : placeholder}
                </span>
                <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform ${isOpen ? 'rotate-180' : 'rotate-0'}`} />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute z-20 w-full mt-1 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {/* Search Input */}
                    <div className="p-2 sticky top-0 bg-neutral-900 border-b border-neutral-700">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar..."
                                className={`w-full p-2 pl-10 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none ${accentBorder} text-sm`}
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
                                className={`p-3 cursor-pointer hover:bg-neutral-800 flex items-center justify-between transition-colors ${option.id === value ? accentBg : ''}`}
                            >
                                <div>
                                    <p className="text-white text-sm font-medium">{option.name}</p>
                                    {option.subtext && <p className="text-xs text-neutral-400">{option.subtext}</p>}
                                </div>
                                {option.id === value && <Check className={`w-4 h-4 text-${accentColor}`} />}
                            </div>
                        ))
                    ) : (
                        <div className="p-3 text-center text-neutral-500 text-sm">
                            Nenhum resultado encontrado.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};