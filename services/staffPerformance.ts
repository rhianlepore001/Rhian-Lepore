import { supabase } from '@/lib/supabase';
import {
  commissionCycleSchema,
  payPreviewSchema,
  staffPerformanceResultSchema,
  type CommissionCycleResult,
  type PayPreview,
  type StaffPerformanceResult,
} from '@/types/staffPerformance';

/** O banco negou (42501): staff pedindo colega/ciclo, ex-staff, sem login. */
export class StaffPerformanceForbiddenError extends Error {
  constructor(message = 'staff_performance_forbidden') {
    super(message);
    this.name = 'StaffPerformanceForbiddenError';
  }
}

type RpcError = { code?: string; status?: number; message?: string } | null | undefined;

/**
 * A RPC ainda não existe no banco (migration da P1 não aplicada): PostgREST
 * responde PGRST202/404, Postgres 42883. Só nesses casos a UI pode cair no
 * caminho antigo; qualquer outro erro vira estado de erro.
 */
export function isRpcUnavailable(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: string; status?: number };
  return e.code === 'PGRST202' || e.code === '42883' || e.status === 404;
}

function raise(error: NonNullable<RpcError>): never {
  if (error.code === '42501') throw new StaffPerformanceForbiddenError(error.message);
  throw Object.assign(new Error(error.message || 'rpc_error'), error);
}

export interface StaffPerformanceParams {
  start: string;
  end: string;
  professionalId?: string | null;
  compare?: boolean;
}

export async function fetchStaffPerformance(params: StaffPerformanceParams): Promise<StaffPerformanceResult> {
  const { data, error } = await supabase.rpc('get_staff_performance_v1', {
    p_start: params.start,
    p_end: params.end,
    p_professional_id: params.professionalId ?? null,
    p_compare: params.compare ?? true,
  });
  if (error) raise(error);
  return staffPerformanceResultSchema.parse(data);
}

/** Ciclo de acerto calculado no servidor, no fuso do tenant. Sem data = ciclo padrão. */
export async function fetchCommissionCycle(cycleEnd?: string | null): Promise<CommissionCycleResult> {
  const { data, error } = await supabase.rpc('get_commission_cycle_v1', { p_cycle_end: cycleEnd ?? null });
  if (error) raise(error);
  return commissionCycleSchema.parse(data);
}

/** Quanto a pay_commission_v1 marcará neste intervalo (fuso do tenant). */
export async function previewCommissionPay(professionalId: string, start: string, end: string): Promise<PayPreview> {
  const { data, error } = await supabase.rpc('preview_commission_pay_v1', {
    p_professional_id: professionalId,
    p_start: start,
    p_end: end,
  });
  if (error) raise(error);
  return payPreviewSchema.parse(data);
}

/** Marca e registra a despesa = SUM marcado. 0 = no-op. */
export async function payCommission(professionalId: string, start: string, end: string): Promise<PayPreview> {
  const { data, error } = await supabase.rpc('pay_commission_v1', {
    p_professional_id: professionalId,
    p_start: start,
    p_end: end,
  });
  if (error) raise(error);
  return payPreviewSchema.parse(data);
}
