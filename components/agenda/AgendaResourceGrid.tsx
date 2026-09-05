import React, { useEffect, useRef, useState } from 'react';
import { Check, AlertTriangle, Clock, Ban, X, Edit2, MessageCircle, Users, Plus } from 'lucide-react';
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
  /** Colunas visíveis (já filtradas pelo pai). */
  members: AgendaGridMember[];
  /** Equipe completa — para o picker “Adicionar”. */
  allMembers: AgendaGridMember[];
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

const SLOT_INTERVAL_MINUTES = 30;

function slotSpan(durationMinutes?: number): number {
  const mins = durationMinutes && durationMinutes > 0 ? durationMinutes : SLOT_INTERVAL_MINUTES;
  return Math.max(1, Math.ceil(mins / SLOT_INTERVAL_MINUTES));
}

function slotRange(
  apt: AgendaGridAppointment,
  timeSlots: string[],
): { startIdx: number; span: number } | null {
  const startIdx = timeSlots.indexOf(appointmentTimeLabel(apt.appointment_time));
  if (startIdx < 0) return null;
  return { startIdx, span: Math.min(slotSpan(apt.duration_minutes), timeSlots.length - startIdx) };
}

/**
 * Grade única horário × colaborador. Altura natural (todas as horas);
 * scroll vertical é da página. Scroll horizontal nativo (sem snap JS —
 * o alinhamento no `scroll`/`scrollend` puxava de volta no gesto lento).
 * Filtro real: só as colunas selecionadas; “Adicionar” ao lado para multi-select.
 */
export const AgendaResourceGrid: React.FC<AgendaResourceGridProps> = ({
  members,
  allMembers,
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
  const [addOpen, setAddOpen] = useState(false);
  const addWrapRef = useRef<HTMLDivElement>(null);

  const appointmentsByProfessional = new Map<string, AgendaGridAppointment[]>();
  for (const apt of appointments) {
    if (!apt.professional_id) continue;
    const list = appointmentsByProfessional.get(apt.professional_id) ?? [];
    list.push(apt);
    appointmentsByProfessional.set(apt.professional_id, list);
  }
  const unassignedAppointments = appointments.filter((a) => !a.professional_id);
  const isAllSelected = selectedProfessionalIds.length === 0;
  const isFiltered = selectedProfessionalIds.length > 0;
  const addableMembers = allMembers.filter((m) => !selectedProfessionalIds.includes(m.id));
  const showAddColumn = isFiltered && addableMembers.length > 0;
  const headerCell = `h-[4.25rem] border-b ${colors.divider} ${colors.card}`;

  useEffect(() => {
    if (!addOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (addWrapRef.current && !addWrapRef.current.contains(e.target as Node)) {
        setAddOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [addOpen]);

  useEffect(() => {
    if (!showAddColumn) setAddOpen(false);
  }, [showAddColumn]);

  return (
    <div className={`rounded-2xl border overflow-hidden min-w-0 w-full ${colors.border} ${colors.surface}`}>
      <div
        data-testid="agenda-resource-grid"
        className={`overflow-x-auto max-w-full scrollbar-hide ${colors.surface}`}
      >
        <div className="inline-flex min-w-full [--agenda-slot-h:3rem] md:[--agenda-slot-h:3.5rem]">
          {/* Gutter de horário */}
          <div
            data-agenda-gutter="true"
            className={`sticky left-0 z-20 w-12 shrink-0 flex flex-col ${colors.card}`}
          >
            <div className={`${headerCell} z-30`}>
              <button
                type="button"
                onClick={onSelectAll}
                aria-pressed={isAllSelected}
                data-testid="agenda-filter-all"
                title="Todos os profissionais"
                className="w-full h-full flex flex-col items-center justify-center gap-0.5 px-0.5"
              >
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all ${
                    isAllSelected
                      ? `${accent.bg} border-transparent text-[var(--color-on-accent)] shadow-[var(--shadow-card-accent)]`
                      : `${colors.border} ${colors.card} ${colors.textSecondary}`
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                </span>
                <span
                  className={`text-xs font-bold uppercase leading-none ${
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
                  {isHour && (
                    <span className={`text-xs font-bold tabular-nums leading-none ${colors.text}`}>{time}</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Colunas por colaborador (já filtradas) */}
          {members.map((member, idx) => {
            const includeUnassigned = showUnassigned && idx === 0;
            const memberAppointments = appointmentsByProfessional.get(member.id) ?? [];
            const isMemberSelected = selectedProfessionalIds.includes(member.id);
            const isSelf = member.id === selfMemberId;
            const columnOverlays = [
              ...(includeUnassigned ? unassignedAppointments : []),
              ...memberAppointments,
            ]
              .map((apt) => {
                const range = slotRange(apt, timeSlots);
                return range ? { apt, ...range } : null;
              })
              .filter((o): o is { apt: AgendaGridAppointment; startIdx: number; span: number } => o !== null);

            return (
              <div
                key={member.id}
                data-testid={`agenda-col-${member.id}`}
                className={`shrink-0 min-w-[152px] md:min-w-[176px] flex-1 flex flex-col overflow-hidden border-l ${colors.divider}`}
              >
                <div className={headerCell} title={member.name}>
                  <button
                    type="button"
                    onClick={() => onToggleProfessional(member.id)}
                    aria-pressed={isMemberSelected}
                    data-testid={`agenda-filter-${member.id}`}
                    title={member.name}
                    className="w-full h-full flex flex-col items-center justify-center gap-0.5 px-2.5"
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
                      className={`text-xs font-bold uppercase tracking-wider truncate max-w-full px-0.5 ${
                        isMemberSelected ? accent.text : colors.textMuted
                      }`}
                    >
                      {isSelf ? 'Você' : firstName(member.name)}
                    </span>
                  </button>
                </div>

                <div className="relative overflow-hidden">
                  {timeSlots.map((time, slotIdx) => {
                    const occupied = columnOverlays.some(
                      (o) => slotIdx >= o.startIdx && slotIdx < o.startIdx + o.span,
                    );
                    return (
                      <div
                        key={time}
                        data-agenda-slot={time}
                        className={`relative h-12 md:h-14 w-full border-b ${colors.divider} last:border-b-0`}
                      >
                        {!occupied && (
                          <AgendaEmptySlotCell
                            time={time}
                            professionalName={member.name}
                            onClick={() => onEmptySlotClick(member.id, time)}
                          />
                        )}
                      </div>
                    );
                  })}

                  {columnOverlays.map(({ apt, startIdx, span }) => {
                    const time = timeSlots[startIdx];
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
                        data-agenda-span={span}
                        style={{
                          top: `calc(var(--agenda-slot-h) * ${startIdx} + 2px)`,
                          height: `calc(var(--agenda-slot-h) * ${span} - 4px)`,
                        }}
                        className={`agenda-event-chip absolute left-0.5 right-0.5 z-[1] overflow-hidden text-left rounded-md border ${cardTokens} px-1.5 py-1 min-h-0 flex flex-col justify-center gap-0.5 transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-theme-accent`}
                      >
                        <div className="flex items-start justify-between gap-1 min-w-0">
                          <h4 className={`text-xs font-bold truncate leading-tight ${colors.text}`}>{apt.clientName}</h4>
                          <div className="flex items-center gap-0.5 flex-shrink-0">
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
                        <div className="flex items-center justify-between gap-1 min-w-0">
                          <span className={`text-xs truncate leading-tight ${isUnassigned ? 'text-[var(--color-danger)]' : colors.textMuted}`}>
                            {apt.service}
                          </span>
                          <span className={`text-xs font-mono font-medium flex-shrink-0 leading-tight ${colors.text}`}>
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
              </div>
            );
          })}

          {/* Ação: adicionar mais colaboradores ao filtro */}
          {showAddColumn && (
            <div
              ref={addWrapRef}
              data-testid="agenda-col-add"
              className={`shrink-0 w-[4.5rem] flex flex-col border-l ${colors.divider} relative`}
            >
              <div className={headerCell}>
                <button
                  type="button"
                  data-testid="agenda-filter-add"
                  aria-expanded={addOpen}
                  aria-haspopup="listbox"
                  title="Adicionar colaborador"
                  onClick={() => setAddOpen((o) => !o)}
                  className="w-full h-full flex flex-col items-center justify-center gap-0.5 px-1"
                >
                  <span
                    className={`w-9 h-9 rounded-full flex items-center justify-center border-2 border-dashed ${colors.border} ${colors.textSecondary}`}
                  >
                    <Plus className="w-4 h-4" />
                  </span>
                  <span className={`text-xs font-bold uppercase tracking-wider ${colors.textMuted}`}>Mais</span>
                </button>
              </div>
              {timeSlots.map((time) => (
                <div
                  key={time}
                  className={`h-12 md:h-14 border-b ${colors.divider} last:border-b-0 ${colors.surface}`}
                  aria-hidden
                />
              ))}
              {addOpen && (
                <ul
                  role="listbox"
                  data-testid="agenda-add-menu"
                  className={`absolute left-0 top-[4.25rem] z-40 min-w-[11rem] max-h-64 overflow-auto rounded-xl border ${colors.border} ${colors.card} shadow-[var(--shadow-modal)] py-1`}
                >
                  {addableMembers.map((m) => (
                    <li key={m.id} role="option">
                      <button
                        type="button"
                        data-testid={`agenda-add-${m.id}`}
                        className={`w-full text-left px-3 py-2.5 min-h-[44px] text-sm font-medium ${colors.text} hover:brightness-110`}
                        onClick={() => {
                          onToggleProfessional(m.id);
                          setAddOpen(false);
                        }}
                      >
                        {m.id === selfMemberId ? 'Você' : firstName(m.name)}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
