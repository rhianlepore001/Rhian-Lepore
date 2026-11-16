import React, { useState } from 'react';
import { Button } from '../ui';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import { costPerService, totalServiceMaterialCost, type MaterialCostLine, type MaterialYieldMode } from '../../utils/serviceMaterialCost';

type DraftLine = {
  name: string;
  mode: MaterialYieldMode;
  packagePrice: string;
  yieldCount: string;
  packageQty: string;
  qtyPerService: string;
};

const emptyLine = (): DraftLine => ({ name: '', mode: 'count', packagePrice: '', yieldCount: '', packageQty: '', qtyPerService: '' });

const parseAmount = (value: string): number | null => {
  if (!value.trim()) return null;
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
};

const toLine = (draft: DraftLine): MaterialCostLine => ({
  name: draft.name,
  mode: draft.mode,
  packagePrice: parseAmount(draft.packagePrice),
  yieldCount: parseAmount(draft.yieldCount),
  packageQty: parseAmount(draft.packageQty),
  qtyPerService: parseAmount(draft.qtyPerService),
});

const money = (currency: string, value: number) => `${currency} ${value.toFixed(2).replace('.', ',')}`;

export function ServiceCostCalculator({
  serviceId,
  serviceName,
  currency,
  savedAmount,
  onSave,
  busy = false,
}: {
  serviceId: string;
  serviceName: string;
  currency: string;
  savedAmount?: number | null;
  onSave: (serviceId: string, amount: number) => void;
  busy?: boolean;
}) {
  const { classes } = useBrutalTheme();
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);
  const [error, setError] = useState('');
  const total = totalServiceMaterialCost(lines.map(toLine));
  const field = 'block space-y-1.5 text-sm font-semibold text-theme-text';
  const hint = 'text-sm text-theme-textSecondary';

  const update = (index: number, patch: Partial<DraftLine>) => {
    setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));
    setError('');
  };

  const save = () => {
    if (total == null) {
      setError('Informe preço e rendimento (ou quantidade) de pelo menos um material.');
      return;
    }
    onSave(serviceId, total);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-base font-bold text-theme-text">{serviceName}</h3>
      <p className={hint}>Você salva só o total deste serviço. Os itens servem para somar o total; eles não ficam guardados.</p>
      {savedAmount != null && (
        <div className="space-y-1">
          <p className="text-sm text-theme-text">
            Total salvo: <strong className="tabular-nums">{money(currency, savedAmount)}</strong>
          </p>
          <p className="text-sm text-[var(--color-warning)]">Salvar de novo substitui o total atual.</p>
        </div>
      )}
      {total != null && (
        <p className="text-lg font-bold tabular-nums text-theme-text">Total deste serviço: {money(currency, total)}</p>
      )}
      {lines.map((line, index) => {
        const unit = costPerService(toLine(line));
        return (
          <fieldset key={index} className="space-y-3 rounded-xl border border-[var(--color-border)] p-3">
            <legend className="sr-only">Material {index + 1} de {serviceName}</legend>
            <label className={field}>
              <span>Nome</span>
              <input aria-label="Nome" className={classes.input} value={line.name} onChange={(e) => update(index, { name: e.target.value })} placeholder="Ex.: caixa de giletes" />
            </label>
            <label className={field}>
              <span>Como você mede</span>
              <select aria-label="Modo" className={classes.input} value={line.mode} onChange={(e) => update(index, { mode: e.target.value as MaterialYieldMode })}>
                <option value="count">Por rendimento (caixa)</option>
                <option value="quantity">Por quantidade (ml, g)</option>
              </select>
            </label>
            <label className={field}>
              <span>Preço da embalagem ({currency})</span>
              <span className="relative block">
                <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-theme-textSecondary">{currency}</span>
                <input aria-label="Preço da embalagem" className={`${classes.input} pl-11 tabular-nums`} inputMode="decimal" min="0" step="0.01" type="number" value={line.packagePrice} onChange={(e) => update(index, { packagePrice: e.target.value })} placeholder="ex.: 20,00" />
              </span>
            </label>
            {line.mode === 'count' ? (
              <>
                <p className={hint}>Fórmula: preço da embalagem ÷ quantos atendimentos rende.</p>
                <label className={field}>
                  <span>Rendimento (atendimentos por embalagem)</span>
                  <input aria-label="Rendimento" className={`${classes.input} tabular-nums`} inputMode="decimal" min="0" step="1" type="number" value={line.yieldCount} onChange={(e) => update(index, { yieldCount: e.target.value })} placeholder="Ex.: 40" />
                </label>
              </>
            ) : (
              <>
                <p className={hint}>Fórmula: preço × (quantidade usada ÷ quantidade da embalagem).</p>
                <label className={field}>
                  <span>Qtd. da embalagem (ml ou g)</span>
                  <input aria-label="Qtd. da embalagem" className={`${classes.input} tabular-nums`} inputMode="decimal" min="0" step="0.01" type="number" value={line.packageQty} onChange={(e) => update(index, { packageQty: e.target.value })} placeholder="" />
                </label>
                <label className={field}>
                  <span>Qtd. por atendimento (ml ou g)</span>
                  <input aria-label="Qtd. por atendimento" className={`${classes.input} tabular-nums`} inputMode="decimal" min="0" step="0.01" type="number" value={line.qtyPerService} onChange={(e) => update(index, { qtyPerService: e.target.value })} placeholder="" />
                </label>
              </>
            )}
            {unit != null && (
              <p className="text-sm tabular-nums text-theme-text">{money(currency, unit)} por atendimento</p>
            )}
          </fieldset>
        );
      })}
      <Button variant="secondary" disabled={busy} onClick={() => setLines((current) => [...current, emptyLine()])}>Adicionar material</Button>
      {error && <p role="alert" className="text-sm text-[var(--color-danger)]">{error}</p>}
      {total == null && <p className={hint}>Preencha o preço e o rendimento para calcular.</p>}
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy || total == null} onClick={save}>Salvar total do serviço</Button>
        <Button variant="ghost" disabled={busy} onClick={() => onSave(serviceId, 0)}>Este serviço não usa material</Button>
      </div>
    </div>
  );
}
