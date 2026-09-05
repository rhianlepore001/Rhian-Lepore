import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Copy, Check, QrCode as QrCodeIcon } from 'lucide-react';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import { generatePixPayload, validatePixKey, detectPixKeyType, PixKeyType } from '../../lib/pix-generator';
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
    const [fallbackKey, setFallbackKey] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        const generate = async () => {
            setQrSvg(null);
            setPayload(null);
            setFallbackKey(null);
            try {
                const resolvedType =
                    (validatePixKey(pixKey, pixKeyType) ? pixKeyType : detectPixKeyType(pixKey)) ?? pixKeyType;
                const normalized = validatePixKey(pixKey, resolvedType);
                if (!normalized) {
                    if (active) setFallbackKey(pixKey.trim() || null);
                    return;
                }
                const code = generatePixPayload({
                    pixKey: normalized,
                    pixKeyType: resolvedType,
                    merchantName: merchantName || 'RECEBEDOR',
                    merchantCity: merchantCity || 'SAO PAULO',
                    amountCents,
                    txid: 'AGENDIX',
                });
                if (!active) return;
                setPayload(code);

                try {
                    const svg = await QRCode.toString(code, {
                        type: 'svg',
                        margin: 1,
                        width: 256,
                        color: { dark: '#111111', light: '#FFFFFF' },
                        errorCorrectionLevel: 'M',
                    });
                    if (active) setQrSvg(svg);
                } catch {
                    // Copia-e-cola continua disponível sem o QR.
                }
            } catch {
                if (active) setFallbackKey(pixKey.trim() || null);
            }
        };
        void generate();
        return () => { active = false; };
    }, [pixKey, pixKeyType, merchantName, merchantCity, amountCents]);

    const copyText = payload || fallbackKey || '';

    const handleCopy = async () => {
        if (!copyText) return;
        try {
            await navigator.clipboard.writeText(copyText);
            setCopied(true);
            showToast(
                payload ? 'Código Pix copiado! Cole no app do seu banco.' : 'Chave Pix copiada.',
                'success',
            );
            setTimeout(() => setCopied(false), 2000);
        } catch {
            showToast('Não foi possível copiar. Selecione manualmente.', 'error');
        }
    };

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
            ) : payload ? (
                <div className="w-full min-h-[72px] mx-auto bg-[var(--color-card-hover)] rounded-xl flex items-center justify-center px-4 py-6">
                    <span className="text-[var(--color-text-muted)] text-sm text-center">
                        Use o código abaixo no app do banco.
                    </span>
                </div>
            ) : fallbackKey ? (
                <div className="bg-[var(--color-warning-bg)] border border-[var(--color-warning-border)] rounded-xl p-3 text-[var(--color-warning)] text-sm leading-snug">
                    Não deu para gerar o QR. Pague para esta chave Pix no app do banco.
                </div>
            ) : (
                <div className="w-64 h-64 mx-auto bg-[var(--color-card-hover)] rounded-xl flex items-center justify-center">
                    <span className="text-[var(--color-text-muted)] text-sm">Gerando QR…</span>
                </div>
            )}

            <div>
                <p className={`${colors.textMuted} text-xs uppercase tracking-widest mb-1.5`}>
                    {payload ? 'Ou copie o código:' : 'Chave Pix:'}
                </p>
                <button
                    type="button"
                    onClick={() => void handleCopy()}
                    className={[
                        'w-full text-left p-3 rounded-xl text-xs font-mono break-all',
                        'bg-[var(--color-card-hover)]',
                        colors.border,
                        'border',
                        colors.textSecondary,
                        'transition-colors active:scale-[0.99]',
                    ].join(' ')}
                    aria-label="Copiar código Pix"
                >
                    {copyText ? (
                        <span className="line-clamp-3">{copyText}</span>
                    ) : (
                        <span className={colors.textMuted}>Gerando código…</span>
                    )}
                </button>
            </div>

            <button
                type="button"
                onClick={() => void handleCopy()}
                disabled={!copyText}
                className="w-full py-3 rounded-xl bg-[var(--color-accent)] text-[var(--color-on-accent)] font-bold uppercase tracking-wide text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
            >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copiado!' : payload ? 'Copiar código Pix' : 'Copiar chave Pix'}
            </button>
        </div>
    );
};
