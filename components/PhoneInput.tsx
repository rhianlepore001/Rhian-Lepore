import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { useBrutalTheme } from '../hooks/useBrutalTheme';

interface PhoneInputProps {
    value: string;
    onChange: (value: string) => void;
    className?: string;
    placeholder?: string;
    defaultRegion?: 'BR' | 'PT';
    forceTheme?: 'beauty' | 'barber';
}

const REGIONS = {
    BR: { code: '+55', flag: '🇧🇷', mask: '(XX) XXXXX-XXXX', limit: 11 },
    PT: { code: '+351', flag: '🇵🇹', mask: 'XXX XXX XXX', limit: 9 },
};

export const PhoneInput: React.FC<PhoneInputProps> = ({
    value,
    onChange,
    className = '',
    placeholder = 'Telefone',
    defaultRegion = 'BR',
    forceTheme
}) => {
    const { colors, radius, accent } = useBrutalTheme({ override: forceTheme });
    const [region, setRegion] = useState<'BR' | 'PT'>(defaultRegion || 'BR');
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!value) {
            if (defaultRegion) setRegion(defaultRegion);
            return;
        }
        if (value.startsWith('+351')) {
            setRegion('PT');
        } else if (value.startsWith('+55')) {
            setRegion('BR');
        }
    }, [value, defaultRegion]);

    const formatDisplayNumber = (val: string, currentRegion: 'BR' | 'PT') => {
        if (!val) return '';
        const regionConfig = REGIONS[currentRegion];
        const numericCode = regionConfig.code.replace(/\D/g, '');
        let clean = val;

        // Remove o prefixo se ele estiver no formato +XX ou apenas XX
        if (clean.startsWith(regionConfig.code)) {
            clean = clean.slice(regionConfig.code.length);
        }

        // Loop para remover prefixos numéricos repetidos (limpeza de dados antigos)
        while (clean.startsWith(numericCode) && clean.length > (currentRegion === 'PT' ? 9 : 11)) {
            clean = clean.slice(numericCode.length);
        }

        clean = clean.replace(/\D/g, '');
        if (currentRegion === 'BR') {
            if (clean.length > 10) {
                return clean.replace(/^(\d\d)(\d{5})(\d{4}).*/, '($1) $2-$3');
            } else if (clean.length > 5) {
                return clean.replace(/^(\d\d)(\d{4})(\d{0,4}).*/, '($1) $2-$3');
            } else if (clean.length > 2) {
                return clean.replace(/^(\d\d)(\d{0,5}).*/, '($1) $2');
            } else {
                return clean;
            }
        } else {
            if (clean.length > 6) {
                return clean.replace(/^(\d{3})(\d{3})(\d{3}).*/, '$1 $2 $3');
            } else if (clean.length > 3) {
                return clean.replace(/^(\d{3})(\d{3})(\d{0,3}).*/, '$1 $2 $3');
            } else {
                return clean;
            }
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.target.value;
        const regionConfig = REGIONS[region];
        let digits = input.replace(/\D/g, '');

        // Se o usuário digitou o código do país novamente, removemos
        const numericCode = regionConfig.code.replace(/\D/g, '');
        if (digits.startsWith(numericCode) && digits.length > numericCode.length) {
            digits = digits.slice(numericCode.length);
        }

        const maxDigits = regionConfig.limit;
        const boundedDigits = digits.slice(0, maxDigits);

        if (boundedDigits.length > 0) {
            onChange(`${regionConfig.code}${boundedDigits}`);
        } else {
            onChange('');
        }
    };

    const regionConfig = REGIONS[region];
    let displayValue = '';
    if (value) {
        let raw = value;
        if (raw.startsWith(regionConfig.code)) {
            raw = raw.slice(regionConfig.code.length);
        }
        displayValue = formatDisplayNumber(raw, region);
    }

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            <div className={`flex items-center h-11 border ${radius.input} ${colors.inputBg} ${colors.inputBorder} focus-within:border-[var(--color-input-focus)] focus-within:ring-1 focus-within:ring-[var(--color-input-focus)] transition-colors duration-200`}>
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    aria-label="Selecionar país"
                    className={`flex items-center gap-1 pl-3 pr-2 h-full shrink-0 border-r ${colors.inputBorder} hover:bg-white/5 transition-colors`}
                >
                    <span className="text-lg leading-none">{REGIONS[region].flag}</span>
                    <ChevronDown className={`w-3 h-3 ${colors.textMuted}`} />
                </button>
                <span className={`pl-3 font-mono text-sm pointer-events-none select-none ${colors.textMuted}`}>
                    {REGIONS[region].code}
                </span>
                <input
                    type="tel"
                    value={displayValue}
                    onChange={handleChange}
                    className={`flex-1 min-w-0 h-full bg-transparent pl-2 pr-4 text-base sm:text-sm font-mono ${colors.text} placeholder:text-[var(--color-text-muted)] focus:outline-none`}
                    placeholder={region === 'BR' ? '(99) 99999-9999' : '999 999 999'}
                />
            </div>
            {isOpen && (
                <div className={`absolute top-full left-0 mt-1 w-40 shadow-xl z-50 overflow-hidden border ${radius.input} ${colors.card} ${colors.inputBorder}`}>
                    {(Object.keys(REGIONS) as Array<'BR' | 'PT'>).map((r) => (
                        <button
                            key={r}
                            type="button"
                            onClick={() => {
                                setRegion(r);
                                setIsOpen(false);
                                onChange('');
                            }}
                            className={`flex items-center gap-3 w-full px-4 py-3 transition-all text-left hover:bg-[var(--color-accent-dim)]`}
                        >
                            <span className="text-lg">{REGIONS[r].flag}</span>
                            <span className={`text-sm font-mono font-bold ${accent.text}`}>{REGIONS[r].code}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
