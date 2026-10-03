import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, CalendarClock } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useToast } from '../ui';
import { useAuth } from '../../contexts/AuthContext';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import { useAgendaBlocks } from '../../hooks/useAgendaBlocks';
import { useTenantLocale } from '../../hooks/useTenantLocale';
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
import { buildWhatsAppLink } from '../../utils/formatters';
import { mapError } from '../../utils/mapError';
import { fetchRescheduleOccupancy } from '../../utils/rescheduleOccupancy';
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
import type { OccupyingAppointment } from '../../utils/agendaBlockRange';
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
  public_booking_id?: string | null;
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
  const { user, businessName, companyId } = useAuth();
  const { region: currencyRegion } = useTenantLocale();
  const { colors, isBeauty } = useBrutalTheme();
  const { showToast } = useToast();
  const initialDateStr = getDateStringInTimeZone(appointment.appointment_time, shopTimeZone);
  const initialTime = formatTimeInTimeZone(appointment.appointment_time, shopTimeZone);
  const [selectedDate, setSelectedDate] = useState(() => dateStringToLocalDate(initialDateStr));
  const [selectedTime, setSelectedTime] = useState(initialTime);
  const [selectedProId, setSelectedProId] = useState(appointment.professional_id || '');
  const [notifyWhatsApp, setNotifyWhatsApp] = useState(() => !!appointment.clientPhone?.trim());
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fetchedOccupying, setFetchedOccupying] = useState<OccupyingAppointment[]>([]);
  const [forcedBusy, setForcedBusy] = useState<OccupyingAppointment[]>([]);

  const dateStr = formatLocalDateString(selectedDate);
  const tenantId = companyId || user?.id || '';
  const { data: blocks = [] } = useAgendaBlocks(open ? dateStr : null);

  const loadOccupying = useCallback(async () => {
    if (!open || !tenantId || !selectedProId) return;
    try {
      const rows = await fetchRescheduleOccupancy({
        companyId: tenantId,
        dateStr,
        professionalId: selectedProId,
        timeZone: shopTimeZone,
        ignorePublicBookingId: appointment.public_booking_id,
      });
      setFetchedOccupying(rows);
    } catch {
      // RLS vazio ou rede: a RPC continua sendo a fonte da verdade.
    }
  }, [open, tenantId, selectedProId, dateStr, shopTimeZone, appointment.public_booking_id]);

  useEffect(() => {
    void loadOccupying();
  }, [loadOccupying]);

  useEffect(() => {
    setForcedBusy([]);
    setFormError(null);
  }, [dateStr, selectedProId]);

  useEffect(() => {
    setFormError(null);
  }, [selectedTime]);
  const occupying = useMemo(
    () => [...fetchedOccupying, ...forcedBusy],
    [fetchedOccupying, forcedBusy],
  );
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
    setFormError(null);
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc('reschedule_appointment', {
        p_appointment_id: appointment.id,
        p_new_time: selectedInstant.toISOString(),
        p_new_professional_id: selectedProId,
      });
      if (error) throw error;

      setFormError(null);
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
        window.open(buildWhatsAppLink(appointment.clientPhone || '', currencyRegion, message), '_blank');
      }
      onSuccess({ id: appointment.id, time: selectedInstant, professionalId: selectedProId });
      onClose();
    } catch (err) {
      const mapped = mapError(err, RESCHEDULE_GENERIC_ERROR);
      const message = isStaffEditForbiddenError(err)
        ? STAFF_EDIT_FORBIDDEN_MESSAGE
        : mapped.message;
      setFormError(message);
      const hint = err && typeof err === 'object' && 'hint' in err
        ? String((err as { hint?: string }).hint || '')
        : '';
      if (hint === 'reschedule_slot_busy') {
        setForcedBusy((prev) => [
          ...prev,
          {
            id: `forced:${selectedInstant.toISOString()}`,
            professional_id: selectedProId,
            appointment_time: selectedInstant.toISOString(),
            duration_minutes: appointment.duration_minutes || 30,
            status: 'Confirmed',
          },
        ]);
        void loadOccupying();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const summaryBlock = (
    <div className="space-y-2">
      {selectedInstant && !unchanged && (
        <div
          data-testid="reschedule-summary"
          className={`text-sm ${colors.text} grid grid-cols-[3.25rem_1fr] gap-x-2 gap-y-1 items-baseline`}
        >
          <span className={colors.textMuted}>De</span>
          <span>{formatRescheduleInstant(appointment.appointment_time, shopTimeZone, professionalName)}</span>
          <span className={`${colors.textMuted} inline-flex items-center gap-1`}>
            <ArrowRight className="w-3.5 h-3.5 text-theme-accent shrink-0" aria-hidden="true" />
            Para
          </span>
          <span>{formatRescheduleInstant(selectedInstant.toISOString(), shopTimeZone, destName)}</span>
        </div>
      )}
      {isPast && (
        <p data-testid="reschedule-past-note" className={`text-xs leading-snug ${colors.textMuted}`}>
          {RESCHEDULE_PAST_NOTE}
        </p>
      )}
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={RESCHEDULE_MODAL_TITLE}
      size="2xl"
      preventClose={submitting}
      footer={(
        <div className="flex flex-col gap-3 w-full">
          <div className="md:hidden">{summaryBlock}</div>
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
          {formError && (
            <p
              role="alert"
              data-testid="reschedule-inline-error"
              className="text-sm leading-snug text-[var(--color-danger)]"
            >
              {formError}
            </p>
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
      <div data-testid="reschedule-modal-body" className="space-y-4">
        <div
          data-testid="reschedule-current"
          className="flex items-start gap-3 rounded-xl border border-theme-accent/40 bg-[var(--color-accent-dim)] px-3.5 py-2.5"
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
          compact
          occupyingAppointments={occupying}
          ignoreAppointmentId={appointment.id}
          currentSlotTime={initialTime}
          currentSlotDate={initialDateStr}
          currentProfessionalId={appointment.professional_id || undefined}
          afterDate={<div className="hidden md:block">{summaryBlock}</div>}
        />
      </div>
    </Modal>
  );
};
