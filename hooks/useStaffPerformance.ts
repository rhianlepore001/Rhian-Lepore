import { useQuery } from '@tanstack/react-query';
import { fetchStaffPerformance, isRpcUnavailable } from '../services/staffPerformance';
import type { OwnerPerformance } from '../types/staffPerformance';

export type PerformanceStatus = 'loading' | 'ready' | 'error' | 'unavailable';

interface Params {
    start: string;
    end: string;
    professionalId: string | null;
    compare: boolean;
}

/**
 * Uma chamada por filtro. Trocar de colaborador usa o cache da equipe
 * (queryKey inclui o professionalId; a chave da equipe permanece intacta).
 */
export function useStaffPerformance({ start, end, professionalId, compare }: Params) {
    const query = useQuery({
        queryKey: ['staff-performance', start, end, compare, professionalId ?? null],
        queryFn: async (): Promise<OwnerPerformance> => {
            const result = await fetchStaffPerformance({ start, end, professionalId, compare });
            if (result.mode !== 'owner') throw new Error('unexpected_staff_payload');
            return result;
        },
        retry: false,
        staleTime: 60_000,
    });

    const unavailable = isRpcUnavailable(query.error);
    const status: PerformanceStatus = query.isPending
        ? 'loading'
        : unavailable
            ? 'unavailable'
            : query.isError
                ? 'error'
                : 'ready';

    return {
        status,
        data: query.data ?? null,
        retry: () => { void query.refetch(); },
    };
}
