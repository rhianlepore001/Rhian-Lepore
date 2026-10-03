import React, { useMemo, useState } from 'react';
import { ArrowRight, CalendarClock } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useToast } from '../ui';
import { useAuth } from '../../contexts/AuthContext';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import { useAgendaBlocks } from '../../hooks/useAgendaBlocks';
import { ScheduleSelection } from '../appointment/ScheduleSelection';
import { supabase } from '../../lib/supabase';
import { formatLocalDateString } from '../../utils/date';
import {
  dateStringToLocalDate,
  formatTimeInTimeZone,
  getDateStringInTimeZone,
  isZonedSlotInPast,
  zonedDateTimeToDate,
} from '../../utils/businessTimezone';
import { buildWhatsAppLink, type Region } from '../../utils/formatters';
import { mapError } from '../../utils/mapError';
import { isStaffEditForbiddenError, STAFF_EDIT_FORBIDDEN_MESSAGE } from '../../utils/staffAppointmentPermission';
import {
  buildRescheduleWhatsAppMessage,
  formatRescheduleCurrentLine,
  formatRescheduleInstant,
  RESCHEDULE_CONFIRM_LABEL,
  RESCHEDULE_GENERIC_ERROR,
  RESCHEDULE_MODAL_TITLE,
  RESCHEDULE_PAST_NOTE,
  RESCHEDULE_SUCCESS_TOAST,
  RESCHEDULE_WHATSAPP_LABEL,
} from '../../utils/rescheduleCopy';
import type { BusinessHours } from '../../types/settings';

export interface RescheduleAppointment {
  id: string;
  clientName: string;
  clientPhone?: string | null;
  professional_id: string | null;
  appointment_time: string;
  duration_minutes?: number;
  status: string;
  service?: string;
}

export interface RescheduleTeamMember {
  id: string;
  name: string;
  photo_url?: string | null;
}

export interface RescheduleAppointmentModalProps {
  open: boolean;
  appointment: RescheduleAppointment;
  teamMembers: RescheduleTeamMember[];
  shopTimeZone: string;
  businessHours?: BusinessHours | null;
  lockProfessional?: boolean;
  onClose: () => void;
  onSuccess: (result: { id: string; time: Date; professionalId: string | null }) => void;
  /** Só testes: relógio injetável para o aviso de passado. */
  now?: Date;
}

const activeCardBg = 'bg-theme-accent text-[var(--color-on-accent)] border-theme-accent';
const cardBg = 'bg-theme-card border-[var(--color-divider)]';

export const RescheduleAppointmentModal: React.FC<RescheduleAppointmentModalProps> = ({
  open,
  appointment,
  teamMembers,
  shopTimeZone,
  businessHours = null,
  lockProfessional = false,
  onClose,
  onSuccess,
  now,
}) => {
  const { user, region, businessName } = useAuth();
  const { colors, isBeauty } = useBrutalTheme();
  const { showToast } = useToast();
  const initialDateStr = getDateStringInTimeZone(appointment.appointment_time, shopTimeZone);
  const initialTime = formatTimeInTimeZone(appointment.appointment_time, shopTimeZone);
  const [selectedDate, setSelectedDate] = useState(() => dateStringToLocalDate(initialDateStr));
  const [selectedTime, setSelectedTime] = useState(initialTime);
  const [selectedProId, setSelectedProId] = useState(appointment.professional_id || '');
  const [notifyWhatsApp, setNotifyWhatsApp] = useState(() => !!appointment.clientPhone?.trim());
  const [submitting, setSubmitting] = useState(false);

  const dateStr = formatLocalDateString(selectedDate);
  const { data: blocks = [] } = useAgendaBlocks(open ? dateStr : null);
  const professionalName = teamMembers.find((m) => m.id === (appointment.professional_id || ''))?.name;
  const destName = teamMembers.find((m) => m.id === selectedProId)?.name;
  const hasPhone = !!appointment.clientPhone?.trim();

  const unchanged = useMemo(() => (
    selectedProId === (appointment.professional_id || '')
    && selectedTime === initialTime
    && dateStr === initialDateStr
  ), [selectedProId, appointment.professional_id, selectedTime, initialTime, dateStr, initialDateStr]);

  const selectedInstant = selectedTime
    ? zonedDateTimeToDate(dateStr, selectedTime, shopTimeZone)
    : null;
  const isPast = !!selectedTime && isZonedSlotInPast(dateStr, selectedTime, shopTimeZone, now ?? new Date());

  const handleConfirm = async () => {
    if (unchanged || !selectedInstant || !selectedProId || submitting) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc('reschedule_appointment', {
        p_appointment_id: appointment.id,
        p_new_time: selectedInstant.toISOString(),
        p_new_professional_id: selectedProId,
      });
      if (error) throw error;

      showToast(RESCHEDULE_SUCCESS_TOAST, 'success');
      if (notifyWhatsApp && hasPhone) {
        const message = buildRescheduleWhatsAppMessage({
          theme: isBeauty ? 'beauty' : 'barber',
          clientName: appointment.clientName,
          businessName,
          oldTimeIso: appointment.appointment_time,
          newTimeIso: selectedInstant.toISOString(),
          timeZone: shopTimeZone,
          professionalName: destName,
        });
        window.open(buildWhatsAppLink(appointment.clientPhone || '', (region === 'PT' ? 'PT' : 'BR') as Region, message), '_blank');
      }
      onSuccess({ id: appointment.id, time: selectedInstant, professionalId: selectedProId });
      onClose();
    } catch (err) {
      showToast(
        isStaffEditForbiddenError(err)
          ? STAFF_EDIT_FORBIDDEN_MESSAGE
          : mapError(err, RESCHEDULE_GENERIC_ERROR).message,
        'error',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={RESCHEDULE_MODAL_TITLE}
      size="2xl"
      labelledById="reschedule-title"
      preventClose={submitting}
      footer={(
        <div className="flex flex-col gap-3 w-full">
          {selectedInstant && !unchanged && (
            <p data-testid="reschedule-summary" className={`text-sm ${colors.text} leading-snug space-y-0.5`}>
              <span className="block">
                <span className={colors.textMuted}>De </span>
                {formatRescheduleInstant(appointment.appointment_time, shopTimeZone, professionalName)}
              </span>
              <span className="block">
                <ArrowRight className="inline w-3.5 h-3.5 mr-1 text-theme-accent align-[-2px]" aria-hidden="true" />
                <span className={colors.textMuted}>Para </span>
                {formatRescheduleInstant(selectedInstant.toISOString(), shopTimeZone, destName)}
              </span>
            </p>
          )}
          {hasPhone && (
            <label className="flex items-start gap-2.5 text-sm cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5 w-4 h-4 rounded border-[var(--color-input-border)] accent-[var(--color-accent)]"
                checked={notifyWhatsApp}
                onChange={(e) => setNotifyWhatsApp(e.target.checked)}
              />
              <span>{RESCHEDULE_WHATSAPP_LABEL}</span>
            </label>
          )}
          <Button
            variant="primary"
            className="w-full"
            onClick={() => { void handleConfirm(); }}
            disabled={unchanged || !selectedTime || !selectedProId || submitting}
            loading={submitting}
            data-testid="reschedule-confirm"
          >
            {RESCHEDULE_CONFIRM_LABEL}
          </Button>
        </div>
      )}
    >
      <div data-testid="reschedule-modal-body" className="space-y-5">
        <div
          data-testid="reschedule-current"
          className="flex items-start gap-3 rounded-xl border border-theme-accent/40 bg-[var(--color-accent-dim)] px-4 py-3"
        >
          <CalendarClock className="w-5 h-5 mt-0.5 shrink-0 text-theme-accent" aria-hidden="true" />
          <p className={`text-sm font-medium leading-snug ${colors.text}`}>
            {formatRescheduleCurrentLine({
              timeIso: appointment.appointment_time,
              timeZone: shopTimeZone,
              professionalName,
            })}
          </p>
        </div>

        {isPast && (
          <p
            data-testid="reschedule-past-note"
            className="text-sm rounded-lg border border-[var(--color-warning-border,var(--color-accent-border))] bg-[var(--color-warning-bg,var(--color-surface))] px-3 py-2 text-theme-text"
          >
            {RESCHEDULE_PAST_NOTE}
          </p>
        )}

        {lockProfessional && (
          <p data-testid="reschedule-lock-pro-note" className={`text-xs ${colors.textMuted}`}>
            Você pode remarcar os seus agendamentos, mas não passá-los para outro profissional.
          </p>
        )}

        <ScheduleSelection
          teamMembers={teamMembers}
          selectedProId={selectedProId}
          setSelectedProId={setSelectedProId}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          selectedTime={selectedTime}
          setSelectedTime={setSelectedTime}
          activeCardBg={activeCardBg}
          cardBg={cardBg}
          accentColor="text-theme-accent"
          isBeauty={isBeauty}
          services={appointment.service ? [{ id: 'svc', name: appointment.service }] : []}
          selectedServiceIds={[]}
          user={user}
          businessHours={businessHours}
          shopTimeZone={shopTimeZone}
          blocks={blocks}
          durationMinutes={appointment.duration_minutes || 30}
          lockProfessional={lockProfessional}
          timeGridClass="grid grid-cols-3 sm:grid-cols-4 gap-2"
        />
      </div>
    </Modal>
  );
};
