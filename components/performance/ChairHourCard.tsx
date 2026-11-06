import React from 'react';
import { Link } from 'react-router-dom';
import { Card, Button } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessCopy } from '@/hooks/useBusinessCopy';
import { useBrutalTheme } from '@/hooks/useBrutalTheme';
import { useChairHour, type HourMetrics } from '@/hooks/useChairHour';
import { useTenantLocale } from '@/hooks/useTenantLocale';

interface Props { month: string; endDate?: string | null; professionalId?: string | null }

export function ChairHourCard({ month, endDate = null, professionalId = null }: Props) {
  const { role, teamMemberId } = useAuth();
  const { chairHour } = useBusinessCopy();
  const { colors } = useBrutalTheme();
  const { formatMoney } = useTenantLocale();
  const { data, status, retry } = useChairHour(month, professionalId, endDate);
  const staff = role === 'staff';
  const money = (value: number | null | undefined) => typeof value === 'number' && Number.isFinite(value) ? formatMoney(value) : '—';
  const metric = (item: HourMetrics, showCosts: boolean) => <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
    <div><p className={`text-xs ${colors.textMuted}`}>Receita por hora trabalhada</p><p className="font-semibold">{money(item.revenue_per_worked_hour)}</p></div>
    <div><p className={`text-xs ${colors.textMuted}`}>Receita por hora disponível</p><p className="font-semibold">{money(item.revenue_per_available_hour)}</p></div>
    <div><p className={`text-xs ${colors.textMuted}`}>Ocupação</p><p className="font-semibold">{typeof item.occupancy === 'number' && Number.isFinite(item.occupancy) ? `${Math.round(item.occupancy * 100)}%` : '—'}</p></div>
    {showCosts && <><div><p className={`text-xs ${colors.textMuted}`}>Custo por hora</p><p className="font-semibold">{money(item.cost_per_hour)}</p></div><div><p className={`text-xs ${colors.textMuted}`}>Margem por hora</p><p className="font-semibold">{money(item.margin_per_hour)}</p></div><div><p className={`text-xs ${colors.textMuted}`}>Custo das horas paradas</p><p className="font-semibold">{money(item.idle_cost)}</p></div></>}
    {(item.estimated_count ?? 0) > 0 && <p className={`col-span-full text-xs ${colors.textMuted}`}>Tempo estimado em {item.estimated_count} {item.estimated_count === 1 ? 'atendimento' : 'atendimentos'}.</p>}
  </div>;
  const selected = staff ? data?.professionals?.find(person => person.id === teamMemberId) : professionalId ? data?.professionals?.find(person => person.id === professionalId) : data?.total;
  const date = /^\d{4}-\d{2}/.test(month) ? `${month.slice(5, 7)}/${month.slice(0, 4)}` : '';
  const formatDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}` : value;
  return <Card><section className="space-y-4" aria-label={`Resultados por ${chairHour}`}>
    <div><h2 className="text-base font-bold">Resultados por {chairHour}</h2><p className={`text-xs ${colors.textMuted}`}>{endDate ? `${formatDate(month)} a ${formatDate(endDate)}` : `Mês ${date}`}</p></div>
    {status === 'loading' && <p role="status" className={`text-sm ${colors.textMuted}`}>Carregando resultados...</p>}
    {status === 'error' && <div><p className="text-sm">Não foi possível carregar os resultados.</p><Button variant="secondary" onClick={retry}>Tentar novamente</Button></div>}
    {status === 'ready' && (!selected || selected.available_minutes == null) && <p className={`text-sm ${colors.textMuted}`}>{staff && !teamMemberId ? 'Perfil ainda não vinculado. Peça ao responsável para adicionar você à equipe.' : staff ? 'Peça ao responsável para configurar os horários de trabalho.' : 'Configure os horários de trabalho para ver os resultados por hora.'}</p>}
    {status === 'ready' && selected?.available_minutes === 0 && <p className={`text-sm ${colors.textMuted}`}>Não há horas disponíveis neste período. Confira os horários e bloqueios.</p>}
    {status === 'ready' && selected && selected.available_minutes != null && (selected.available_minutes > 0 || (selected.worked_minutes ?? 0) > 0) && <>{metric(selected, !staff)}{!staff && selected.available_minutes > 0 && selected.cost_per_hour == null && <p className={`text-sm ${colors.textMuted}`}>Confira os custos, horários e dados dos atendimentos para calcular a margem.</p>}</>}
    {!staff && status === 'ready' && data && <>
      {!professionalId && data.professionals.map((person, index) => <div key={person.id || index} className={`space-y-2 border-t pt-3 ${colors.border}`}><h3 className="text-sm font-bold">{person.name || 'Profissional'}</h3>{metric(person, true)}</div>)}
      {!!data.services?.some(service => service.status === 'loss' || service.status === 'low') && <div className={`space-y-2 border-t pt-3 ${colors.border}`}><h3 className="text-sm font-bold">Serviços para revisar</h3>{data.services.filter(service => service.status === 'loss' || service.status === 'low').map((service, index) => <p key={`${service.name}-${index}`} className="text-sm">{service.name} · {service.status === 'loss' ? 'Dá prejuízo' : 'Rende pouco'}</p>)}</div>}
      {typeof data.services_pending_count === 'number' && data.services_pending_count > 0 && <p className={`text-sm ${colors.textMuted}`}>{data.services_pending_count} {data.services_pending_count === 1 ? 'atendimento sem dados suficientes para avaliar os serviços.' : 'atendimentos sem dados suficientes para avaliar os serviços.'}</p>}
      <Link className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--color-accent)]" to="/configuracoes/financeiro">Configurar custos</Link>
    </>}
  </section></Card>;
}
