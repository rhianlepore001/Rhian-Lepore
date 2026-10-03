import { useEffect, useState } from 'react';
import { fetchAvailableSlots, type AvailableSlotsResult } from '../services/publicBooking';
import { DEFAULT_BOOKING_LEAD_TIME_HOURS } from '../utils/bookingLeadTime';
import { isZonedSlotInPast } from '../utils/businessTimezone';

interface Params {
    businessId: string | null;
    /** Data "YYYY-MM-DD" no calendário do negócio (null = nenhuma escolhida). */
    dateStr: string | null;
    professionalId: string | null;
    durationMinutes: number;
    timezone: string;
}

const EMPTY: AvailableSlotsResult = {
    slots: [],
    leadTimeHours: DEFAULT_BOOKING_LEAD_TIME_HOURS,
    emptyReason: null,
};

/**
 * Horários livres do dia, já sem os que passaram no fuso do negócio.
 *
 * O fuso começa pelo padrão da região e muda quando business_settings chega;
 * cada mudança dispara nova busca. Respostas antigas (de uma busca já
 * substituída) são ignoradas pelo flag `cancelled`, então a última dependência
 * sempre vence, independentemente da ordem de chegada das respostas.
 */
export function useZonedAvailableSlots({ businessId, dateStr, professionalId, durationMinutes, timezone }: Params): AvailableSlotsResult {
    const [result, setResult] = useState<AvailableSlotsResult>(EMPTY);

    useEffect(() => {
        if (!businessId || !dateStr) return undefined;
        let cancelled = false;

        fetchAvailableSlots(businessId, dateStr, professionalId, durationMinutes)
            .then((payload) => {
                if (cancelled) return;
                setResult({
                    ...payload,
                    slots: payload.slots.filter((slot) => !isZonedSlotInPast(dateStr, slot, timezone)),
                });
            })
            .catch(() => {
                if (!cancelled) setResult(EMPTY);
            });

        return () => {
            cancelled = true;
        };
    // durationMinutes fica fora de propósito: mesmo comportamento de antes
    // (a duração é escolhida antes do passo de data).
    }, [businessId, dateStr, professionalId, timezone]);

    return result;
}
