import { supabase } from '@/lib/supabase';

export type MembershipStatus = 'pending' | 'active' | 'overdue' | 'cancelled';
export type MembershipPaymentMethod = 'pix' | 'cash' | 'card' | 'in_person';
export type MembershipPaymentStatus = 'pending' | 'confirmed' | 'failed';
export type MembershipBadgeColor = 'gold' | 'silver' | 'bronze';
export type PixKeyType = 'cpf' | 'cnpj' | 'phone' | 'email' | 'random';
export type PixPaymentStatus = 'pending' | 'paid' | 'expired' | 'cancelled';

export interface PixPayment {
    id: string;
    user_id: string;
    membership_id: string;
    amount_cents: number;
    br_code: string;
    txid: string;
    status: PixPaymentStatus;
    paid_at: string | null;
    expires_at: string;
    confirmed_at: string | null;
    confirmed_by: string | null;
    created_at: string;
    updated_at: string;
}

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

// ============================================================================
// Fluxo público (/clube, sem login) — RPCs SECURITY DEFINER escopados por
// business_id. Migration: 20260704000001_public_club_rpcs.sql
// ============================================================================

export async function fetchPublicMembershipPlans(businessId: string): Promise<MembershipPlan[]> {
    const { data, error } = await supabase.rpc('get_public_membership_plans', {
        p_business_id: businessId,
    });
    if (error) throw error;
    return (data ?? []) as MembershipPlan[];
}

export async function fetchPublicPixConfig(businessId: string): Promise<{
    pix_key_type: PixKeyType | null;
    pix_key_value: string | null;
    pix_holder_name: string | null;
    pix_merchant_city: string | null;
}> {
    const { data, error } = await supabase.rpc('get_public_pix_config', {
        p_business_id: businessId,
    });
    if (error) throw error;
    const row = data?.[0];
    return {
        pix_key_type: (row?.pix_key_type as PixKeyType | null) ?? null,
        pix_key_value: row?.pix_key_value ?? null,
        pix_holder_name: row?.pix_holder_name ?? null,
        pix_merchant_city: row?.pix_merchant_city ?? null,
    };
}

export interface CreatePublicMembershipInput {
    clientName: string;
    clientPhone: string;
    planId: string;
    paymentMethod: 'pix' | 'in_person';
}

export async function createPublicMembershipRequest(
    businessId: string,
    input: CreatePublicMembershipInput
): Promise<string> {
    const { data, error } = await supabase.rpc('create_public_membership_request', {
        p_business_id: businessId,
        p_client_name: input.clientName,
        p_client_phone: input.clientPhone,
        p_plan_id: input.planId,
        p_payment_method: input.paymentMethod,
    });
    if (error) throw error;
    return data as string;
}

export interface CreatePublicPixPaymentInput {
    membershipId: string;
    brCode: string;
    txid: string;
    expiresAt: string;
}

export async function createPublicPixPayment(
    businessId: string,
    input: CreatePublicPixPaymentInput
): Promise<string> {
    const { data, error } = await supabase.rpc('create_public_pix_payment', {
        p_business_id: businessId,
        p_membership_id: input.membershipId,
        p_br_code: input.brCode,
        p_txid: input.txid,
        p_expires_at: input.expiresAt,
    });
    if (error) throw error;
    return data as string;
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

// =============================================================================
// Sprint D+1: Pagamentos Pix + Simulação de webhook
// =============================================================================

export interface CreatePixPaymentInput {
    membership_id: string;
    amount_cents: number;
    br_code: string;
    txid: string;
    expires_at: string;
}

export async function createPixPayment(
    companyId: string,
    input: CreatePixPaymentInput
): Promise<PixPayment> {
    const { data, error } = await supabase
        .from('pix_payments')
        .insert({
            user_id: companyId,
            membership_id: input.membership_id,
            amount_cents: input.amount_cents,
            br_code: input.br_code,
            txid: input.txid,
            expires_at: input.expires_at,
            status: 'pending',
        })
        .select('*')
        .single();
    if (error) throw error;
    return data as PixPayment;
}

export async function fetchPixPaymentByMembership(
    companyId: string,
    membershipId: string
): Promise<PixPayment | null> {
    const { data, error } = await supabase
        .from('pix_payments')
        .select('*')
        .eq('user_id', companyId)
        .eq('membership_id', membershipId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    if (error) throw error;
    return (data ?? null) as PixPayment | null;
}

/**
 * Simula a confirmação do Pix pelo banco (webhook real quando integrar PSP).
 * Ativa a membership, gera o payment de membership e marca o pix como paid.
 * Tudo em transação lógica (sem RPC — operations em sequência; se alguma falhar, o estado fica inconsistente,
 * mas como é simulação, o barbeiro pode re-tentar).
 */
export interface SimulatePixPaidInput {
    pixPaymentId: string;
    membershipId: string;
    confirmedByUserId: string;
}

export async function simulatePixPaid(
    companyId: string,
    input: SimulatePixPaidInput
): Promise<void> {
    const now = new Date().toISOString();
    const oneMonthLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Buscar dados da membership + plano (para saber valor e cliente)
    const { data: ms, error: msErr } = await supabase
        .from('client_memberships')
        .select('plan_id, plan:membership_plans(price_cents)')
        .eq('user_id', companyId)
        .eq('id', input.membershipId)
        .single();
    if (msErr) throw msErr;

    const plan = ms?.plan as unknown as { price_cents: number } | null;
    const amountCents = plan?.price_cents ?? 0;

    // 2. Marcar pix_payments como paid
    const { error: pixErr } = await supabase
        .from('pix_payments')
        .update({
            status: 'paid',
            paid_at: now,
            confirmed_at: now,
            confirmed_by: input.confirmedByUserId,
        })
        .eq('user_id', companyId)
        .eq('id', input.pixPaymentId);
    if (pixErr) throw pixErr;

    // 3. Criar membership_payments (histórico)
    const { error: payErr } = await supabase
        .from('membership_payments')
        .insert({
            user_id: companyId,
            membership_id: input.membershipId,
            amount_cents: amountCents,
            method: 'pix',
            status: 'confirmed',
            paid_at: now,
            confirmed_at: now,
            confirmed_by: input.confirmedByUserId,
        });
    if (payErr) throw payErr;

    // 4. Ativar membership
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
        .eq('id', input.membershipId);
    if (updErr) throw updErr;
}

/**
 * Cancela um Pix pendente (cliente desistiu / timeout).
 */
export async function cancelPixPayment(
    companyId: string,
    pixPaymentId: string
): Promise<void> {
    const { error } = await supabase
        .from('pix_payments')
        .update({ status: 'cancelled' })
        .eq('user_id', companyId)
        .eq('id', pixPaymentId);
    if (error) throw error;
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
