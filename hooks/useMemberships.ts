import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import {
    fetchMembershipPlans,
    fetchActiveMembershipPlans,
    upsertMembershipPlan,
    deleteMembershipPlan,
    fetchClientMemberships,
    fetchClientActiveMembership,
    createMembershipRequest,
    confirmMembershipPayment,
    cancelMembership,
    fetchMembershipPayments,
    fetchBusinessPixConfig,
    updateBusinessPixConfig,
    fetchMembershipStats,
    fetchPixPaymentByMembership,
    simulatePixPaid,
    cancelPixPayment,
    createPixPayment,
    UpsertMembershipPlanInput,
    CreateMembershipInput,
    UpdateBusinessPixInput,
    MembershipPlan,
    ClientMembership,
    MembershipWithPlan,
    MembershipPayment,
    MembershipStatus,
    PixPayment,
} from '../services/memberships';

const KEYS = {
    plans: (companyId: string) => ['membership-plans', companyId] as const,
    activePlans: (companyId: string) => ['membership-plans', 'active', companyId] as const,
    memberships: (companyId: string) => ['client-memberships', companyId] as const,
    clientMembership: (companyId: string, clientId: string) => ['client-membership', companyId, clientId] as const,
    payments: (companyId: string, membershipId: string) => ['membership-payments', companyId, membershipId] as const,
    pixConfig: (companyId: string) => ['business-pix-config', companyId] as const,
    stats: (companyId: string) => ['membership-stats', companyId] as const,
    pixPayment: (companyId: string, membershipId: string) => ['pix-payment', companyId, membershipId] as const,
};

export function useMembershipPlans() {
    const { companyId } = useAuth();
    return useQuery({
        queryKey: KEYS.plans(companyId!),
        queryFn: () => fetchMembershipPlans(companyId!),
        enabled: !!companyId,
    });
}

export function useActiveMembershipPlans() {
    const { companyId } = useAuth();
    return useQuery({
        queryKey: KEYS.activePlans(companyId!),
        queryFn: () => fetchActiveMembershipPlans(companyId!),
        enabled: !!companyId,
    });
}

export function useUpsertMembershipPlan() {
    const { companyId } = useAuth();
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: UpsertMembershipPlanInput) => upsertMembershipPlan(companyId!, input),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: KEYS.plans(companyId!) });
            qc.invalidateQueries({ queryKey: KEYS.activePlans(companyId!) });
            qc.invalidateQueries({ queryKey: KEYS.stats(companyId!) });
        },
    });
}

export function useDeleteMembershipPlan() {
    const { companyId } = useAuth();
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (planId: string) => deleteMembershipPlan(companyId!, planId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: KEYS.plans(companyId!) });
            qc.invalidateQueries({ queryKey: KEYS.activePlans(companyId!) });
        },
    });
}

export function useClientMemberships(statusFilter?: MembershipStatus) {
    const { companyId } = useAuth();
    return useQuery({
        queryKey: [...KEYS.memberships(companyId!), statusFilter ?? 'all'],
        queryFn: () => fetchClientMemberships(companyId!, statusFilter),
        enabled: !!companyId,
    });
}

export function useClientActiveMembership(clientId: string | null) {
    const { companyId } = useAuth();
    return useQuery({
        queryKey: KEYS.clientMembership(companyId!, clientId ?? ''),
        queryFn: () => fetchClientActiveMembership(companyId!, clientId!),
        enabled: !!companyId && !!clientId,
    });
}

export function useCreateMembershipRequest() {
    const { companyId } = useAuth();
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: CreateMembershipInput) => createMembershipRequest(companyId!, input),
        onSuccess: (_data, vars) => {
            qc.invalidateQueries({ queryKey: KEYS.memberships(companyId!) });
            qc.invalidateQueries({ queryKey: KEYS.clientMembership(companyId!, vars.client_id) });
            qc.invalidateQueries({ queryKey: KEYS.stats(companyId!) });
        },
    });
}

export function useConfirmMembershipPayment() {
    const { companyId, user } = useAuth();
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ membershipId, method }: { membershipId: string; method: 'pix' | 'cash' | 'card' }) =>
            confirmMembershipPayment(companyId!, membershipId, method, user!.id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: KEYS.memberships(companyId!) });
            qc.invalidateQueries({ queryKey: KEYS.stats(companyId!) });
        },
    });
}

export function useCancelMembership() {
    const { companyId } = useAuth();
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (membershipId: string) => cancelMembership(companyId!, membershipId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: KEYS.memberships(companyId!) });
            qc.invalidateQueries({ queryKey: KEYS.stats(companyId!) });
        },
    });
}

export function useMembershipPayments(membershipId: string | null) {
    const { companyId } = useAuth();
    return useQuery({
        queryKey: KEYS.payments(companyId!, membershipId ?? ''),
        queryFn: () => fetchMembershipPayments(companyId!, membershipId!),
        enabled: !!companyId && !!membershipId,
    });
}

export function useBusinessPixConfig() {
    const { companyId } = useAuth();
    return useQuery({
        queryKey: KEYS.pixConfig(companyId!),
        queryFn: () => fetchBusinessPixConfig(companyId!),
        enabled: !!companyId,
    });
}

export function useUpdateBusinessPixConfig() {
    const { companyId } = useAuth();
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: UpdateBusinessPixInput) => updateBusinessPixConfig(companyId!, input),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: KEYS.pixConfig(companyId!) });
        },
    });
}

export function useMembershipStats() {
    const { companyId } = useAuth();
    return useQuery({
        queryKey: KEYS.stats(companyId!),
        queryFn: () => fetchMembershipStats(companyId!),
        enabled: !!companyId,
    });
}

// =============================================================================
// Sprint D+1: Hooks de Pix
// =============================================================================

export function usePixPaymentByMembership(membershipId: string | null) {
    const { companyId } = useAuth();
    return useQuery({
        queryKey: KEYS.pixPayment(companyId!, membershipId ?? ''),
        queryFn: () => fetchPixPaymentByMembership(companyId!, membershipId!),
        enabled: !!companyId && !!membershipId,
    });
}

export function useCreatePixPayment() {
    const { companyId } = useAuth();
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: Parameters<typeof createPixPayment>[1]) =>
            createPixPayment(companyId!, input),
        onSuccess: (_data, vars) => {
            qc.invalidateQueries({ queryKey: KEYS.pixPayment(companyId!, vars.membership_id) });
        },
    });
}

export function useSimulatePixPaid() {
    const { companyId } = useAuth();
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: { pixPaymentId: string; membershipId: string; confirmedByUserId: string }) =>
            simulatePixPaid(companyId!, input),
        onSuccess: (_data, vars) => {
            qc.invalidateQueries({ queryKey: KEYS.memberships(companyId!) });
            qc.invalidateQueries({ queryKey: KEYS.pixPayment(companyId!, vars.membershipId) });
            qc.invalidateQueries({ queryKey: KEYS.stats(companyId!) });
        },
    });
}

export function useCancelPixPayment() {
    const { companyId } = useAuth();
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ pixPaymentId, membershipId }: { pixPaymentId: string; membershipId: string }) =>
            cancelPixPayment(companyId!, pixPaymentId),
        onSuccess: (_data, vars) => {
            qc.invalidateQueries({ queryKey: KEYS.pixPayment(companyId!, vars.membershipId) });
        },
    });
}

export type {
    MembershipPlan,
    ClientMembership,
    MembershipWithPlan,
    MembershipPayment,
    MembershipStatus,
};
