import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Copy, Check, QrCode as QrCodeIcon } from 'lucide-react';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import { generatePixPayload, validatePixKey, PixKeyType } from '../../lib/pix-generator';
import { useToast } from '../ui/Toast';

interface PixDisplayProps {
    pixKey: string;
    pixKeyType: PixKeyType;
    merchantName: string;
    merchantCity: string;
    amountCents: number;
    description?: string;
    className?: string;
}

export const PixDisplay: React.FC<PixDisplayProps> = ({
    pixKey,
    pixKeyType,
    merchantName,
    merchantCity,
    amountCents,
    description,
    className = '',
}) => {
    const { colors, font } = useBrutalTheme();
    const { showToast } = useToast();
    const [qrSvg, setQrSvg] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [payload, setPayload] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        const generate = async () => {
            try {
                const normalized = validatePixKey(pixKey, pixKeyType);
                if (!normalized) {
                    setError('Chave Pix inválida. Verifique em Configurações > Clube.');
                    return;
                }
                const code = generatePixPayload({
                    pixKey: normalized,
                    pixKeyType,
                    merchantName: merchantName || 'RECEBEDOR',
                    merchantCity: merchantCity || 'SAO PAULO',
                    amountCents,
                    txid: 'AGENDIX',
                });
                if (!active) return;
                setPayload(code);
                setError(null);

                const svg = await QRCode.toString(code, {
                    type: 'svg',
                    margin: 1,
                    width: 256,
                    color: { dark: 'var(--color-bg)', light: 'var(--color-text)' },
                    errorCorrectionLevel: 'M',
                });
                if (active) setQrSvg(svg);
            } catch (err) {
                if (active) setError((err as Error).message || 'Erro ao gerar QR Code');
            }
        };
        generate();
        return () => { active = false; };
    }, [pixKey, pixKeyType, merchantName, merchantCity, amountCents]);

    const handleCopy = async () => {
        if (!payload) return;
        try {
            await navigator.clipboard.writeText(payload);
            setCopied(true);
            showToast('Código Pix copiado! Cole no app do seu banco.', 'success');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            showToast('Não foi possível copiar. Selecione manualmente.', 'error');
        }
    };

    if (error) {
        return (
            <div className={`p-4 rounded-xl bg-[var(--color-danger-bg)] border border-[var(--color-danger-border)]/30 text-[var(--color-danger)] text-sm ${className}`}>
                {error}
            </div>
        );
    }

    return (
        <div className={`${colors.card} ${colors.border} border rounded-2xl p-6 space-y-4 ${className}`}>
            <div className="flex items-center gap-2 text-sm">
                <QrCodeIcon className="w-5 h-5 text-[var(--color-accent)]" />
                <h3 className={`${font.heading} ${colors.text} uppercase tracking-wide font-bold`}>
                    Pagar com Pix
                </h3>
            </div>

            {description && (
                <p className={`${colors.textSecondary} text-sm`}>{description}</p>
            )}

            {qrSvg ? (
                <div className="flex justify-center bg-white p-4 rounded-xl">
                    <div
                        className="w-64 h-64"
                        dangerouslySetInnerHTML={{ __html: qrSvg }}
                        role="img"
                        aria-label="QR Code Pix"
                    />
                </div>
            ) : (
                <div className="w-64 h-64 mx-auto bg-[var(--color-card-hover)] rounded-xl flex items-center justify-center">
                    <span className="text-[var(--color-text-muted)] text-sm">Gerando QR…</span>
                </div>
            )}

            <div>
                <p className={`${colors.textMuted} text-xs uppercase tracking-widest mb-1.5`}>
                    Ou copie o código:
                </p>
                <button
                    type="button"
                    onClick={handleCopy}
                    className={[
                        'w-full text-left p-3 rounded-xl text-xs font-mono break-all',
                        'bg-[var(--color-card-hover)] hover:bg-[var(--color-card-hover)]',
                        colors.border,
                        'border',
                        colors.textSecondary,
                        'transition-colors active:scale-[0.99]',
                    ].join(' ')}
                    aria-label="Copiar código Pix"
                >
                    {payload ? (
                        <span className="line-clamp-3">{payload}</span>
                    ) : (
                        <span className={colors.textMuted}>Gerando código…</span>
                    )}
                </button>
            </div>

            <button
                type="button"
                onClick={handleCopy}
                className="w-full py-3 rounded-xl bg-[var(--color-accent)] text-[var(--color-bg)] font-bold uppercase tracking-wide text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copiado!' : 'Copiar código Pix'}
            </button>
        </div>
    );
};
