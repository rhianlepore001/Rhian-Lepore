import React from 'react';
import { Ban, Plus } from 'lucide-react';
import { Button } from '../ui/Button';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import { formatBlockRangeLabel } from '../../utils/agendaBlockRange';
import type { AgendaBlock } from '../../types/agendaBlocks';

export interface TeamMemberBlocksSectionProps {
  memberName: string;
  blocks: AgendaBlock[];
  timeZone: string;
  onCreate: () => void;
  onUnlock: (block: AgendaBlock) => void;
}

export const TeamMemberBlocksSection: React.FC<TeamMemberBlocksSectionProps> = ({
  memberName,
  blocks,
  timeZone,
  onCreate,
  onUnlock,
}) => {
  const { colors } = useBrutalTheme();
  const upcoming = blocks.slice(0, 8);

  return (
    <div className={`mt-4 pt-4 border-t ${colors.border}`} data-testid="team-member-blocks">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className={`text-xs font-mono uppercase tracking-wider ${colors.textMuted} flex items-center gap-1.5`}>
          <Ban className="w-3.5 h-3.5" aria-hidden />
          Bloqueios
        </p>
        <Button
          size="sm"
          variant="secondary"
          icon={<Plus className="w-3.5 h-3.5" />}
          onClick={onCreate}
          data-testid="team-member-block-create"
          aria-label={`Bloquear agenda de ${memberName}`}
        >
          Criar
        </Button>
      </div>
      {upcoming.length === 0 ? (
        <p className={`text-xs ${colors.textMuted}`}>Nenhum bloqueio à frente.</p>
      ) : (
        <ul className="space-y-1.5">
          {upcoming.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-2">
              <span className={`text-xs ${colors.text}`}>{formatBlockRangeLabel(b.starts_at, b.ends_at, timeZone)}</span>
              <button
                type="button"
                className={`text-xs font-semibold min-h-[44px] px-2 ${colors.textMuted}`}
                onClick={() => onUnlock(b)}
              >
                Desbloquear
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
