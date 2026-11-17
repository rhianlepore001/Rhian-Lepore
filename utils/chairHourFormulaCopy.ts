/**
 * Copy alinhada ao get_chair_hour_v1 (migration 20261108150422_chair_hour_hardening.sql):
 *
 * cost_per_hour =
 *   fixed_cost / (available_minutes/60)
 *   + (attendance_count=0 ? 0 : (material_cost + commission + machine_fee) / (available_minutes/60))
 *
 * margin_per_hour = revenue_per_available_hour - cost_per_hour
 *   (revenue_per_available_hour = revenue / (available_minutes/60))
 *
 * Exemplo (há atendimento, então as duas parcelas entram):
 *   contas 2.000 ÷ 160 h abertas = 12,50
 *   material + comissão + taxa 800 ÷ 160 h abertas = 5,00
 *   custo = 12,50 + 5,00 = 17,50
 *   rendeu 50 por hora aberta; sobra = 50 − 17,50 = 32,50
 */
export const CHAIR_HOUR_COST_FORMULA =
  'Custo da hora = contas do mês ÷ horas abertas + (material + comissão já cadastrada + taxa da maquininha) ÷ horas abertas. Sobra = o que a hora aberta rendeu − esse custo.';

export const CHAIR_HOUR_COST_EXAMPLE =
  'Hora aberta: na agenda, com ou sem cliente. Ex.: contas 2.000 ÷ 160 h abertas = 12,50; material, comissão e taxa 800 ÷ 160 = 5,00. Custo 17,50. Rendeu 50 por hora aberta, sobra 32,50.';
