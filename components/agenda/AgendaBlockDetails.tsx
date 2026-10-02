import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import { formatBlockRangeLabel } from '../../utils/agendaBlockRange';
import type { AgendaBlock } from '../../types/agendaBlocks';

export interface AgendaBlockDetailsProps {
  open: boolean;
  block: AgendaBlock | null;
  professionalName?: string;
  timeZone: string;
  canUnlock: boolean;
  unlocking?: boolean;
  onClose: () => void;
  onUnlock: () => void;
}

export const AgendaBlockDetails: React.FC<AgendaBlockDetailsProps> = ({
  open,
  block,
  professionalName,
  timeZone,
  canUnlock,
  unlocking = false,
  onClose,
  onUnlock,
}) => {
  const { colors } = useBrutalTheme();
  const range = block ? formatBlockRangeLabel(block.starts_at, block.ends_at, timeZone) : '';

  return (
    <Modal
      open={open && !!block}
      onClose={onClose}
      title={canUnlock ? 'Bloqueado' : 'Agenda bloqueada'}
      size="sm"
      footer={
        canUnlock ? (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end w-full">
            <Button variant="ghost" onClick={onClose} disabled={unlocking}>Fechar</Button>
            <Button
              variant="danger"
              data-testid="agenda-block-unlock"
              onClick={onUnlock}
              loading={unlocking}
            >
              Desbloquear
            </Button>
          </div>
        ) : (
          <Button variant="ghost" onClick={onClose} fullWidth>Fechar</Button>
        )
      }
    >
      {block && (
        <div className="space-y-2" data-testid="agenda-block-details">
          {professionalName && (
            <p className={`text-sm ${colors.text}`}>{professionalName}</p>
          )}
          <p className={`text-sm ${colors.textSecondary}`}>{range}</p>
          {!canUnlock && (
            <p className={`text-xs ${colors.textMuted}`}>
              Só o dono pode desbloquear neste momento.
            </p>
          )}
        </div>
      )}
    </Modal>
  );
};
