import React, { useState } from 'react';
import { Copy, Check as CheckIcon, FileText, List, X } from 'lucide-react';
import { Button } from './ui/Button';
import { useBrutalTheme } from '../hooks/useBrutalTheme';
import {
    buildCommissionCopyText,
    buildDetailedPdfLines,
    buildSummaryPdfLines,
    commissionPdfFileName,
    type CommissionPdfVariant,
    type CommissionReportShareInput,
} from '../utils/commissionReport';
import { shareOrDownloadCommissionPdf } from '../utils/commissionPdf';

interface CommissionShareModalProps {
    report: CommissionReportShareInput;
    onClose: () => void;
}

export const CommissionShareModal: React.FC<CommissionShareModalProps> = ({
    report,
    onClose,
}) => {
    const [busy, setBusy] = useState<CommissionPdfVariant | null>(null);
    const [copied, setCopied] = useState(false);
    const { colors, radius } = useBrutalTheme();

    const handlePdf = async (variant: CommissionPdfVariant) => {
        if (busy) return;
        setBusy(variant);
        try {
            const lines = variant === 'resumido'
                ? buildSummaryPdfLines(report)
                : buildDetailedPdfLines(report);
            const fileName = commissionPdfFileName({
                professionalName: report.professionalName,
                periodLabel: report.periodLabel,
                variant,
            });
            await shareOrDownloadCommissionPdf({ fileName, lines, variant });
        } catch (err) {
            console.error('PDF share error:', err);
        } finally {
            setBusy(null);
        }
    };

    const handleCopyText = async () => {
        const text = buildCommissionCopyText(report);
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                const el = document.createElement('textarea');
                el.value = text;
                el.style.position = 'fixed';
                el.style.left = '-9999px';
                document.body.appendChild(el);
                el.select();
                document.execCommand('copy');
                document.body.removeChild(el);
            }
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch (err) {
            console.error('Copy failed', err);
        }
    };

    const choiceClass = `w-full text-left p-4 border ${colors.border} ${radius.card} ${colors.card} ${colors.surfaceHover} transition-colors disabled:opacity-60 min-h-[44px]`;

    return (
        <div
            className={`mt-2 border ${colors.border} ${radius.card} ${colors.card} p-4 space-y-3`}
            data-testid="commission-share-sheet"
            role="dialog"
            aria-labelledby="commission-share-title"
        >
            <div className="flex items-center justify-between gap-2">
                <h4 id="commission-share-title" className={`text-base font-semibold ${colors.text}`}>Compartilhar</h4>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Fechar compartilhar"
                    className={`p-2 ${radius.button} ${colors.textMuted} hover:text-theme-text hover:bg-theme-surface`}
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
            <p className={`text-sm ${colors.textSecondary}`}>
                Envie um PDF para o colaborador conferir o valor.
            </p>
            <button
                type="button"
                data-testid="share-option-resumido"
                className={choiceClass}
                disabled={!!busy}
                onClick={() => handlePdf('resumido')}
            >
                <span className="flex items-start gap-3">
                    <FileText className={`mt-0.5 h-5 w-5 shrink-0 ${colors.text}`} aria-hidden="true" />
                    <span>
                        <span className={`block font-semibold ${colors.text}`}>
                            {busy === 'resumido' ? 'Gerando PDF…' : 'Relatório resumido'}
                        </span>
                        <span className={`mt-1 block text-xs leading-relaxed ${colors.textMuted}`}>
                            Profissional, período, {report.commissionRate}%, subtotal, base e valor líquido.
                        </span>
                    </span>
                </span>
            </button>
            <button
                type="button"
                data-testid="share-option-detalhado"
                className={choiceClass}
                disabled={!!busy}
                onClick={() => handlePdf('detalhado')}
            >
                <span className="flex items-start gap-3">
                    <List className={`mt-0.5 h-5 w-5 shrink-0 ${colors.text}`} aria-hidden="true" />
                    <span>
                        <span className={`block font-semibold ${colors.text}`}>
                            {busy === 'detalhado' ? 'Gerando PDF…' : 'Relatório detalhado'}
                        </span>
                        <span className={`mt-1 block text-xs leading-relaxed ${colors.textMuted}`}>
                            Cada linha: data, serviço, cliente, valor, taxa, base, % e comissão — para conferir se está certo.
                        </span>
                    </span>
                </span>
            </button>
            <Button
                variant="ghost"
                fullWidth
                icon={copied ? <CheckIcon className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                onClick={handleCopyText}
            >
                {copied ? 'Copiado!' : 'Copiar texto'}
            </Button>
        </div>
    );
};
