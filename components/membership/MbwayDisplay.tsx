import React, { useState } from 'react';
import { Copy, Check, Smartphone } from 'lucide-react';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import { useToast } from '../ui/Toast';
import { formatCurrency, formatPhone, Region } from '../../utils/formatters';

interface MbwayDisplayProps {
    phone: string;
    holderName?: string | null;
    amountCents: number;
    description?: string;
    className?: string;
}

export const MbwayDisplay: React.FC<MbwayDisplayProps> = ({
    phone,
    holderName,
    amountCents,
    description,
    className = '',
}) => {
    const { colors, font } = useBrutalTheme();
    const { showToast } = useToast();
    const [copied, setCopied] = useState(false);
    const formatted = formatPhone(phone, 'PT' as Region);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(formatted || phone);
            setCopied(true);
            showToast('Número MB WAY copiado.', 'success');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            showToast('Não foi possível copiar. Anote o número.', 'error');
        }
    };

    return (
        <div className={`${colors.card} ${colors.border} border rounded-2xl p-6 space-y-4 ${className}`}>
            <div className="flex items-center gap-2 text-sm">
                <Smartphone className="w-5 h-5 text-[var(--color-accent)]" />
                <h3 className={`${font.heading} ${colors.text} uppercase tracking-wide font-bold`}>
                    Pagar com MB WAY
                </h3>
            </div>

            {description && (
                <p className={`${colors.textSecondary} text-sm leading-snug`}>{description}</p>
            )}

            <div className={`${colors.inputBg} ${colors.border} border rounded-xl p-4 space-y-1`}>
                {holderName && (
                    <p className={`text-xs uppercase tracking-wider ${colors.textMuted}`}>{holderName}</p>
                )}
                <p className={`text-2xl font-bold tabular-nums ${colors.text}`}>{formatted}</p>
                <p className={`text-sm ${colors.textSecondary}`}>
                    Envie {formatCurrency(amountCents / 100, 'PT')}
                </p>
            </div>

            <p className={`${colors.textSecondary} text-sm leading-snug`}>
                Abra o MB WAY, escolha Enviar dinheiro e use este telemóvel.
            </p>

            <button
                type="button"
                onClick={() => void handleCopy()}
                className="w-full py-3 rounded-xl bg-[var(--color-accent)] text-[var(--color-on-accent)] font-bold uppercase tracking-wide text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copiado!' : 'Copiar número'}
            </button>
        </div>
    );
};
