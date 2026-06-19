import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { useBrutalTheme, type ThemeVariant } from '../../hooks/useBrutalTheme';
import { EmptyState } from './EmptyState';

export interface TableColumn<T> {
  key: string;
  header: React.ReactNode;
  render: (row: T, index: number) => React.ReactNode;
  headerClassName?: string;
  cellClassName?: string;
  align?: 'left' | 'center' | 'right';
  scope?: 'col' | 'row';
}

interface TableEmptyState {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  rowKey: (row: T, index: number) => string | number;
  onRowClick?: (row: T, index: number) => void;
  selectedRowKey?: string | number | null;
  emptyState?: TableEmptyState;
  /** @deprecated use emptyState */
  emptyMessage?: string;
  className?: string;
  compact?: boolean;
  stickyHeader?: boolean;
  forceTheme?: ThemeVariant;
  mobileRender?: (row: T, index: number) => React.ReactNode;
  getRowClassName?: (row: T, index: number) => string;
}

const ALIGN = { left: 'text-left', center: 'text-center', right: 'text-right' } as const;

export function Table<T>({
  columns,
  data,
  rowKey,
  onRowClick,
  selectedRowKey = null,
  emptyState,
  emptyMessage = 'Nenhum registro encontrado.',
  className = '',
  compact = false,
  stickyHeader = true,
  forceTheme,
  mobileRender,
  getRowClassName,
}: TableProps<T>) {
  const { classes, colors, density, accent } = useBrutalTheme({ override: forceTheme });
  const cellPadX = compact ? 'px-3' : 'px-4';

  if (data.length === 0) {
    if (emptyState) {
      return <EmptyState {...emptyState} forceTheme={forceTheme} />;
    }
    return <div className={`text-center py-10 text-sm ${colors.textMuted}`}>{emptyMessage}</div>;
  }

  const headerRowClass = [
    stickyHeader ? 'sticky top-0 z-10' : '',
    stickyHeader ? colors.card : '',
    `border-b ${colors.divider}`,
  ].filter(Boolean).join(' ');

  return (
    <>
      {mobileRender && (
        <div className={`md:hidden space-y-3 ${className}`}>
          {data.map((row, i) => (
            <div key={rowKey(row, i)}>{mobileRender(row, i)}</div>
          ))}
        </div>
      )}
      <div className={[mobileRender ? 'hidden md:block' : '', 'overflow-x-auto', className].filter(Boolean).join(' ')}>
        <table className="w-full border-collapse" role="table">
          <thead>
            <tr className={headerRowClass}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope={col.scope ?? 'col'}
                  className={[
                    cellPadX,
                    density.tableRowPy,
                    classes.tableHeader,
                    ALIGN[col.align ?? 'left'],
                    col.headerClassName ?? '',
                  ].join(' ')}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, ri) => {
              const key = rowKey(row, ri);
              const isSelected = selectedRowKey != null && selectedRowKey === key;
              return (
                <tr
                  key={key}
                  className={[
                    `border-b ${colors.divider} last:border-b-0`,
                    classes.tableRow,
                    isSelected ? accent.bgDim : '',
                    onRowClick ? 'cursor-pointer' : '',
                    getRowClassName?.(row, ri) ?? '',
                  ].join(' ')}
                  onClick={onRowClick ? () => onRowClick(row, ri) : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={
                    onRowClick
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onRowClick(row, ri);
                          }
                        }
                      : undefined
                  }
                  role={onRowClick ? 'button' : undefined}
                  aria-selected={isSelected || undefined}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={[
                        cellPadX,
                        density.tableRowPy,
                        'text-sm',
                        colors.text,
                        ALIGN[col.align ?? 'left'],
                        col.cellClassName ?? '',
                      ].join(' ')}
                    >
                      {col.render(row, ri)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
