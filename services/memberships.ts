import { supabase } from '@/lib/supabase';

export type MembershipStatus = 'pending' | 'active' | 'overdue' | 'cancelled';
export type MembershipPaymentMethod = 'pix' | 'cash' | 'card' | 'in_person';
export type MembershipPaymentStatus = 'pending' | 'confirmed' | 'failed';
export type MembershipBadgeColor = 'gold' | 'silver' | 'bronze';
export type PixKeyType = 'cpf' | 'cnpj' | 'phone' | 'email' | 'random';

export interface MembershipPlan {
    id: string;
    user_id: string;
    name: string;
    description: string | null;
    price_cents: number;
    service_ids: string[];
    usage_limit_per_month: number | null;
    badge_color: MembershipBadgeColor;
    active: boolean;
    created_at: string;
    updated_at: string;
}

export interface ClientMembership {
    id: string;
    user_id: string;
    client_id: string;
    plan_id: string;
    status: MembershipStatus;
    payment_method: MembershipPaymentMethod | null;
    starts_at: string;
    current_period_start: string | null;
    current_period_end: string | null;
    next_billing_at: string | null;
    last_paid_at: string | null;
    cancelled_at: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

export interface MembershipPayment {
    id: string;
    user_id: string;
    membership_id: string;
    amount_cents: number;
    method: 'pix' | 'cash' | 'card';
    status: MembershipPaymentStatus;
    paid_at: string | null;
    confirmed_at: string | null;
    confirmed_by: string | null;
    created_at: string;
}

export interface MembershipWithPlan extends ClientMembership {
    plan: MembershipPlan | null;
    client: { id: string; name: string; phone: string } | null;
}

export async function fetchMembershipPlans(companyId: string): Promise<MembershipPlan[]> {
    const { data, error } = await supabase
        .from('membership_plans')
        .select('*')
        .eq('user_id', companyId)
        .order('price_cents', { ascending: true });
    if (error) throw error;
    return (data ?? []) as MembershipPlan[];
}

export async function fetchActiveMembershipPlans(companyId: string): Promise<MembershipPlan[]> {
    const { data, error } = await supabase
        .from('membership_plans')
        .select('*')
        .eq('user_id', companyId)
        .eq('active', true)
        .order('price_cents', { ascending: true });
    if (error) throw error;
    return (data ?? []) as MembershipPlan[];
}

export interface UpsertMembershipPlanInput {
    id?: string;
    name: string;
    description?: string | null;
    price_cents: number;
    service_ids: string[];
    usage_limit_per_month?: number | null;
    badge_color: MembershipBadgeColor;
    active: boolean;
}

export async function upsertMembershipPlan(companyId: string, input: UpsertMembershipPlanInput): Promise<MembershipPlan> {
    const payload = {
        id: input.id,
        user_id: companyId,
        name: input.name,
        description: input.description ?? null,
        price_cents: input.price_cents,
        service_ids: input.service_ids,
        usage_limit_per_month: input.usage_limit_per_month ?? null,
        badge_color: input.badge_color,
        active: input.active,
    };
    const { data, error } = await supabase
        .from('membership_plans')
        .upsert(payload, { onConflict: 'id' })
        .select('*')
        .single();
    if (error) throw error;
    return data as MembershipPlan;
}

export async function deleteMembershipPlan(companyId: string, planId: string): Promise<void> {
    const { error } = await supabase
        .from('membership_plans')
        .delete()
        .eq('user_id', companyId)
        .eq('id', planId);
    if (error) throw error;
}

export async function fetchClientMemberships(companyId: string, statusFilter?: MembershipStatus): Promise<MembershipWithPlan[]> {
    let query = supabase
        .from('client_memberships')
        .select(`
            *,
            plan:membership_plans(*),
            client:clients(id, name, phone)
        `)
        .eq('user_id', companyId)
        .order('created_at', { ascending: false });
    if (statusFilter) query = query.eq('status', statusFilter);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as unknown as MembershipWithPlan[];
}

export async function fetchClientActiveMembership(companyId: string, clientId: string): Promise<MembershipWithPlan | null> {
    const { data, error } = await supabase
        .from('client_memberships')
        .select(`
            *,
            plan:membership_plans(*),
            client:clients(id, name, phone)
        `)
        .eq('user_id', companyId)
        .eq('client_id', clientId)
        .in('status', ['pending', 'active', 'overdue'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    if (error) throw error;
    return (data ?? null) as MembershipWithPlan | null;
}

export interface CreateMembershipInput {
    client_id: string;
    plan_id: string;
    payment_method: MembershipPaymentMethod;
}

export async function createMembershipRequest(companyId: string, input: CreateMembershipInput): Promise<ClientMembership> {
    const { data, error } = await supabase
        .from('client_memberships')
        .insert({
            user_id: companyId,
            client_id: input.client_id,
            plan_id: input.plan_id,
            status: 'pending',
            payment_method: input.payment_method,
            starts_at: new Date().toISOString(),
        })
        .select('*')
        .single();
    if (error) throw error;
    return data as ClientMembership;
}

export async function confirmMembershipPayment(
    companyId: string,
    membershipId: string,
    method: 'pix' | 'cash' | 'card',
    confirmedByUserId: string
): Promise<void> {
    const now = new Date().toISOString();
    const oneMonthLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Buscar membership + plan para saber o valor
    const { data: ms, error: msErr } = await supabase
        .from('client_memberships')
        .select('plan_id, plan:membership_plans(price_cents)')
        .eq('user_id', companyId)
        .eq('id', membershipId)
        .single();
    if (msErr) throw msErr;

    const plan = ms?.plan as unknown as { price_cents: number } | null;
    const amountCents = plan?.price_cents ?? 0;

    // 2. Criar payment confirmado
    const { error: payErr } = await supabase
        .from('membership_payments')
        .insert({
            user_id: companyId,
            membership_id: membershipId,
            amount_cents: amountCents,
            method,
            status: 'confirmed',
            paid_at: now,
            confirmed_at: now,
            confirmed_by: confirmedByUserId,
        });
    if (payErr) throw payErr;

    // 3. Atualizar membership
    const { error: updErr } = await supabase
        .from('client_memberships')
        .update({
            status: 'active',
            current_period_start: now,
            current_period_end: oneMonthLater,
            next_billing_at: oneMonthLater,
            last_paid_at: now,
        })
        .eq('user_id', companyId)
        .eq('id', membershipId);
    if (updErr) throw updErr;
}

export async function cancelMembership(companyId: string, membershipId: string): Promise<void> {
    const { error } = await supabase
        .from('client_memberships')
        .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
        })
        .eq('user_id', companyId)
        .eq('id', membershipId);
    if (error) throw error;
}

export async function fetchMembershipPayments(companyId: string, membershipId: string): Promise<MembershipPayment[]> {
    const { data, error } = await supabase
        .from('membership_payments')
        .select('*')
        .eq('user_id', companyId)
        .eq('membership_id', membershipId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as MembershipPayment[];
}

export async function fetchBusinessPixConfig(companyId: string): Promise<{
    pix_key_type: PixKeyType | null;
    pix_key_value: string | null;
    pix_holder_name: string | null;
    pix_merchant_city: string | null;
}> {
    const { data, error } = await supabase
        .from('business_settings')
        .select('pix_key_type, pix_key_value, pix_holder_name, pix_merchant_city')
        .eq('user_id', companyId)
        .maybeSingle();
    if (error) throw error;
    return {
        pix_key_type: (data?.pix_key_type as PixKeyType | null) ?? null,
        pix_key_value: data?.pix_key_value ?? null,
        pix_holder_name: data?.pix_holder_name ?? null,
        pix_merchant_city: data?.pix_merchant_city ?? null,
    };
}

export interface UpdateBusinessPixInput {
    pix_key_type: PixKeyType;
    pix_key_value: string;
    pix_holder_name: string;
    pix_merchant_city: string;
}

export async function updateBusinessPixConfig(companyId: string, input: UpdateBusinessPixInput): Promise<void> {
    const { error } = await supabase
        .from('business_settings')
        .upsert({
            user_id: companyId,
            pix_key_type: input.pix_key_type,
            pix_key_value: input.pix_key_value,
            pix_holder_name: input.pix_holder_name,
            pix_merchant_city: input.pix_merchant_city,
        }, { onConflict: 'user_id' });
    if (error) throw error;
}

export interface MembershipStats {
    totalActive: number;
    totalOverdue: number;
    totalPending: number;
    totalCancelled: number;
    monthlyRecurringRevenueCents: number;
}

export async function fetchMembershipStats(companyId: string): Promise<MembershipStats> {
    const { data, error } = await supabase
        .from('client_memberships')
        .select(`
            status,
            plan:membership_plans(price_cents)
        `)
        .eq('user_id', companyId);
    if (error) throw error;
    const rows = (data ?? []) as unknown as Array<{ status: MembershipStatus; plan: { price_cents: number } | null }>;
    const stats: MembershipStats = {
        totalActive: 0,
        totalOverdue: 0,
        totalPending: 0,
        totalCancelled: 0,
        monthlyRecurringRevenueCents: 0,
    };
    for (const r of rows) {
        if (r.status === 'active') {
            stats.totalActive += 1;
            stats.monthlyRecurringRevenueCents += r.plan?.price_cents ?? 0;
        } else if (r.status === 'overdue') stats.totalOverdue += 1;
        else if (r.status === 'pending') stats.totalPending += 1;
        else if (r.status === 'cancelled') stats.totalCancelled += 1;
    }
    return stats;
}
