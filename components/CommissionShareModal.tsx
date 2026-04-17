import React, { useRef, useState } from 'react';
import { X, MessageCircle, Download, Loader2, Copy, Check as CheckIcon } from 'lucide-react';
import { BrutalButton } from './BrutalButton';

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
    reportRef
}) => {
    const [downloading, setDownloading] = useState(false);
    const [copied, setCopied] = useState(false);
    const summaryRef = useRef<HTMLDivElement>(null);

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
        `_Gerado pelo AGENX_`
    ].filter(Boolean).join('\n');

    const handleWhatsApp = () => {
        const url = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;
        window.open(url, '_blank');
    };

    const handleCopyText = async () => {
        try {
            await navigator.clipboard.writeText(whatsappText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch {
            // Fallback para ambientes sem clipboard API
            const el = document.createElement('textarea');
            el.value = whatsappText;
            el.style.position = 'fixed';
            el.style.opacity = '0';
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        }
    };

    const handlePDF = async () => {
        const target = summaryRef.current;
        if (!target) return;
        setDownloading(true);
        try {
            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(target, {
                backgroundColor: '#171717',
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
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[120] p-4 backdrop-blur-md">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-sm shadow-2xl">
                <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
                    <h3 className="text-white font-heading text-base uppercase tracking-tight">Compartilhar Resumo</h3>
                    <button onClick={onClose} className="p-1.5 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded-lg transition-all">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Summary card (used for PDF capture) */}
                <div ref={summaryRef} className="p-5 bg-neutral-900">
                    <div className="bg-neutral-800/60 rounded-xl p-4 space-y-3 border border-neutral-700">
                        <p className="text-neutral-500 text-[10px] font-mono uppercase tracking-widest">Resumo de Comissões</p>
                        <div className="space-y-1">
                            <p className="text-white font-bold text-lg leading-tight">{professionalName}</p>
                            {cpf && <p className="text-neutral-400 text-xs font-mono">CPF: {cpf}</p>}
                        </div>
                        <div className="border-t border-neutral-700 pt-3">
                            <p className="text-neutral-500 text-[10px] font-mono">Período</p>
                            <p className="text-white text-sm font-mono">{periodLabel}</p>
                        </div>
                        <div className="border-t border-neutral-700 pt-3">
                            <p className="text-neutral-500 text-[10px] font-mono uppercase">Valor a receber</p>
                            <p className="text-2xl font-mono font-bold text-accent-gold">{currencySymbol} {fmtAmount}</p>
                        </div>
                        <p className="text-neutral-600 text-[9px] font-mono">Gerado pelo AGENX</p>
                    </div>
                </div>

                <div className="px-5 pb-5 flex flex-col gap-3">
                    <BrutalButton
                        variant="primary"
                        className="w-full h-11"
                        icon={<MessageCircle className="w-4 h-4" />}
                        onClick={handleWhatsApp}
                    >
                        Compartilhar via WhatsApp
                    </BrutalButton>
                    <BrutalButton
                        variant="secondary"
                        className="w-full h-11"
                        icon={copied ? <CheckIcon className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        onClick={handleCopyText}
                    >
                        {copied ? 'Copiado!' : 'Copiar texto'}
                    </BrutalButton>
                    <BrutalButton
                        variant="secondary"
                        className="w-full h-11"
                        icon={downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        onClick={handlePDF}
                        disabled={downloading}
                    >
                        {downloading ? 'Gerando...' : 'Baixar Imagem'}
                    </BrutalButton>
                </div>
            </div>
        </div>
    );
};
