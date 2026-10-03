import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchStaffPerformance, isRpcUnavailable } from '../services/staffPerformance';
import type { OwnerPerformance } from '../types/staffPerformance';

export type PerformanceStatus = 'loading' | 'ready' | 'error' | 'unavailable';

interface Params {
    start: string;
    end: string;
    professionalId: string | null;
    compare: boolean;
}

interface Settled { key: string; status: Exclude<PerformanceStatus, 'loading'>; data: OwnerPerformance | null }

/**
 * Uma chamada por tela (R3.2). O resultado fica amarrado aos parâmetros que o geraram:
 * ao trocar o filtro, a tela volta a "loading" no mesmo render, sem mostrar o payload anterior.
 */
export function useStaffPerformance({ start, end, professionalId, compare }: Params) {
    const key = `${start}|${end}|${professionalId ?? ''}|${compare ? 1 : 0}`;
    const [settled, setSettled] = useState<Settled | null>(null);
    const [attempt, setAttempt] = useState(0);
    const seq = useRef(0);

    useEffect(() => {
        const id = ++seq.current;
        setSettled(null);
        fetchStaffPerformance({ start, end, professionalId, compare })
            .then((result) => {
                if (id !== seq.current) return;
                if (result.mode !== 'owner') throw new Error('unexpected_staff_payload');
                setSettled({ key, status: 'ready', data: result });
            })
            .catch((error: unknown) => {
                if (id !== seq.current) return;
                console.error('get_staff_performance_v1 falhou', error);
                setSettled({ key, status: isRpcUnavailable(error) ? 'unavailable' : 'error', data: null });
            });
    }, [start, end, professionalId, compare, key, attempt]);

    const retry = useCallback(() => setAttempt((n) => n + 1), []);
    const current = settled && settled.key === key ? settled : null;
    return { status: (current?.status ?? 'loading') as PerformanceStatus, data: current?.data ?? null, retry };
}
