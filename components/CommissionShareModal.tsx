import React, { useRef, useState } from 'react';
import { MessageCircle, Download, Loader2, Copy, Check as CheckIcon } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { useBrutalTheme } from '../hooks/useBrutalTheme';

interface CommissionShareModalProps {
    professionalName: string;
    cpf?: string | null;
    periodLabel: string;
    netAmount: number;
    currencySymbol: string;
    onClose: () => void;
    reportRef?: React.RefObject<HTMLDivElement>;
}

export const CommissionShareModal: React.FC<CommissionShareModalProps> = ({
    professionalName,
    cpf,
    periodLabel,
    netAmount,
    currencySymbol,
    onClose,
}) => {
    const [downloading, setDownloading] = useState(false);
    const [copied, setCopied] = useState(false);
    const summaryRef = useRef<HTMLDivElement>(null);
    const { colors, accent, font } = useBrutalTheme();

    const fmtAmount = netAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

    const whatsappText = [
        `*Resumo de Comissões*`,
        ``,
        `Profissional: ${professionalName}`,
        cpf ? `CPF: ${cpf}` : null,
        `Período: ${periodLabel}`,
        ``,
        `*Valor a receber: ${currencySymbol} ${fmtAmount}*`,
        ``,
        `_Gerado pelo AgendiX_`
    ].filter(Boolean).join('\n');

    const handleWhatsApp = () => {
        const url = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;
        window.open(url, '_blank');
    };

    const handleCopyText = async () => {
        if (navigator.share && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
            try {
                await navigator.share({
                    title: 'Resumo de Comissões - AgendiX',
                    text: whatsappText
                });
                return;
            } catch (err) {
                // Share failed or cancelled
            }
        }

        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(whatsappText);
                setCopied(true);
                setTimeout(() => setCopied(false), 2500);
            } else {
                throw new Error('Clipboard API unavailable');
            }
        } catch {
            try {
                const el = document.createElement('textarea');
                el.value = whatsappText;
                el.style.position = 'fixed';
                el.style.left = '-9999px';
                el.style.top = '0';
                el.style.opacity = '0';
                document.body.appendChild(el);
                el.focus();
                el.select();
                const successful = document.execCommand('copy');
                document.body.removeChild(el);
                if (successful) {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2500);
                }
            } catch (fallbackErr) {
                console.error('Fallback copy failed', fallbackErr);
            }
        }
    };

    const handlePDF = async () => {
        const target = summaryRef.current;
        if (!target) return;
        setDownloading(true);
        try {
            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(target, {
                backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--color-card').trim() || '#171717',
                scale: 2
            });
            const link = document.createElement('a');
            link.download = `comissao-${professionalName.replace(/\s+/g, '-').toLowerCase()}-${periodLabel.replace(/[^a-z0-9]/gi, '-')}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (err) {
            console.error('PDF export error:', err);
        } finally {
            setDownloading(false);
        }
    };

    return (
        <Modal
            open
            onClose={onClose}
            title="Compartilhar Resumo"
            size="sm"
        >
            <div className="space-y-4">
                <div ref={summaryRef} className={`${colors.card} p-4`}>
                    <div className={`${colors.surface} rounded-xl p-4 space-y-3 ${colors.border} border`}>
                        <p className={`${colors.textMuted} text-[10px] ${font.mono} uppercase tracking-widest`}>Resumo de Comissões</p>
                        <div className="space-y-1">
                            <p className={`${colors.text} font-bold text-lg leading-tight`}>{professionalName}</p>
                            {cpf && <p className={`${colors.textSecondary} text-xs ${font.mono}`}>CPF: {cpf}</p>}
                        </div>
                        <div className={`border-t ${colors.divider} pt-3`}>
                            <p className={`${colors.textMuted} text-[10px] ${font.mono}`}>Período</p>
                            <p className={`${colors.text} text-sm ${font.mono}`}>{periodLabel}</p>
                        </div>
                        <div className={`border-t ${colors.divider} pt-3`}>
                            <p className={`${colors.textMuted} text-[10px] ${font.mono} uppercase`}>Valor a receber</p>
                            <p className={`text-2xl ${font.mono} font-bold ${accent.text}`}>{currencySymbol} {fmtAmount}</p>
                        </div>
                        <p className={`${colors.textMuted} opacity-60 text-[9px] ${font.mono}`}>Gerado pelo AgendiX</p>
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <Button
                        variant="primary"
                        fullWidth
                        icon={<MessageCircle className="w-4 h-4" />}
                        onClick={handleWhatsApp}
                    >
                        Compartilhar via WhatsApp
                    </Button>
                    <Button
                        variant="secondary"
                        fullWidth
                        icon={copied ? <CheckIcon className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        onClick={handleCopyText}
                    >
                        {copied ? 'Copiado!' : 'Copiar texto'}
                    </Button>
                    <Button
                        variant="secondary"
                        fullWidth
                        loading={downloading}
                        icon={!downloading ? <Download className="w-4 h-4" /> : undefined}
                        onClick={handlePDF}
                        disabled={downloading}
                    >
                        {downloading ? 'Gerando...' : 'Baixar Imagem'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
