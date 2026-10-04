import type { jsPDF } from 'jspdf';
import type { CommissionPdfModel } from './commissionReport';

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 16;
const HEADER_H = 26;
const FOOTER_H = 14;

const INK: [number, number, number] = [26, 24, 22];
const INK_MUTED: [number, number, number] = [107, 98, 82];
const PAPER: [number, number, number] = [255, 255, 255];
const BAND: [number, number, number] = [26, 24, 22];
const BAND_TEXT: [number, number, number] = [245, 240, 230];
const BAND_MUTED: [number, number, number] = [184, 174, 156];
const RULE: [number, number, number] = [194, 155, 64];
const HEAD_BG: [number, number, number] = [42, 40, 36];
const ZEBRA: [number, number, number] = [247, 244, 238];
const BOX_BG: [number, number, number] = [250, 248, 243];
const BOX_LINE: [number, number, number] = [201, 192, 176];

function drawHeaderBand(doc: jsPDF, model: CommissionPdfModel): void {
    doc.setFillColor(...BAND);
    doc.rect(0, 0, PAGE_WIDTH, HEADER_H, 'F');
    doc.setFillColor(...RULE);
    doc.rect(0, HEADER_H, PAGE_WIDTH, 0.9, 'F');

    doc.setTextColor(...BAND_TEXT);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(model.businessName, MARGIN, 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...BAND_MUTED);
    doc.text(model.businessTypeHeading, MARGIN, 19.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...BAND_TEXT);
    doc.text(model.title, PAGE_WIDTH - MARGIN, 15, { align: 'right' });
}

function drawInfoBlock(doc: jsPDF, model: CommissionPdfModel, startY: number): number {
    const col2 = PAGE_WIDTH / 2 + 2;
    const label = (x: number, y: number, text: string) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...INK_MUTED);
        doc.text(text.toUpperCase(), x, y);
    };
    const value = (x: number, y: number, text: string) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...INK);
        doc.text(text, x, y);
    };

    let y = startY;
    label(MARGIN, y, 'Profissional');
    label(col2, y, 'Período');
    y += 5.2;
    value(MARGIN, y, model.professionalName);
    value(col2, y, model.periodLabel);
    y += 9;
    label(MARGIN, y, 'Comissão %');
    label(col2, y, 'Status');
    y += 5.2;
    value(MARGIN, y, `${model.commissionRate}%`);
    value(col2, y, model.statusLabel);
    return y + 8;
}

function totalsBoxHeight(model: CommissionPdfModel): number {
    const extra = model.totals.showFee ? 6 : 0;
    return 12 + extra + 6 + 6 + 8 + 14;
}

function drawTotalsBox(doc: jsPDF, model: CommissionPdfModel, startY: number): number {
    const boxW = 92;
    const x = PAGE_WIDTH - MARGIN - boxW;
    const rows: [string, string][] = [
        ['Subtotal bruto', model.totals.gross],
    ];
    if (model.totals.showFee) rows.push(['(-) Taxa maquininha', model.totals.fee]);
    rows.push(['(=) Base de cálculo', model.totals.base]);
    rows.push(['Comissão', model.totals.commission]);
    const h = totalsBoxHeight(model);

    doc.setFillColor(...BOX_BG);
    doc.setDrawColor(...BOX_LINE);
    doc.setLineWidth(0.35);
    doc.rect(x, startY, boxW, h, 'FD');

    let y = startY + 8;
    for (const [key, val] of rows) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...INK_MUTED);
        doc.text(key, x + 5, y);
        doc.setTextColor(...INK);
        doc.text(val, x + boxW - 5, y, { align: 'right' });
        y += 6;
    }

    doc.setDrawColor(...RULE);
    doc.setLineWidth(0.45);
    doc.line(x + 5, y - 1.5, x + boxW - 5, y - 1.5);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...INK_MUTED);
    doc.text('Valor líquido a receber', x + 5, y);
    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...INK);
    doc.text(model.totals.commission, x + boxW - 5, y, { align: 'right' });
    return startY + h;
}

function drawFooter(doc: jsPDF, model: CommissionPdfModel, page: number, total: number): void {
    const y = PAGE_HEIGHT - 8;
    doc.setDrawColor(...BOX_LINE);
    doc.setLineWidth(0.25);
    doc.line(MARGIN, y - 5, PAGE_WIDTH - MARGIN, y - 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...INK_MUTED);
    doc.text(model.generatedAtLabel, MARGIN, y);
    doc.text(`Página ${page}/${total}`, PAGE_WIDTH - MARGIN, y, { align: 'right' });
}

function ensureTotalsSpace(doc: jsPDF, model: CommissionPdfModel, startY: number): number {
    const needed = totalsBoxHeight(model) + 6;
    if (startY + needed <= PAGE_HEIGHT - FOOTER_H - 6) return startY;
    doc.addPage();
    drawHeaderBand(doc, model);
    return HEADER_H + 10;
}

async function renderDetailedTable(doc: jsPDF, model: CommissionPdfModel, startY: number): Promise<number> {
    const { default: autoTable } = await import('jspdf-autotable');
    autoTable(doc, {
        startY,
        margin: { top: HEADER_H + 8, left: MARGIN, right: MARGIN, bottom: FOOTER_H + 6 },
        head: [['Data', 'Serviço', 'Cliente', 'Valor', 'Taxa', 'Base', '%', 'Comissão']],
        body: model.rows.map((row) => [
            row.date,
            row.service,
            row.client,
            row.amount,
            row.fee,
            row.base,
            row.rate,
            row.commission,
        ]),
        theme: 'plain',
        styles: {
            font: 'helvetica',
            fontSize: 8,
            textColor: INK,
            cellPadding: { top: 3.4, bottom: 3.4, left: 1.4, right: 1.4 },
            overflow: 'linebreak',
            valign: 'middle',
            lineColor: BOX_LINE,
            lineWidth: 0.1,
        },
        headStyles: {
            fillColor: HEAD_BG,
            textColor: PAPER,
            fontStyle: 'bold',
            fontSize: 7.5,
            valign: 'middle',
        },
        alternateRowStyles: {
            fillColor: ZEBRA,
        },
        columnStyles: {
            0: { cellWidth: 16 },
            1: { cellWidth: 38 },
            2: { cellWidth: 30 },
            3: { cellWidth: 22, halign: 'right' },
            4: { cellWidth: 18, halign: 'right' },
            5: { cellWidth: 22, halign: 'right' },
            6: { cellWidth: 12, halign: 'right' },
            7: { cellWidth: 20, halign: 'right' },
        },
        showHead: 'everyPage',
        didDrawPage: () => {
            drawHeaderBand(doc, model);
        },
    });
    const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY;
    return (finalY ?? startY) + 8;
}

export async function generateCommissionPdf(model: CommissionPdfModel): Promise<{ blob: Blob; pageCount: number }> {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

    drawHeaderBand(doc, model);
    let y = drawInfoBlock(doc, model, HEADER_H + 10);

    if (model.variant === 'detalhado') {
        y = await renderDetailedTable(doc, model, y);
    } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(...INK);
        const countLabel = model.serviceCount === 1
            ? '1 serviço neste período'
            : `${model.serviceCount} serviços neste período`;
        doc.text(countLabel, MARGIN, y);
        y += 10;
    }

    y = ensureTotalsSpace(doc, model, y);
    drawTotalsBox(doc, model, y);

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i += 1) {
        doc.setPage(i);
        drawFooter(doc, model, i, pageCount);
    }

    return { blob: doc.output('blob'), pageCount };
}

export async function generateCommissionPdfBlob(model: CommissionPdfModel): Promise<Blob> {
    const { blob } = await generateCommissionPdf(model);
    return blob;
}

export async function shareOrDownloadCommissionPdf(opts: {
    fileName: string;
    model: CommissionPdfModel;
}): Promise<'shared' | 'downloaded'> {
    const blob = await generateCommissionPdfBlob(opts.model);
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
