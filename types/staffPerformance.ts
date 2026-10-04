import { z } from 'zod';

/**
 * Payloads de get_staff_performance_v1 / get_commission_cycle_v1 (ACCEPTANCE §9).
 * Dinheiro = número com 2 casas; razões = 0–1 ou null (sem base).
 * O schema do modo staff NÃO declara retorno, custo, ranking nem equipe:
 * mesmo que o servidor mandasse, o zod descarta (defesa em profundidade, R11.3).
 */
const num = z.number().nullable();
const int = z.number().int();
const id = z.string().min(1);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Números que o colaborador pode ver dele mesmo. */
const ownMetricsShape = {
  atendimentos: int,
  atendimentos_clube: int,
  atendimentos_pagos: int,
  receita_servicos: z.number(),
  receita_produtos: z.number(),
  tempo_total_min: z.number(),
  tempo_pago_min: z.number(),
  tempo_clube_min: z.number(),
  comissao_periodo: z.number(),
  faturamento_por_hora: num,
  ticket_medio: num,
  faltas: int,
  cancelamentos: int,
  desfechos: int,
  taxa_faltas: num,
  taxa_cancelamentos: num,
  sem_desfecho: int,
  vendas_produtos: int,
  visitas_com_produto: int,
  attach: num,
  maduros: int,
  voltou: int,
  voltou_taxa: num,
  imaturos: int,
  sem_registro_financeiro: int,
};

export const ownMetricsSchema = z.object(ownMetricsShape);

export const metricsSchema = z.object({
  ...ownMetricsShape,
  comissao_servicos: z.number(),
  comissao_produtos: z.number(),
  comissao_avulsa: z.number(),
  receita_avulsa: z.number(),
  avulsos: int,
  custo_produtos: z.number(),
  receita_gerada: z.number(),
  retorno: num,
  retorno_por_hora: num,
  duplicadas: int,
});

const periodSchema = z.object({
  start: isoDate,
  end: isoDate,
  tz: z.string(),
  currency: z.enum(['BRL', 'EUR']),
  partial: z.boolean(),
  previous: z.object({ start: isoDate, end: isoDate }).nullable(),
});

const qualitySchema = z.object({
  sem_registro_financeiro: int,
  duplicadas: int,
  sem_desfecho: int,
  imaturos_rebooking: int,
});

export const performanceMemberSchema = z.object({
  professional_id: id,
  name: z.string(),
  photo_url: z.string().nullable(),
  is_owner: z.boolean(),
  inactive: z.boolean(),
  eligible: z.boolean(),
  low_sample: z.boolean(),
  rank: int.nullable(),
  metrics: metricsSchema,
  previous: metricsSchema.nullable(),
  quality: qualitySchema,
});

const topServiceSchema = z.object({ service: z.string(), count: int });

const trendPointSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  retorno: num,
  ticket_medio: num,
  comissao: num,
  atendimentos: int,
  low_sample: z.boolean(),
});

const ownTrendPointSchema = trendPointSchema.omit({ retorno: true });

export const ownerPerformanceSchema = z.object({
  mode: z.literal('owner'),
  period: periodSchema,
  min_sample: int,
  ranking_available: z.boolean(),
  members: z.array(performanceMemberSchema),
  unassigned: metricsSchema.nullable(),
  unassigned_previous: metricsSchema.nullable(),
  team_totals: metricsSchema.nullable(),
  team_previous: metricsSchema.nullable(),
  trend: z.array(trendPointSchema).nullable(),
  top_services: z.array(topServiceSchema).nullable().transform((v) => v ?? []),
});

export const staffPerformanceSchema = z.object({
  mode: z.literal('staff'),
  period: periodSchema,
  me: z.object({
    professional_id: id,
    name: z.string(),
    photo_url: z.string().nullable(),
    low_sample: z.boolean(),
    metrics: ownMetricsSchema,
    previous: ownMetricsSchema.nullable(),
  }),
  trend: z.array(ownTrendPointSchema),
  top_services: z.array(topServiceSchema),
});

export const staffPerformanceResultSchema = z.discriminatedUnion('mode', [ownerPerformanceSchema, staffPerformanceSchema]);

export type PerformanceMetrics = z.infer<typeof metricsSchema>;
export type OwnMetrics = z.infer<typeof ownMetricsSchema>;
export type PerformanceMember = z.infer<typeof performanceMemberSchema>;
export type OwnerPerformance = z.infer<typeof ownerPerformanceSchema>;
export type StaffOwnPerformance = z.infer<typeof staffPerformanceSchema>;
export type StaffPerformanceResult = z.infer<typeof staffPerformanceResultSchema>;
export type PerformanceTrendPoint = z.infer<typeof trendPointSchema>;

// ---- Ciclo de comissão (M1/M2) ----
export const cycleStatusSchema = z.enum(['pendente', 'pago', 'pago_com_ajuste', 'nada_a_pagar']);

export const cycleMemberSchema = z.object({
  professional_id: id,
  name: z.string(),
  photo_url: z.string().nullable(),
  inactive: z.boolean(),
  commission_rate: z.number().nullable().transform((v) => v ?? 0),
  a_pagar_ciclo: z.number(),
  saldo_acumulado: z.number(),
  /** Não pago e lançado ANTES do início do ciclo ("+ X de ciclos anteriores"). */
  saldo_anterior: z.number(),
  /** Data local (AAAA-MM-DD, fuso do tenant) do lançamento não pago mais antigo. */
  primeiro_nao_pago: isoDate.nullable(),
  servicos_ciclo: int,
  produtos_ciclo: int,
  pago_ciclo: num,
  /** Data do pagamento que cobre ESTE ciclo ("Pago em dd/mm"). */
  pago_ciclo_em: z.string().nullable(),
  pago_calculado: z.number(),
  status: cycleStatusSchema,
  ultimo_pagamento: z
    .object({ paid_at: z.string(), amount: z.number(), start_date: isoDate.nullable(), end_date: isoDate.nullable() })
    .nullable(),
});

export const commissionCycleSchema = z.object({
  cycle: z.object({ start: isoDate, end: isoDate, open: z.boolean(), pay_due: isoDate.optional() }),
  settlement_day: int,
  tz: z.string(),
  currency: z.enum(['BRL', 'EUR']),
  previous_end: isoDate,
  next_end: isoDate,
  members: z.array(cycleMemberSchema),
  totals: z.object({ a_pagar_ciclo: z.number(), pendentes: int, pago_ciclo: z.number() }),
  pay_due: isoDate.optional(),
  frequency: z.string().optional(),
  pay_offset_days: z.number().int().optional(),
});

export const payPreviewSchema = z.object({
  amount: z.number(),
  count: z.number().int(),
  start: isoDate,
  end: isoDate,
  tz: z.string().optional(),
});

export type CycleStatus = z.infer<typeof cycleStatusSchema>;
export type CycleMember = z.infer<typeof cycleMemberSchema>;
export type CommissionCycleResult = z.infer<typeof commissionCycleSchema>;
export type PayPreview = z.infer<typeof payPreviewSchema>;
