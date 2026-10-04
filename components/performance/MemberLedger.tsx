import React, { useEffect, useState } from 'react';
import { Button, Skeleton } from '../ui';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import { fetchPerformanceLedger, pageLedger, type LedgerRow } from '../../services/performanceLedger';

interface MemberLedgerProps {
  companyId: string;
  professionalId: string;
  start: string;
  end: string;
  tz: string;
  formatMoney: (v: number) => string;
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function kindLabel(r: LedgerRow): string {
  if (r.kind === 'atendimento') return r.club ? 'Clube' : r.title;
  return r.title;
}

export const MemberLedger: React.FC<MemberLedgerProps> = ({ companyId, professionalId, start, end, tz, formatMoney }) => {
  const { colors, font, radius } = useBrutalTheme();
  const [rows, setRows] = useState<LedgerRow[] | null>(null);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let alive = true;
    setRows(null);
    setError(false);
    setPage(1);
    fetchPerformanceLedger({ companyId, professionalId, start, end, tz })
      .then((data) => { if (alive) setRows(data); })
      .catch((err: unknown) => {
        console.error('performance_ledger falhou');
        if (err && typeof err === 'object') console.error((err as { code?: string }).code || 'erro');
        if (alive) setError(true);
      });
    return () => { alive = false; };
  }, [companyId, professionalId, start, end, tz]);

  const sliced = rows ? pageLedger(rows, page) : null;
  const amount = (r: LedgerRow) => (r.club ? 'Clube' : formatMoney(r.amount));

  return (
    <section aria-label="Lançamentos" className={`border ${colors.border} ${radius.card} ${colors.card}`}>
      <div className="px-4 lg:px-5 pt-4 pb-2 flex items-baseline justify-between gap-3">
        <h3 className={`text-lg font-semibold ${colors.text}`}>Lançamentos</h3>
        {rows && <p className={`text-[13px] tabular-nums ${colors.textMuted}`}>{rows.length} no período</p>}
      </div>
      {rows === null && !error && <div className="px-4 pb-4"><Skeleton count={4} className="h-12 w-full" /></div>}
      {error && <p className={`px-4 pb-4 text-sm ${colors.textMuted}`}>Não foi possível carregar os lançamentos.</p>}
      {sliced && sliced.items.length === 0 && <p className={`px-4 pb-4 text-sm ${colors.textMuted}`}>Nenhum lançamento neste período.</p>}
      {sliced && sliced.items.length > 0 && (
        <>
          <ul className="md:hidden">
            {sliced.items.map((r) => (
              <li key={r.id} className={`px-4 py-3 border-t ${colors.divider} flex items-start justify-between gap-3`}>
                <div className="min-w-0">
                  <p className={`text-sm ${colors.text}`}>
                    <span className={`${font.mono} tabular-nums ${colors.textSecondary}`}>{dayLabel(r.at)}</span>
                    <span className={`mx-2 ${colors.textMuted}`}>·</span>
                    <span className="first-letter:uppercase">{kindLabel(r)}</span>
                  </p>
                  <p className={`mt-1 text-[13px] ${colors.textMuted} break-words`}>{r.clientName ?? '—'}</p>
                </div>
                <p className={`shrink-0 ${font.mono} tabular-nums text-sm ${colors.text}`}>{amount(r)}</p>
              </li>
            ))}
          </ul>
          <div className="hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className={`border-t ${colors.divider} text-[13px] ${colors.textMuted}`}>
                  <th className="text-left font-normal px-4 lg:px-5 py-2">Data</th>
                  <th className="text-left font-normal px-3 py-2">Tipo</th>
                  <th className="text-left font-normal px-3 py-2">Descrição</th>
                  <th className="text-left font-normal px-3 py-2">Cliente</th>
                  <th className="text-right font-normal px-4 lg:px-5 py-2">Valor</th>
                </tr>
              </thead>
              <tbody>
                {sliced.items.map((r) => (
                  <tr key={r.id} className={`border-t ${colors.divider}`}>
                    <td className={`px-4 lg:px-5 py-2.5 ${font.mono} tabular-nums ${colors.textSecondary} whitespace-nowrap`}>{dayLabel(r.at)}</td>
                    <td className={`px-3 py-2.5 ${colors.textMuted}`}>{r.kind === 'atendimento' ? (r.club ? 'Clube' : 'Serviço') : 'Produto'}</td>
                    <td className={`px-3 py-2.5 ${colors.text} break-words first-letter:uppercase`}>{r.title}</td>
                    <td className={`px-3 py-2.5 ${colors.textSecondary} break-words`}>{r.clientName ?? '—'}</td>
                    <td className={`px-4 lg:px-5 py-2.5 text-right ${font.mono} tabular-nums whitespace-nowrap ${colors.text}`}>{amount(r)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {sliced.pages > 1 && (
            <div className="px-4 lg:px-5 py-3 flex items-center justify-between gap-3">
              <Button variant="secondary" size="sm" className="min-h-[44px]" disabled={sliced.page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
              <span className={`text-xs tabular-nums ${colors.textMuted}`}>Página {sliced.page} de {sliced.pages}</span>
              <Button variant="secondary" size="sm" className="min-h-[44px]" disabled={sliced.page >= sliced.pages} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
            </div>
          )}
        </>
      )}
    </section>
  );
};
