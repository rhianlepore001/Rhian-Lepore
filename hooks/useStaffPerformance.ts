import { useQuery } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
import { fetchStaffPerformance, isRpcUnavailable } from '../services/staffPerformance';
import type { OwnerPerformance } from '../types/staffPerformance';
import { parseFilters } from '../utils/staffPerformanceView';

export type PerformanceStatus = 'loading' | 'ready' | 'error' | 'unavailable';

interface Params {
    start: string;
    end: string;
    professionalId: string | null;
    compare: boolean;
}

export function staffPerformanceQueryKey(start: string, end: string, compare: boolean, professionalId: string | null) {
    return ['staff-performance', start, end, compare, professionalId] as const;
}

export async function loadOwnerPerformance(params: Params): Promise<OwnerPerformance> {
    const result = await fetchStaffPerformance(params);
    if (result.mode !== 'owner') throw new Error('unexpected_staff_payload');
    return result;
}

/** Dispara a RPC no mesmo instante em que o chunk da rota começa a baixar. */
export function prefetchStaffPerformanceFromLocation(compare = true) {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash.replace(/^#/, '');
    const q = hash.includes('?') ? hash.slice(hash.indexOf('?')) : window.location.search;
    const filters = parseFilters(q, new Date());
    void queryClient.prefetchQuery({
        queryKey: staffPerformanceQueryKey(filters.start, filters.end, compare, filters.pro),
        queryFn: () => loadOwnerPerformance({
            start: filters.start,
            end: filters.end,
            professionalId: filters.pro,
            compare,
        }),
        staleTime: 60_000,
    });
}

/**
 * Uma chamada por filtro. Trocar de colaborador usa o cache da equipe
 * (queryKey inclui o professionalId; a chave da equipe permanece intacta).
 */
export function useStaffPerformance({ start, end, professionalId, compare }: Params) {
    const query = useQuery({
        queryKey: staffPerformanceQueryKey(start, end, compare, professionalId),
        queryFn: () => loadOwnerPerformance({ start, end, professionalId, compare }),
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
