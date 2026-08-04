import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { Modal } from '../../Modal';
import { BrutalButton } from '../../BrutalButton';
import { useBrutalTheme } from '../../../hooks/useBrutalTheme';
import type { Region } from '../../../utils/formatters';

export type GoalKind = 'daily' | 'monthly';

interface GoalSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentGoal: number;
  onSave: (newGoal: number) => Promise<unknown>;
  isBeauty?: boolean;
  goalKind?: GoalKind;
  currencyRegion?: Region;
}

export const GoalSettingsModal: React.FC<GoalSettingsModalProps> = ({
  isOpen,
  onClose,
  currentGoal,
  onSave,
  goalKind = 'monthly',
  currencyRegion = 'BR',
}) => {
  const [value, setValue] = useState(currentGoal.toString());
  const [isSaving, setIsSaving] = useState(false);
  const { colors } = useBrutalTheme();
  const currencySymbol = currencyRegion === 'PT' ? '€' : 'R$';
  const isDaily = goalKind === 'daily';

  useEffect(() => {
    if (isOpen) setValue(String(currentGoal ?? 0));
  }, [isOpen, currentGoal]);

  const handleSave = async () => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0) return;

    setIsSaving(true);
    try {
      await onSave(numValue);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isDaily ? 'Meta do dia' : 'Meta do mês'}
      size="md"
      footer={
        <div className="flex gap-3 w-full">
          <BrutalButton variant="ghost" onClick={onClose} className="flex-1">
            Cancelar
          </BrutalButton>
          <BrutalButton
            variant="primary"
            onClick={handleSave}
            className="flex-1"
            disabled={isSaving}
            icon={isSaving ? undefined : <Check className="w-4 h-4" />}
          >
            {isSaving ? 'Salvando...' : 'Salvar meta'}
          </BrutalButton>
        </div>
      }
    >
      <div className="space-y-6">
        <div>
          <label className={`mb-2 block text-xs font-mono uppercase tracking-wider ${colors.textMuted}`}>
            {isDaily ? 'Meta de faturamento diário' : 'Meta de faturamento mensal'}
          </label>
          <div className="relative">
            <span className={`absolute left-4 top-1/2 -translate-y-1/2 font-mono ${colors.textSecondary}`}>
              {currencySymbol}
            </span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className={`w-full rounded-xl border py-3 pl-12 pr-4 font-mono text-lg ${colors.card} ${colors.border} ${colors.text} focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]`}
              aria-label={isDaily ? 'Valor da meta diária' : 'Valor da meta mensal'}
            />
          </div>
          <p className={`mt-2 text-xs ${colors.textMuted}`}>
            {isDaily
              ? 'Aparece no Dashboard para acompanhar o dia.'
              : 'Aparece em Insights para acompanhar o mês.'}
          </p>
        </div>
      </div>
    </Modal>
  );
};
