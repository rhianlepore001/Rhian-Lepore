import React from 'react';
import { useBrutalTheme, type ThemeVariant } from '../../hooks/useBrutalTheme';

export interface TableColumn<T> {
  key: string;
  header: React.ReactNode;
  render: (row: T, index: number) => React.ReactNode;
  headerClassName?: string;
  cellClassName?: string;
  align?: 'left' | 'center' | 'right';
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  rowKey: (row: T, index: number) => string | number;
  onRowClick?: (row: T, index: number) => void;
  emptyMessage?: string;
  className?: string;
  compact?: boolean;
  forceTheme?: ThemeVariant;
  mobileRender?: (row: T, index: number) => React.ReactNode;
}

const ALIGN = { left: 'text-left', center: 'text-center', right: 'text-right' } as const;

export function Table<T>({
  columns, data, rowKey, onRowClick, emptyMessage = 'Nenhum registro encontrado.',
  className = '', compact = false, forceTheme, mobileRender,
}: TableProps<T>) {
  const { classes, colors } = useBrutalTheme({ override: forceTheme });
  const pad = compact ? 'px-3 py-2' : 'px-4 py-3';

  if (data.length === 0) {
    return <div className={`text-center py-10 text-sm ${colors.textMuted}`}>{emptyMessage}</div>;
  }

  return (
    <>
      {mobileRender && (
        <div className={`md:hidden space-y-3 ${className}`}>
          {data.map((row, i) => <div key={rowKey(row, i)}>{mobileRender(row, i)}</div>)}
        </div>
      )}
      <div className={[mobileRender ? 'hidden md:block' : '', 'overflow-x-auto', className].filter(Boolean).join(' ')}>
        <table className="w-full border-collapse" role="table">
          <thead>
            <tr className={`border-b ${colors.divider}`}>
              {columns.map((col) => (
                <th key={col.key} scope="col" className={[pad, classes.tableHeader, ALIGN[col.align ?? 'left'], col.headerClassName ?? ''].join(' ')}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, ri) => (
              <tr
                key={rowKey(row, ri)}
                className={[`border-b ${colors.divider} last:border-b-0`, classes.tableRow, onRowClick ? 'cursor-pointer' : ''].join(' ')}
                onClick={onRowClick ? () => onRowClick(row, ri) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRowClick(row, ri); } } : undefined}
                role={onRowClick ? 'button' : undefined}
              >
                {columns.map((col) => (
                  <td key={col.key} className={[pad, 'text-sm', colors.text, ALIGN[col.align ?? 'left'], col.cellClassName ?? ''].join(' ')}>
                    {col.render(row, ri)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
