$content = @'
import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

interface PhoneInputProps {
    value: string;
    onChange: (value: string) => void;
    className?: string;
    placeholder?: string;
    defaultRegion?: 'BR' | 'PT';
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
    defaultRegion = 'BR'
}) => {
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

    // Detect region from value on mount or change
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
        
        // Remove country code if present
        let clean = val;
        if (clean.startsWith(regionConfig.code)) {
            clean = clean.slice(regionConfig.code.length);
        }
        
        // Remove non-digits
        clean = clean.replace(/\D/g, '');
        
        // Format
        if (currentRegion === 'BR') {
            if (clean.length > 10) { // 11 digits
                return clean.replace(/^(\d\d)(\d{5})(\d{4}).*/, '($1) $2-$3');
            } else if (clean.length > 5) {
                return clean.replace(/^(\d\d)(\d{4})(\d{0,4}).*/, '($1) $2-$3');
            } else if (clean.length > 2) {
                return clean.replace(/^(\d\d)(\d{0,5}).*/, '($1) $2');
            } else {
                return clean;
            }
        } else {
            // PT: XXX XXX XXX
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
        
        // Strip everything but numbers
        const digits = input.replace(/\D/g, '');
        
        // Limit length
        const maxDigits = regionConfig.limit;
        const boundedDigits = digits.slice(0, maxDigits);

        // Call onChange with full E.164 format
        if (boundedDigits.length > 0) {
            onChange(`${regionConfig.code}${boundedDigits}`);
        } else {
            onChange('');
        }
    };

    // Calculate display value
    const regionConfig = REGIONS[region];
    let displayValue = '';
    
    if (value) {
        // If value has code, strip it for display formatting
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
                    className="flex items-center gap-1 pl-3 pr-2 py-3 bg-neutral-800 border border-r-0 border-neutral-700 rounded-l-lg hover:bg-neutral-700 transition-colors h-[50px]"
                >
                    <span className="text-xl leading-none">{REGIONS[region].flag}</span>
                    <ChevronDown className="w-3 h-3 text-neutral-400" />
                </button>
                
                {isOpen && (
                    <div className="absolute top-full left-0 mt-1 w-40 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl z-50 overflow-hidden">
                        {(Object.keys(REGIONS) as Array<'BR' | 'PT'>).map((r) => (
                            <button
                                key={r}
                                type="button"
                                onClick={() => {
                                    setRegion(r);
                                    setIsOpen(false);
                                    onChange(''); // Clear value on region change to prevent mixing formats
                                }}
                                className="flex items-center gap-3 w-full px-4 py-3 hover:bg-neutral-800 transition-colors text-left"
                            >
                                <span className="text-xl">{REGIONS[r].flag}</span>
                                <span className="text-sm text-white font-mono">{REGIONS[r].code}</span>
                            </button>
                        ))}
                    </div>
                )}

                <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 font-mono text-sm pointer-events-none select-none h-fit">
                        {REGIONS[region].code}
                    </span>
                    <input
                        type="tel"
                        value={displayValue}
                        onChange={handleChange}
                        className="w-full pl-14 pr-4 py-3 bg-neutral-800 border border-neutral-700 rounded-r-lg text-white focus:outline-none focus:border-neutral-500 placeholder-neutral-600 font-mono h-[50px]"
                        placeholder={region === 'BR' ? '(99) 99999-9999' : '999 999 999'}
                    />
                </div>
            </div>
        </div>
    );
};
'@

$path = "c:\Users\User\Downloads\Rhian-Lepore-main\components\PhoneInput.tsx"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($path, $content, $utf8NoBom)

Write-Host "File written with UTF-8 (no BOM) encoding" -ForegroundColor Green
