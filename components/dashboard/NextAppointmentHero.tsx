import React from 'react';
import { CalendarClock, ChevronRight, User } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import type { DashboardAppointment } from '../../types/dashboard';

export interface NextAppointmentHeroProps {
  next: DashboardAppointment | null;
  upcoming: DashboardAppointment[];
  loading?: boolean;
  showPrice?: boolean;
  priceLabel?: string;
  onPrimaryAction: () => void;
  onOpenAgenda: () => void;
  emptyCtaLabel?: string;
}

export const NextAppointmentHero: React.FC<NextAppointmentHeroProps> = ({
  next,
  upcoming,
  loading = false,
  showPrice = false,
  priceLabel,
  onPrimaryAction,
  onOpenAgenda,
  emptyCtaLabel = 'Agendar',
}) => {
  const { accent, colors, status } = useBrutalTheme();

  if (loading) {
    return (
      <Card variant="elevated" className="min-h-[180px] animate-pulse" aria-busy="true">
        <div className={`h-4 w-32 rounded ${colors.surface}`} />
        <div className={`mt-4 h-8 w-48 rounded ${colors.surface}`} />
        <div className={`mt-3 h-4 w-40 rounded ${colors.surface}`} />
      </Card>
    );
  }

  if (!next) {
    return (
      <Card variant="elevated" className={`${accent.borderDim} border`}>
        <p className={`text-xs font-mono uppercase tracking-widest ${colors.textMuted}`}>
          Próximo atendimento
        </p>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`rounded-2xl p-3 ${accent.bgDim} ${accent.text} shrink-0`}>
              <CalendarClock className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 className={`font-heading text-lg font-bold ${colors.text}`}>
                Nenhum atendimento na fila
              </h2>
              <p className={`mt-1 text-sm ${colors.textSecondary} text-pretty`}>
                Sua agenda de hoje está livre. Que tal preencher um horário?
              </p>
            </div>
          </div>
          <Button variant="primary" onClick={onOpenAgenda} icon={<CalendarClock className="h-4 w-4" />}>
            {emptyCtaLabel}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card variant="elevated" className={`${accent.borderDim} border`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={`text-xs font-mono uppercase tracking-widest ${accent.text}`}>
          Próximo atendimento
        </p>
        <span className={`font-mono text-sm font-bold tabular-nums ${colors.text}`}>
          {next.time}
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${accent.bgDim} ${accent.text}`}
            aria-hidden="true"
          >
            <User className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className={`font-heading text-xl font-bold tracking-tight ${colors.text} truncate`}>
              {next.clientName}
            </h2>
            <p className={`mt-0.5 text-sm ${colors.textSecondary} truncate`}>
              {next.service}
              {showPrice && priceLabel ? ` · ${priceLabel}` : ''}
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          size="lg"
          className="w-full shrink-0 lg:w-auto"
          onClick={onPrimaryAction}
          iconRight={<ChevronRight className="h-4 w-4" />}
        >
          Abrir na Agenda
        </Button>
      </div>

      {upcoming.length > 0 && (
        <div className={`mt-5 border-t pt-4 ${colors.divider}`}>
          <p className={`mb-2 text-xs font-mono uppercase tracking-widest ${colors.textMuted}`}>
            Depois
          </p>
          <ul className="flex flex-wrap gap-2">
            {upcoming.map((apt) => (
              <li
                key={apt.id}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs ${colors.surface} ${colors.textSecondary}`}
              >
                <span className={`font-mono font-bold tabular-nums ${colors.text}`}>{apt.time}</span>
                <span className="truncate max-w-[140px]">{apt.clientName}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!upcoming.length && (
        <p className={`mt-4 text-xs ${status.success}`}>Próximo e último da fila por enquanto.</p>
      )}
    </Card>
  );
};
