export interface ExportColumn<T> {
    key: keyof T | string;
    label: string;
    format?: (row: T) => string | number;
}

export interface ExportOptions<T> {
    filename: string;
    data: T[];
    columns: ExportColumn<T>[];
}

function escapeCsv(value: unknown): string {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

export { escapeCsv };

export function exportToCsv<T>({ filename, data, columns }: ExportOptions<T>): void {
    const header = columns.map(c => escapeCsv(c.label)).join(',');
    const rows = data.map(row =>
        columns.map(col => {
            const value = typeof col.key === 'string' && col.key in (row as object)
                ? (row as Record<string, unknown>)[col.key]
                : col.format ? col.format(row) : (row as Record<string, unknown>)[col.key as string];
            return escapeCsv(col.format ? col.format(row) : value);
        }).join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export function exportToPdf<T>({ filename, data, columns }: ExportOptions<T>): void {
    if (typeof window === 'undefined') return;

    const escapeHtml = (s: unknown) => {
        const str = String(s ?? '');
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    };

    const headerCells = columns.map(c => `<th style="border:1px solid #ddd;padding:8px;text-align:left;background:#f5f5f5;font-size:11px">${escapeHtml(c.label)}</th>`).join('');
    const bodyRows = data.map(row =>
        `<tr>${columns.map(col => {
            const value = typeof col.key === 'string' && col.key in (row as object)
                ? (row as Record<string, unknown>)[col.key]
                : col.format ? col.format(row) : '';
            return `<td style="border:1px solid #ddd;padding:8px;font-size:11px">${escapeHtml(col.format ? col.format(row) : value)}</td>`;
        }).join('')}</tr>`
    ).join('');

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${escapeHtml(filename)}</title></head>
<body style="font-family:system-ui,sans-serif;margin:24px">
<h1 style="font-size:18px;margin:0 0 4px">${escapeHtml(filename)}</h1>
<p style="font-size:11px;color:#666;margin:0 0 16px">Gerado em ${new Date().toLocaleString('pt-BR')}</p>
<table style="border-collapse:collapse;width:100%">
<thead><tr>${headerCells}</tr></thead>
<tbody>${bodyRows}</tbody>
</table>
</body></html>`;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
    }, 250);
}
