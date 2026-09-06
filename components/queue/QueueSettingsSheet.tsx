import React, { useEffect, useState } from 'react';
import { Button, Modal, Select, useToast } from '@/components/ui';
import { setQueueMode, updateQueueSettings } from '@/services/queue';
import { isQueueModeLocked } from '@/utils/queueQr';
import type { QueueMode, QueueSettings } from '@/types/queue';

interface QueueSettingsSheetProps {
  open: boolean;
  settings: QueueSettings | null;
  activeCount: number;
  onClose: () => void;
  onSaved: () => void;
}

export const QueueSettingsSheet: React.FC<QueueSettingsSheetProps> = ({
  open,
  settings,
  activeCount,
  onClose,
  onSaved,
}) => {
  const { showToast } = useToast();
  const [mode, setMode] = useState<QueueMode>('shared');
  const [allowLeave, setAllowLeave] = useState(true);
  const [lateMinutes, setLateMinutes] = useState(10);
  const [saving, setSaving] = useState(false);
  const locked = isQueueModeLocked(activeCount);

  useEffect(() => {
    if (!settings) return;
    setMode(settings.queueMode);
    setAllowLeave(settings.allowLeave);
    setLateMinutes(settings.lateMinutes);
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (settings && mode !== settings.queueMode) {
        await setQueueMode(mode);
      }
      await updateQueueSettings(allowLeave, lateMinutes);
      onSaved();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível salvar os ajustes.';
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Ajustes da fila" size="sm">
      <div className="space-y-4">
        <Select
          label="Modo da fila"
          value={mode}
          disabled={locked}
          hint={locked ? 'Esvazie a fila para trocar o modo.' : undefined}
          options={[
            { value: 'shared', label: 'QR geral da casa' },
            { value: 'per_professional', label: 'QR por profissional' },
          ]}
          onChange={(event) => setMode(event.target.value as QueueMode)}
        />
        <label className="flex items-center gap-3 min-h-[44px] text-sm text-theme-text">
          <input
            type="checkbox"
            checked={allowLeave}
            onChange={(event) => setAllowLeave(event.target.checked)}
          />
          Cliente pode sair e voltar no prazo
        </label>
        <label className="block text-sm text-theme-text">
          Minutos de atraso
          <input
            type="number"
            min={1}
            max={120}
            value={lateMinutes}
            onChange={(event) => setLateMinutes(Number(event.target.value))}
            className="mt-1 w-full min-h-[44px] px-4 rounded-xl border border-theme-border bg-theme-surface"
          />
        </label>
        <Button variant="primary" fullWidth loading={saving} onClick={() => void handleSave()}>
          Salvar ajustes
        </Button>
      </div>
    </Modal>
  );
};
