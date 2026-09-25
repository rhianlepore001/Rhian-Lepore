import { useEffect, useState } from 'react';
import { fetchAvailableSlots } from '../services/publicBooking';
import { isZonedSlotInPast } from '../utils/businessTimezone';

interface Params {
    businessId: string | null;
    /** Data "YYYY-MM-DD" no calendário do negócio (null = nenhuma escolhida). */
    dateStr: string | null;
    professionalId: string | null;
    durationMinutes: number;
    timezone: string;
}

/**
 * Horários livres do dia, já sem os que passaram no fuso do negócio.
 *
 * O fuso começa pelo padrão da região e muda quando business_settings chega;
 * cada mudança dispara nova busca. Respostas antigas (de uma busca já
 * substituída) são ignoradas pelo flag `cancelled`, então a última dependência
 * sempre vence, independentemente da ordem de chegada das respostas.
 */
export function useZonedAvailableSlots({ businessId, dateStr, professionalId, durationMinutes, timezone }: Params): string[] {
    const [slots, setSlots] = useState<string[]>([]);

    useEffect(() => {
        if (!businessId || !dateStr) return undefined;
        let cancelled = false;

        fetchAvailableSlots(businessId, dateStr, professionalId, durationMinutes)
            .then((list) => {
                if (cancelled) return;
                // Rótulos "HH:MM" são hora local do negócio.
                setSlots(list.filter((slot) => !isZonedSlotInPast(dateStr, slot, timezone)));
            })
            .catch(() => {
                if (!cancelled) setSlots([]);
            });

        return () => {
            cancelled = true;
        };
    // durationMinutes fica fora de propósito: mesmo comportamento de antes
    // (a duração é escolhida antes do passo de data).
    }, [businessId, dateStr, professionalId, timezone]);

    return slots;
}
