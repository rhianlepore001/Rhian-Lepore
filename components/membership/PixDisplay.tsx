import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, Check, QrCode as QrCodeIcon } from 'lucide-react';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import { generatePixPayload, validatePixKey, detectPixKeyType, PixKeyType } from '../../lib/pix-generator';
import { copyTextToClipboard } from '../../utils/clipboard';
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
    const codeRef = useRef<HTMLTextAreaElement>(null);

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
                        width: 180,
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

    const selectCode = () => {
        const el = codeRef.current;
        if (!el) return;
        el.focus();
        el.select();
    };

    const handleCopy = async () => {
        if (!copyText) return;
        const ok = await copyTextToClipboard(copyText);
        if (ok) {
            setCopied(true);
            showToast('Código Pix copiado! Cole no app do banco.', 'success');
            setTimeout(() => setCopied(false), 2500);
            return;
        }
        selectCode();
        showToast('Toque no código, copie e cole no app do banco.', 'warning');
    };

    return (
        <div className={`${colors.card} ${colors.border} border rounded-2xl p-5 space-y-4 ${className}`}>
            <div className="flex items-center gap-2 text-sm">
                <Copy className="w-5 h-5 text-[var(--color-accent)]" />
                <h3 className={`${font.heading} ${colors.text} uppercase tracking-wide font-bold`}>
                    Pagar com Pix
                </h3>
            </div>

            <p className={`${colors.textSecondary} text-sm leading-snug`}>
                No celular, copie o código e cole no Pix do seu banco. Não dá para escanear o QR desta mesma tela.
            </p>
            {description && (
                <p className={`${colors.textMuted} text-xs leading-snug`}>{description}</p>
            )}

            <button
                type="button"
                onClick={() => void handleCopy()}
                disabled={!copyText}
                data-testid="pix-copy-button"
                className="w-full min-h-[48px] py-3 rounded-xl bg-[var(--color-accent)] text-[var(--color-on-accent)] font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
            >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copiado! Cole no banco' : payload ? 'Copiar código Pix' : 'Copiar chave Pix'}
            </button>

            <div>
                <label htmlFor="pix-copia-cola" className={`${colors.textMuted} text-xs uppercase tracking-widest mb-1.5 block`}>
                    Código Pix (copia e cola)
                </label>
                <textarea
                    id="pix-copia-cola"
                    ref={codeRef}
                    readOnly
                    value={copyText}
                    rows={3}
                    onFocus={selectCode}
                    onClick={selectCode}
                    data-testid="pix-copia-cola"
                    className={[
                        'w-full p-3 rounded-xl text-xs font-mono break-all resize-none',
                        'bg-[var(--color-card-hover)]',
                        colors.border,
                        'border',
                        colors.textSecondary,
                        'select-all',
                    ].join(' ')}
                    aria-label="Código Pix copia e cola"
                />
                <p className={`${colors.textMuted} text-xs mt-1.5 leading-snug`}>
                    Se o botão não copiar, toque no código, copie e cole no banco.
                </p>
            </div>

            {qrSvg ? (
                <details className={`${colors.inputBg} ${colors.border} border rounded-xl p-3`}>
                    <summary className={`text-sm font-medium ${colors.text} cursor-pointer min-h-[44px] flex items-center gap-2 list-none [&::-webkit-details-marker]:hidden`}>
                        <QrCodeIcon className="w-4 h-4 shrink-0" aria-hidden />
                        Mostrar QR Code
                    </summary>
                    <p className={`${colors.textMuted} text-xs mt-2 mb-3 leading-snug`}>
                        Só funciona se outra pessoa escanear com o celular dela, ou se você estiver no computador.
                    </p>
                    <div className="flex justify-center bg-white p-3 rounded-xl">
                        <div
                            className="w-40 h-40"
                            dangerouslySetInnerHTML={{ __html: qrSvg }}
                            role="img"
                            aria-label="QR Code Pix"
                        />
                    </div>
                </details>
            ) : copyText ? null : (
                <p className={`${colors.textMuted} text-sm`}>Gerando código Pix…</p>
            )}
        </div>
    );
};
