import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useBrutalTheme } from '../hooks/useBrutalTheme';
import {
    formatNational,
    getNationalDigits,
    getPhoneCountry,
    PHONE_COUNTRIES,
    toE164,
    type PhoneCountry,
} from '../utils/phoneCountry';

interface PhoneInputProps {
    value: string;
    onChange: (value: string) => void;
    className?: string;
    placeholder?: string;
    id?: string;
    name?: string;
    region?: PhoneCountry;
    defaultRegion?: PhoneCountry;
    onRegionChange?: (region: PhoneCountry) => void;
    forceTheme?: 'beauty' | 'barber';
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
    value,
    onChange,
    className = '',
    id,
    name,
    region: controlledRegion,
    defaultRegion = 'BR',
    onRegionChange,
    forceTheme,
}) => {
    const { colors, radius, accent } = useBrutalTheme({ override: forceTheme });
    const isControlled = controlledRegion !== undefined;
    const [internalRegion, setInternalRegion] = useState<PhoneCountry>(defaultRegion);
    const region = controlledRegion ?? internalRegion;
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const previousRegion = useRef<PhoneCountry>(region);
    const previousDefaultRegion = useRef(defaultRegion);

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
        if (isControlled) return;
        const valueCountry = value ? getPhoneCountry(value) : undefined;
        if (valueCountry) setInternalRegion(valueCountry);
        else if (defaultRegion !== previousDefaultRegion.current) setInternalRegion(defaultRegion);
        previousDefaultRegion.current = defaultRegion;
    }, [defaultRegion, isControlled, value]);

    useEffect(() => {
        const previous = previousRegion.current;
        previousRegion.current = region;
        if (previous === region || !value) return;

        const sourceCountry = getPhoneCountry(value) ?? previous;
        if (sourceCountry === region) return;
        const digits = getNationalDigits(value, sourceCountry);
        const config = PHONE_COUNTRIES[region];
        if (digits.length < config.nationalLength.min || digits.length > config.nationalLength.max
            || digits.length + config.dialCode.length > 15) {
            onChange('');
            return;
        }
        onChange(toE164(digits, region));
    }, [onChange, region, value]);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        onChange(toE164(event.target.value, region));
    };

    const selectRegion = (nextRegion: PhoneCountry) => {
        if (nextRegion === region) {
            setIsOpen(false);
            return;
        }
        if (!isControlled) setInternalRegion(nextRegion);
        onRegionChange?.(nextRegion);
        setIsOpen(false);
    };

    const regionConfig = PHONE_COUNTRIES[region];
    const valueCountry = getPhoneCountry(value);
    const sourceDigits = valueCountry && valueCountry !== region
        ? getNationalDigits(value, valueCountry)
        : value;
    const displayValue = valueCountry && valueCountry !== region
        && sourceDigits.length > regionConfig.nationalLength.max
        ? ''
        : formatNational(sourceDigits, region);

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            <div className={`flex items-center h-11 border ${radius.input} ${colors.inputBg} ${colors.inputBorder} focus-within:border-[var(--color-input-focus)] focus-within:ring-1 focus-within:ring-[var(--color-input-focus)] transition-colors duration-200`}>
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    aria-label="Selecionar país"
                    className={`flex items-center gap-1 pl-3 pr-2 h-full shrink-0 border-r ${colors.inputBorder} hover:bg-[var(--color-card-hover)] transition-colors`}
                >
                    <span className="text-lg leading-none">{regionConfig.flag}</span>
                    <ChevronDown className={`w-3 h-3 ${colors.textMuted}`} />
                </button>
                <span className={`pl-3 font-mono text-sm pointer-events-none select-none ${colors.textMuted}`}>
                    +{regionConfig.dialCode}
                </span>
                <input
                    id={id}
                    name={name}
                    type="tel"
                    value={displayValue}
                    onChange={handleChange}
                    className={`flex-1 min-w-0 h-full bg-transparent pl-2 pr-4 text-base sm:text-sm font-mono ${colors.text} placeholder:text-[var(--color-text-muted)] focus:outline-none`}
                    autoComplete="tel"
                    placeholder={regionConfig.placeholder}
                />
            </div>
            {isOpen && (
                <div className={`absolute top-full left-0 mt-1 w-40 shadow-xl z-50 overflow-hidden border ${radius.input} ${colors.card} ${colors.inputBorder}`}>
                    {(Object.keys(PHONE_COUNTRIES) as PhoneCountry[]).map((country) => {
                        const config = PHONE_COUNTRIES[country];
                        return (
                            <button
                                key={country}
                                type="button"
                                onClick={() => selectRegion(country)}
                                aria-label={`Selecionar ${country}`}
                                aria-pressed={region === country}
                                className="flex items-center gap-3 w-full px-4 py-3 transition-all text-left hover:bg-[var(--color-accent-dim)]"
                            >
                                <span className="text-lg">{config.flag}</span>
                                <span className={`text-sm font-mono font-bold ${accent.text}`}>+{config.dialCode}</span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
