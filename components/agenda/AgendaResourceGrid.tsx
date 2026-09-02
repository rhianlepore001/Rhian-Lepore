import React from 'react';
import { Check, AlertTriangle, Clock, Ban, X, Edit2, MessageCircle, Users } from 'lucide-react';
import { AgendaEmptySlotCell } from './AgendaEmptySlotCell';
import { getVisualStatus, VISUAL_STATUS_CLASSES, VISUAL_STATUS_LABEL, type VisualStatus } from '../../utils/appointmentStatus';
import { formatCurrency, type Region } from '../../utils/formatters';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';

const VISUAL_STATUS_ICON: Record<VisualStatus, React.ComponentType<{ className?: string }>> = {
  completed: Check,
  overdue: AlertTriangle,
  normal: Clock,
  noshow: Ban,
  cancelled: X,
};

export interface AgendaGridAppointment {
  id: string;
  clientName: string;
  service: string;
  appointment_time: string;
  price: number;
  status: string;
  professional_id: string | null;
  duration_minutes?: number;
  edited_at?: string | null;
  notes?: string;
}

export interface AgendaGridMember {
  id: string;
  name: string;
  photo_url?: string;
}

export interface AgendaResourceGridProps {
  members: AgendaGridMember[];
  appointments: AgendaGridAppointment[];
  timeSlots: string[];
  showUnassigned: boolean;
  currencyRegion: Region;
  selectedProfessionalIds: string[];
  selfMemberId?: string | null;
  onSelectAll: () => void;
  onToggleProfessional: (id: string) => void;
  onSelectAppointment: (apt: AgendaGridAppointment) => void;
  onEmptySlotClick: (professionalId: string, time: string) => void;
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

function initials(fullName: string): string {
  return fullName
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function appointmentTimeLabel(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

/**
 * Grade única horário × colaborador. O filtro vive no cabeçalho:
 * Todos no canto (onde era “Horário”) e um colaborador por coluna —
 * sem faixa de avatares duplicada.
 */
export const AgendaResourceGrid: React.FC<AgendaResourceGridProps> = ({
  members,
  appointments,
  timeSlots,
  showUnassigned,
  currencyRegion,
  selectedProfessionalIds,
  selfMemberId = null,
  onSelectAll,
  onToggleProfessional,
  onSelectAppointment,
  onEmptySlotClick,
}) => {
  const { colors, accent } = useBrutalTheme();

  const appointmentsByProfessional = new Map<string, AgendaGridAppointment[]>();
  for (const apt of appointments) {
    if (!apt.professional_id) continue;
    const list = appointmentsByProfessional.get(apt.professional_id) ?? [];
    list.push(apt);
    appointmentsByProfessional.set(apt.professional_id, list);
  }
  const unassignedAppointments = appointments.filter((a) => !a.professional_id);

  const unassignedCount = showUnassigned ? unassignedAppointments.length : 0;
  const assignedCount = members.reduce(
    (sum, m) => sum + (appointmentsByProfessional.get(m.id)?.length ?? 0),
    0,
  );
  const totalVisible = unassignedCount + assignedCount;
  const isAllSelected = selectedProfessionalIds.length === 0;
  const headerCell = `sticky top-0 z-10 h-[4.25rem] border-b ${colors.divider} ${colors.card}`;

  return (
    <div>
      <div
        data-testid="agenda-resource-grid"
        className={`rounded-2xl border ${colors.border} ${colors.surface} overflow-auto snap-x snap-mandatory touch-pan-x scrollbar-hide overscroll-contain max-h-[min(70dvh,calc(100dvh-12rem))]`}
      >
        <div className="inline-flex min-w-full">
          {/* Gutter de horário */}
          <div className={`sticky left-0 z-20 w-16 shrink-0 flex flex-col ${colors.card}`}>
            <div className={`${headerCell} z-30`}>
              <button
                type="button"
                onClick={onSelectAll}
                aria-pressed={isAllSelected}
                data-testid="agenda-filter-all"
                title="Todos os profissionais"
                className="w-full h-full flex flex-col items-center justify-center gap-0.5 px-1"
              >
                <span
                  className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                    isAllSelected
                      ? `${accent.bg} border-transparent text-[var(--color-on-accent)] shadow-[var(--shadow-card-accent)]`
                      : `${colors.border} ${colors.card} ${colors.textSecondary}`
                  }`}
                >
                  <Users className="w-4 h-4" />
                </span>
                <span
                  className={`text-xs font-bold uppercase tracking-wider ${
                    isAllSelected ? accent.text : colors.textMuted
                  }`}
                >
                  Todos
                </span>
              </button>
            </div>
            {timeSlots.map((time) => {
              const isHour = time.endsWith(':00');
              return (
                <div
                  key={time}
                  className={`h-12 md:h-14 flex items-start justify-center pt-1.5 border-b ${colors.divider} last:border-b-0`}
                >
                  {isHour && <span className={`text-xs font-bold ${colors.text}`}>{time}</span>}
                </div>
              );
            })}
          </div>

          {/* Colunas por colaborador */}
          {members.map((member, idx) => {
            const includeUnassigned = showUnassigned && idx === 0;
            const memberAppointments = appointmentsByProfessional.get(member.id) ?? [];
            const isMemberSelected = selectedProfessionalIds.includes(member.id);
            const isSelf = member.id === selfMemberId;

            return (
              <div
                key={member.id}
                data-testid={`agenda-col-${member.id}`}
                className={`snap-start shrink-0 min-w-[152px] md:min-w-[176px] flex-1 flex flex-col border-l ${colors.divider}`}
              >
                {/* Cabeçalho = filtro do colaborador (sem faixa duplicada) */}
                <div className={headerCell} title={member.name}>
                  <button
                    type="button"
                    onClick={() => onToggleProfessional(member.id)}
                    aria-pressed={isMemberSelected}
                    data-testid={`agenda-filter-${member.id}`}
                    title={member.name}
                    className="w-full h-full flex flex-col items-center justify-center gap-0.5 px-1.5"
                  >
                    {member.photo_url ? (
                      <img
                        src={member.photo_url}
                        alt=""
                        className={`w-9 h-9 rounded-full object-cover border-2 transition-all ${
                          isMemberSelected
                            ? `${accent.border} shadow-[var(--shadow-card-accent)]`
                            : colors.border
                        }`}
                      />
                    ) : (
                      <span
                        className={`w-9 h-9 rounded-full flex items-center justify-center border-2 text-xs font-bold transition-all ${
                          isMemberSelected
                            ? `${accent.bg} border-transparent text-[var(--color-on-accent)] shadow-[var(--shadow-card-accent)]`
                            : `${colors.card} ${colors.border} ${colors.text}`
                        }`}
                      >
                        {initials(member.name)}
                      </span>
                    )}
                    <span
                      className={`text-xs font-bold uppercase tracking-wider truncate max-w-full ${
                        isMemberSelected ? accent.text : colors.textMuted
                      }`}
                    >
                      {isSelf ? 'Você' : firstName(member.name)}
                    </span>
                  </button>
                </div>

                {/* Linhas */}
                {timeSlots.map((time) => {
                  const cellUnassigned = includeUnassigned
                    ? unassignedAppointments.filter((a) => appointmentTimeLabel(a.appointment_time) === time)
                    : [];
                  const cellAssigned = memberAppointments.filter(
                    (a) => appointmentTimeLabel(a.appointment_time) === time,
                  );
                  const cellApts = [...cellUnassigned, ...cellAssigned];

                  if (cellApts.length === 0) {
                    return (
                      <div key={time} className={`relative h-12 md:h-14 w-full border-b ${colors.divider} last:border-b-0`}>
                        <AgendaEmptySlotCell
                          time={time}
                          professionalName={member.name}
                          onClick={() => onEmptySlotClick(member.id, time)}
                        />
                      </div>
                    );
                  }

                  return (
                    <div
                      key={time}
                      className={`h-12 md:h-14 border-b ${colors.divider} last:border-b-0 p-1 flex flex-col gap-1 overflow-hidden`}
                    >
                      {cellApts.map((apt) => {
                        const isUnassigned = !apt.professional_id;
                        const visual = getVisualStatus(apt);
                        const vc = VISUAL_STATUS_CLASSES[visual];
                        const StatusIcon = VISUAL_STATUS_ICON[visual];
                        const cardTokens = isUnassigned
                          ? 'border-[var(--color-danger-border)] bg-[var(--color-danger-bg)]'
                          : vc.card;

                        return (
                          <button
                            key={apt.id}
                            type="button"
                            onClick={() => onSelectAppointment(apt)}
                            aria-label={`${apt.clientName} — ${apt.service} às ${time}`}
                            className={`w-full text-left rounded-lg border ${cardTokens} px-2 py-1 flex-1 min-h-0 flex flex-col justify-center gap-0.5 overflow-hidden transition-shadow shadow-lite-glass hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <h4 className={`text-xs font-bold truncate ${colors.text}`}>{apt.clientName}</h4>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {apt.edited_at && (
                                  <Edit2 className={`w-2.5 h-2.5 ${colors.textMuted}`} aria-label="Editado" />
                                )}
                                {apt.notes && (
                                  <MessageCircle
                                    className="w-2.5 h-2.5 text-[var(--color-success)]/80"
                                    aria-label="Com observação"
                                  />
                                )}
                                <StatusIcon className={`w-3 h-3 ${vc.text}`} aria-label={VISUAL_STATUS_LABEL[visual]} />
                              </div>
                            </div>
                            <div className="flex items-center justify-between gap-1">
                              <span className={`text-xs truncate ${isUnassigned ? 'text-[var(--color-danger)]' : colors.textMuted}`}>
                                {apt.service}
                              </span>
                              <span className={`text-xs font-mono font-medium flex-shrink-0 ${colors.text}`}>
                                {formatCurrency(apt.price, currencyRegion)}
                              </span>
                            </div>
                            {isUnassigned && (
                              <span className="text-xs text-[var(--color-danger)] truncate">Não atribuído</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {totalVisible === 0 && (
        <p className={`text-center text-xs ${colors.textMuted} mt-3`}>
          Nenhum agendamento neste dia. Toque num horário para criar.
        </p>
      )}
    </div>
  );
};
