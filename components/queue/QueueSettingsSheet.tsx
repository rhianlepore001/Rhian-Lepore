import React, { useEffect, useState } from 'react';
import { Button, Checkbox, Input, Modal, Select, useToast } from '@/components/ui';
import { setQueueMode, updateQueueSettings } from '@/services/queue';
import { isQueueModeLocked } from '@/utils/queueQr';
import {
  QUEUE_LATE_MINUTES_MAX,
  QUEUE_LATE_MINUTES_MIN,
  clampQueueLateMinutes,
  lateMinutesDraftFromSettings,
  parseQueueLateMinutesInput,
} from '@/utils/queueLateMinutes';
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
  const [lateDraft, setLateDraft] = useState('10');
  const [lateError, setLateError] = useState('');
  const [saving, setSaving] = useState(false);
  const locked = isQueueModeLocked(activeCount);

  useEffect(() => {
    if (!settings) return;
    setMode(settings.queueMode);
    setAllowLeave(settings.allowLeave);
    setLateDraft(lateMinutesDraftFromSettings(settings.lateMinutes));
    setLateError('');
  }, [settings, open]);

  const handleLateChange = (raw: string) => {
    if (raw === '') {
      setLateDraft('');
      setLateError('');
      return;
    }
    if (!/^\d{0,3}$/.test(raw)) return;
    setLateDraft(raw);
    setLateError('');
  };

  const handleSave = async () => {
    const parsed = allowLeave
      ? parseQueueLateMinutesInput(lateDraft)
      : parseQueueLateMinutesInput(lateDraft) ?? settings?.lateMinutes ?? 10;
    if (parsed == null || parsed < QUEUE_LATE_MINUTES_MIN || parsed > QUEUE_LATE_MINUTES_MAX) {
      setLateError(`Informe entre ${QUEUE_LATE_MINUTES_MIN} e ${QUEUE_LATE_MINUTES_MAX} minutos.`);
      return;
    }
    const lateMinutes = clampQueueLateMinutes(parsed);
    setSaving(true);
    try {
      if (settings && mode !== settings.queueMode) {
        await setQueueMode(mode);
      }
      await updateQueueSettings(allowLeave, lateMinutes);
      showToast('Ajustes da fila salvos.', 'success');
      onSaved();
    } catch (error) {
      const text = error instanceof Error ? error.message.toLowerCase() : '';
      const message = text.includes('esvazie a fila')
        ? 'Só é possível trocar o tipo de fila com a fila vazia.'
        : 'Não foi possível salvar os ajustes. Tente de novo.';
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Ajustes da fila" size="sm">
      <div className="space-y-5">
        <Select
          label="Tipo de fila"
          value={mode}
          disabled={locked}
          hint={locked
            ? 'Só é possível trocar o tipo de fila quando não houver clientes aguardando ou em atendimento.'
            : mode === 'shared'
              ? 'Um único QR Code. Qualquer profissional atende o próximo da fila.'
              : 'Um QR Code por profissional. Cada um atende a própria fila.'}
          options={[
            { value: 'shared', label: 'Fila única (QR Code geral)' },
            { value: 'per_professional', label: 'Fila por profissional' },
          ]}
          onChange={(event) => setMode(event.target.value as QueueMode)}
        />
        <Checkbox
          checked={allowLeave}
          onChange={(event) => setAllowLeave(event.target.checked)}
          label="Permitir que o cliente saia e volte quando for chamado"
          className="min-h-[44px] flex items-center"
        />
        <Input
          label="Tolerância após a chamada (minutos)"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          value={lateDraft}
          onChange={(event) => handleLateChange(event.target.value)}
          error={lateError}
          disabled={!allowLeave}
          hint={allowLeave
            ? 'Tempo que o cliente tem para chegar depois de ser chamado. Aparece na tela dele.'
            : 'Com a saída desativada, o cliente é orientado a aguardar no local.'}
        />
        <Button variant="primary" fullWidth loading={saving} onClick={() => void handleSave()}>
          Salvar ajustes
        </Button>
      </div>
    </Modal>
  );
};
