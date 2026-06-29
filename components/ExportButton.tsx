import React, { useState, useRef, useEffect } from 'react';
import { Download, FileText, FileSpreadsheet } from 'lucide-react';
import { useBrutalTheme } from '../hooks/useBrutalTheme';

interface ExportButtonProps {
    onExportCsv: () => void;
    onExportPdf: () => void;
    label?: string;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
    onExportCsv,
    onExportPdf,
    label = 'Exportar',
}) => {
    const [open, setOpen] = useState(false);
    const { accent, colors, font, radius } = useBrutalTheme();
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const onClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        const onEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        if (open) {
            document.addEventListener('mousedown', onClick);
            document.addEventListener('keydown', onEsc);
        }
        return () => {
            document.removeEventListener('mousedown', onClick);
            document.removeEventListener('keydown', onEsc);
        };
    }, [open]);

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                aria-expanded={open}
                aria-haspopup="menu"
                className={`inline-flex items-center gap-2 px-4 py-2.5 ${radius.button} ${colors.card} ${colors.border} ${colors.text} hover:${colors.textSecondary} transition-all active:scale-95`}
            >
                <Download className="w-4 h-4" strokeWidth={2.5} />
                <span className={`text-sm font-bold uppercase tracking-wide ${font.heading}`}>{label}</span>
            </button>

            {open && (
                <div
                    role="menu"
                    className={`absolute right-0 mt-2 w-56 ${colors.card} ${colors.border} ${radius.card} shadow-promax-depth overflow-hidden z-30 animate-in fade-in slide-in-from-top-2 duration-150`}
                >
                    <button
                        type="button"
                        role="menuitem"
                        onClick={() => { onExportCsv(); setOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 ${colors.text} hover:bg-white/5 transition-colors text-left`}
                    >
                        <FileSpreadsheet className={`w-4 h-4 ${accent.text}`} />
                        <div className="flex-1">
                            <p className={`text-sm font-bold ${font.heading}`}>Baixar CSV</p>
                            <p className="text-xs text-text-muted">Para Excel, Google Sheets, contador</p>
                        </div>
                    </button>
                    <div className={`border-t ${colors.divider}`} />
                    <button
                        type="button"
                        role="menuitem"
                        onClick={() => { onExportPdf(); setOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 ${colors.text} hover:bg-white/5 transition-colors text-left`}
                    >
                        <FileText className={`w-4 h-4 ${accent.text}`} />
                        <div className="flex-1">
                            <p className={`text-sm font-bold ${font.heading}`}>Imprimir PDF</p>
                            <p className="text-xs text-text-muted">Abre janela de impressão → Salvar como PDF</p>
                        </div>
                    </button>
                </div>
            )}
        </div>
    );
};
