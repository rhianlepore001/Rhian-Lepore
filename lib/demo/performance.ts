import { getDateStringInTimeZone } from '../../utils/businessTimezone';
import { metricsSchema } from '../../types/staffPerformance';
import type { DemoTables } from './seed';

export function demoPerformance(tables: DemoTables, args: Record<string, any>) {
  const metrics = (professionalId?: string) => {
    const records = tables.finance_records.filter(r => {
      const day = getDateStringInTimeZone(r.created_at, 'America/Sao_Paulo');
      return r.type === 'revenue' && day >= args.p_start.slice(0, 10) && day <= args.p_end.slice(0, 10) && (!professionalId || r.professional_id === professionalId);
    });
    const revenue = records.reduce((sum, r) => sum + r.revenue, 0);
    const commission = records.reduce((sum, r) => sum + r.commission_value, 0);
    const count = records.length;
    const minutes = records.reduce((sum, record) => sum + Number(tables.services.find(s => s.name === record.service_name)?.duration_minutes ?? 30), 0);
    const zero = Object.fromEntries(Object.keys(metricsSchema.shape).map(key => [key, 0]));
    return { ...zero, atendimentos: count, atendimentos_pagos: count, receita_servicos: revenue, receita_gerada: revenue, tempo_total_min: minutes, tempo_pago_min: minutes, comissao_periodo: commission, comissao_servicos: commission, faturamento_por_hora: count ? revenue / (minutes / 60) : null, ticket_medio: count ? revenue / count : null, retorno: revenue - commission, retorno_por_hora: count ? (revenue - commission) / (minutes / 60) : null, desfechos: count, maduros: count, voltou: Math.floor(count / 2), voltou_taxa: .5 };
  };
  const members = tables.team_members.filter(m => !args.p_professional_id || m.id === args.p_professional_id).map((member, index) => ({ professional_id: member.id, name: member.name, photo_url: null, is_owner: member.is_owner, inactive: false, eligible: true, low_sample: false, rank: index + 1, metrics: metrics(member.id), previous: null, quality: { sem_registro_financeiro: 0, duplicadas: 0, sem_desfecho: 0, imaturos_rebooking: 0 } }));
  return { mode: 'owner', period: { start: args.p_start.slice(0, 10), end: args.p_end.slice(0, 10), tz: 'America/Sao_Paulo', currency: 'BRL', partial: true, previous: null }, min_sample: 5, ranking_available: true, members, unassigned: null, unassigned_previous: null, team_totals: metrics(), team_previous: null, trend: [], top_services: tables.services.map(service => ({ service: service.name, count: 8 })) };
}
