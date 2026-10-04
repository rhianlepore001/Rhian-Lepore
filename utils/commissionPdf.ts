import type { CommissionPdfVariant } from './commissionReport';

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 16;
const TITLE_SIZE = 13;
const BODY_SIZE = 10;
const META_SIZE = 9;
const LINE_MM = 5.4;

export async function generateCommissionPdfBlob(lines: string[]): Promise<Blob> {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const maxWidth = PAGE_WIDTH - MARGIN * 2;
    let y = MARGIN + 2;
    let page = 1;

    const ensureSpace = (needed: number) => {
        if (y + needed <= PAGE_HEIGHT - MARGIN) return;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(String(page), PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 8, { align: 'right' });
        doc.addPage();
        page += 1;
        y = MARGIN;
    };

    for (let i = 0; i < lines.length; i += 1) {
        const raw = lines[i] ?? '';
        const isTitle = i === 0 || raw.startsWith('Relatório ');
        const isNet = raw.startsWith('Valor líquido a receber');
        const isMeta = i === 1 && !isTitle;
        const fontSize = isTitle || isNet ? TITLE_SIZE : isMeta ? META_SIZE : BODY_SIZE;
        doc.setFont('helvetica', isTitle || isNet ? 'bold' : 'normal');
        doc.setFontSize(fontSize);
        const wrapped: string[] = raw === '' ? [''] : doc.splitTextToSize(raw, maxWidth);
        for (const part of wrapped) {
            ensureSpace(LINE_MM);
            if (part !== '') {
                doc.text(part, MARGIN, y);
            }
            y += part === '' ? LINE_MM * 0.55 : LINE_MM;
        }
    }

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(String(page), PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 8, { align: 'right' });

    return doc.output('blob');
}

export async function shareOrDownloadCommissionPdf(opts: {
    fileName: string;
    lines: string[];
    variant: CommissionPdfVariant;
}): Promise<'shared' | 'downloaded'> {
    const blob = await generateCommissionPdfBlob(opts.lines);
    const file = new File([blob], opts.fileName, { type: 'application/pdf' });
    const payload = { files: [file], title: opts.fileName };
    const canShare = typeof navigator.canShare === 'function' && navigator.canShare(payload);
    if (canShare && typeof navigator.share === 'function') {
        try {
            await navigator.share(payload);
            return 'shared';
        } catch (err) {
            if ((err as { name?: string } | null)?.name === 'AbortError') return 'shared';
        }
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = opts.fileName;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    return 'downloaded';
}
