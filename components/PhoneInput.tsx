import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

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
    const { userType } = useAuth();
    const isBeauty = forceTheme ? forceTheme === 'beauty' : userType === 'beauty';
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
            <div className="flex items-center">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={`flex items-center gap-1 pl-3 pr-2 py-3 border border-r-0 h-[54px] transition-all ${isBeauty
                        ? 'bg-beauty-card/50 border-beauty-neon/20 rounded-l-2xl hover:bg-beauty-card hover:border-beauty-neon/40'
                        : 'bg-neutral-900 border-neutral-800 border-2 hover:bg-neutral-800'
                        }`}
                >
                    <span className="text-xl leading-none">{REGIONS[region].flag}</span>
                    <ChevronDown className={`w-3 h-3 ${isBeauty ? 'text-beauty-neon/60' : 'text-neutral-400'}`} />
                </button>
                {isOpen && (
                    <div className={`absolute top-full left-0 mt-1 w-40 shadow-xl z-50 overflow-hidden ${isBeauty
                        ? 'bg-beauty-dark border border-beauty-neon/30 rounded-xl shadow-[0_0_20px_rgba(167,139,250,0.2)]'
                        : 'bg-neutral-900 border-2 border-neutral-800 shadow-heavy'
                        }`}>
                        {(Object.keys(REGIONS) as Array<'BR' | 'PT'>).map((r) => (
                            <button
                                key={r}
                                type="button"
                                onClick={() => {
                                    setRegion(r);
                                    setIsOpen(false);
                                    onChange('');
                                }}
                                className={`flex items-center gap-3 w-full px-4 py-3 transition-all text-left ${isBeauty
                                    ? 'hover:bg-beauty-neon/10 border-l-2 border-transparent hover:border-beauty-neon'
                                    : 'hover:bg-neutral-800 border-l-4 border-transparent hover:border-accent-gold'
                                    }`}
                            >
                                <span className="text-xl">{REGIONS[r].flag}</span>
                                <span className={`text-sm font-mono font-bold ${isBeauty ? 'text-beauty-neon' : 'text-accent-gold'
                                    }`}>{REGIONS[r].code}</span>
                            </button>
                        ))}
                    </div>
                )}
                <div className="flex-1 relative">
                    <span className={`absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm pointer-events-none select-none h-fit ${isBeauty ? 'text-beauty-neon/40' : 'text-accent-gold/50'
                        }`}>
                        {REGIONS[region].code}
                    </span>
                    <input
                        type="tel"
                        value={displayValue}
                        onChange={handleChange}
                        className={`w-full pl-14 pr-4 py-3 text-white focus:outline-none font-mono h-[54px] transition-all ${isBeauty
                            ? 'bg-beauty-card/50 border border-beauty-neon/20 rounded-r-2xl focus:border-beauty-neon focus:bg-beauty-card placeholder-beauty-neon/30 focus:shadow-[0_0_15px_rgba(167,139,250,0.15)]'
                            : 'bg-neutral-900 border-2 border-neutral-800 border-l-0 focus:border-accent-gold placeholder-neutral-600'
                            }`}
                        placeholder={region === 'BR' ? '(99) 99999-9999' : '999 999 999'}
                    />
                </div>
            </div>
        </div>
    );
};
