import React from 'react';
import { Link } from 'react-router-dom';
import { Card, Button } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessCopy } from '@/hooks/useBusinessCopy';
import { useChairHour, type ChairHourData, type HourMetrics } from '@/hooks/useChairHour';
import { useTenantLocale } from '@/hooks/useTenantLocale';
import { formatHours, isNumber, outOfTen, periodLabel, pickTip, previousPeriod } from '@/utils/chairHourCopy';

interface Props { month: string; endDate?: string | null; professionalId?: string | null }
type Money = (value: number | null | undefined) => string;

const SETTINGS = '/configuracoes/financeiro';
const muted = 'text-theme-textSecondary';
const tile = 'relative rounded-xl border border-[var(--color-border)] bg-[var(--color-card-elevated)] p-4';

/** "?" que abre uma explicação curta com exemplo. Usa <details> nativo: teclado e leitor de tela já funcionam. */
function Help({ label, children }: { label: string; children: React.ReactNode }) {
  return <details className="group">
    <summary aria-label={`O que é "${label}"?`} className="absolute right-1 top-1 flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] [&::-webkit-details-marker]:hidden">
      <span aria-hidden="true" className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--color-border-strong)] text-xs font-bold text-theme-textSecondary group-open:border-[var(--color-accent-border)] group-open:text-[var(--color-accent)]">?</span>
    </summary>
    <div className="mt-3 rounded-lg bg-[var(--color-card)] p-3 text-sm leading-relaxed text-theme-text">{children}</div>
  </details>;
}

function Quality({ estimated, historical }: { estimated: number | null | undefined; historical?: boolean }) {
  const count = isNumber(estimated) ? estimated : 0;
  const text = historical ? 'Período antigo: horários estimados'
    : count > 0 ? `Agenda: ${count} ${count === 1 ? 'tempo estimado' : 'tempos estimados'}`
      : 'Tempos informados no fechamento';
  return <p title="Tempo estimado vem da agenda; tempo informado é o ajustado no fechamento." className="inline-flex min-h-7 items-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--color-border-strong)] px-2.5 text-xs font-medium text-theme-textSecondary">
    <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${count > 0 || historical ? 'bg-[var(--color-warning)]' : 'bg-[var(--color-success)]'}`} />
    {text}
  </p>;
}

function TenBar({ occupancy, label }: { occupancy: number | null | undefined; label: string }) {
  const filled = isNumber(occupancy) ? Math.round(Math.min(Math.max(occupancy, 0), 1) * 10) : 0;
  return <div role="img" aria-label={label} className="grid grid-cols-10 gap-1">
    {Array.from({ length: 10 }, (_, index) => <span key={index} className={`h-2.5 rounded-sm ${index < filled ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border-strong)]'}`} />)}
  </div>;
}

function Occupancy({ item, who, previous, since = '' }: { item: HourMetrics; who: string; previous?: HourMetrics | null; since?: string }) {
  const ratio = outOfTen(item.occupancy);
  const worked = formatHours(item.worked_minutes), open = formatHours(item.available_minutes);
  if (!ratio) return <p className={`text-sm ${muted}`}>Sem horário de trabalho registrado neste período, então não dá para medir as horas vazias.</p>;
  const before = outOfTen(previous?.occupancy);
  return <div className="space-y-2">
    <p className="text-base font-semibold text-theme-text">{who} em <span className="tabular-nums">{ratio}</span> horas abertas</p>
    <TenBar occupancy={item.occupancy} label={`${ratio} horas abertas com cliente`} />
    <p className={`text-sm tabular-nums ${muted}`}>{worked} atendendo de {open} abertas</p>
    {before && <p className={`text-sm tabular-nums ${muted}`}>No {since}: {before}</p>}
  </div>;
}

function Row({ label, value, note, help, tone }: { label: string; value: string; note: string; help: React.ReactNode; tone?: 'good' | 'bad' }) {
  const color = tone === 'good' ? 'text-[var(--color-success)]' : tone === 'bad' ? 'text-[var(--color-danger)]' : 'text-theme-text';
  return <li className="relative py-3 pl-3 pr-12">
    <p className="text-sm font-semibold text-theme-text">{label}</p>
    <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
    <p className={`text-xs ${muted}`}>{note}</p>
    <Help label={label}>{help}</Help>
  </li>;
}

function Skeleton() {
  return <div role="status" aria-label="Carregando resultados" className="space-y-3">
    {['h-24', 'h-14', 'h-20'].map(height => <div key={height} className={`${height} animate-pulse rounded-xl bg-[var(--color-card-hover)] motion-reduce:animate-none`} />)}
    <span className="sr-only">Carregando resultados...</span>
  </div>;
}

function Cta({ to, children }: { to: string; children: React.ReactNode }) {
  return <Link to={to} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--color-accent-border)] px-4 text-sm font-semibold text-[var(--color-accent)] hover:bg-[var(--color-accent-dim)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]">{children}</Link>;
}

function OwnerHero({ item, money }: { item: HourMetrics; money: Money }) {
  const open = item.revenue_per_available_hour, need = item.cost_per_hour, left = item.margin_per_hour;
  const hasOpen = isNumber(open) && (item.available_minutes ?? 0) > 0;
  if (!hasOpen) return <div>
    <p className={`text-sm font-medium ${muted}`}>Cada hora atendendo rendeu</p>
    <p className="text-4xl font-bold tabular-nums text-theme-text">{money(item.revenue_per_worked_hour)}</p>
  </div>;
  const max = Math.max(open, isNumber(need) ? need : 0, 1);
  return <div className="space-y-3">
    <div>
      <p className={`text-sm font-medium ${muted}`}>Cada hora aberta rendeu</p>
      <p className="text-4xl font-bold tabular-nums text-theme-text">{money(open)}</p>
    </div>
    {isNumber(need) ? <>
      <div aria-hidden="true" className="grid grid-cols-[4.5rem_1fr] items-center gap-x-2 gap-y-1.5 text-xs text-theme-textSecondary">
        <span>Rendeu</span><div className="h-2.5 rounded-full bg-[var(--color-accent)]" style={{ width: `${Math.max(4, (open / max) * 100)}%` }} />
        <span>Precisa</span><div className="h-2.5 rounded-full bg-[var(--color-text-secondary)] opacity-60" style={{ width: `${Math.max(4, (need / max) * 100)}%` }} />
      </div>
      <p className="text-base leading-snug text-theme-text">Para pagar as contas, cada hora aberta precisa render <strong className="tabular-nums">{money(need)}</strong>.{' '}
        {isNumber(left) && (left >= 0
          ? <span>Sobrou cerca de <strong className="tabular-nums text-[var(--color-success)]">{money(left)}</strong> por hora.</span>
          : <span>Faltaram cerca de <strong className="tabular-nums text-[var(--color-danger)]">{money(-left)}</strong> por hora.</span>)}
      </p>
    </> : <p className="text-base leading-snug text-theme-text">Ainda não dá para dizer se paga as contas. Confira as contas do mês, os horários e os atendimentos.</p>}
  </div>;
}

function Tiles({ item, money }: { item: HourMetrics; money: Money }) {
  const left = item.margin_per_hour;
  return <section aria-labelledby="chair-three" className="space-y-2">
    <h3 id="chair-three" className="text-base font-semibold text-theme-text">Os três números da hora</h3>
    <ul className="divide-y divide-[var(--color-border)] rounded-xl border border-[var(--color-border)] bg-[var(--color-card-elevated)]">
      <Row label="Rende por hora aberta" value={money(item.revenue_per_available_hour)} note="Conta também as horas vazias" help={<>Tudo o que os atendimentos renderam dividido por <strong>todas</strong> as horas em que a agenda estava aberta, até as vazias. Exemplo: R$ 600 em 10 horas abertas = R$ 60 por hora.</>} />
      <Row label="Rende por hora atendendo" value={money(item.revenue_per_worked_hour)} note="Só as horas com cliente" help={<>O mesmo valor dividido só pelas horas com cliente. Exemplo: R$ 600 em 7 horas atendendo = cerca de R$ 86 por hora.</>} />
      <Row label="Sobra estimada por hora" value={money(left)} note={isNumber(left) ? 'Depois das contas, comissões, material e taxas' : 'Falta informação para calcular'} tone={isNumber(left) ? (left >= 0 ? 'good' : 'bad') : undefined} help={<>Quanto fica de cada hora aberta depois de pagar as contas do mês, comissões, material e taxa da maquininha. É uma estimativa e não substitui o fechamento do caixa. Exemplo: rendeu R$ 60 e precisava de R$ 38 = sobra de R$ 22.</>} />
    </ul>
  </section>;
}

function IdleHours({ item, money }: { item: HourMetrics; money: Money }) {
  if (!isNumber(item.idle_cost) || !isNumber(item.available_minutes) || !isNumber(item.worked_minutes)) return null;
  const idle = formatHours(Math.max(item.available_minutes - item.worked_minutes, 0));
  return <div className={tile}>
    <p className={`pr-10 text-sm font-medium ${muted}`}>Horas vazias</p>
    <p className="mt-1 text-base leading-snug text-theme-text"><strong className="tabular-nums">{idle}</strong> sem cliente usaram <strong className="tabular-nums">{money(item.idle_cost)}</strong> das contas do mês.</p>
    <p className={`mt-1 text-sm ${muted}`}>Não é gasto a mais: são contas que você já paga. Encher esses horários faz sobrar mais.</p>
    <Help label="Horas vazias">O aluguel, a luz e as outras contas são pagas com a agenda cheia ou vazia. Esse valor mostra a parte delas que caiu em horas sem cliente. Exemplo: se cada hora precisa de R$ 38 e ficaram 3 horas vazias, R$ 114 das contas não foram cobertos por atendimentos.</Help>
  </div>;
}

const STATUS_COPY: Record<string, { label: string; help: string; tone: string }> = {
  loss: { label: 'Não cobre o custo da hora', tone: 'border-[var(--color-danger-border)] bg-[var(--color-danger-bg)]', help: 'Somando material, comissão, taxa e a parte das contas pelo tempo que ele ocupa, o preço não pagou a hora. É uma estimativa: confira se o material e as contas estão informados antes de mudar o preço.' },
  low: { label: 'Sobra pouco', tone: 'border-[var(--color-warning-border)] bg-[var(--color-warning-bg)]', help: 'O preço paga a hora, mas sobra menos do que o limite definido nas configurações. É uma estimativa feita com os dados informados.' },
};

function Services({ data }: { data: ChairHourData }) {
  const flagged = (data.services ?? []).filter(service => service.status === 'loss' || service.status === 'low');
  const pending = data.services_pending_count ?? 0;
  if (!flagged.length && pending <= 0) return null;
  return <section aria-labelledby="chair-services" className="space-y-2">
    <h3 id="chair-services" className="text-base font-semibold text-theme-text">Serviços para olhar o preço</h3>
    <ul className="space-y-2">
      {flagged.map((service, index) => { const copy = STATUS_COPY[service.status as string]; return <li key={`${service.name}-${index}`} className={`relative rounded-xl border p-3 pr-12 ${copy.tone}`}>
        <p className="text-sm font-semibold text-theme-text">{service.name}</p>
        <p className="text-sm text-theme-text">{copy.label} <span className={muted}>· estimado</span></p>
        <Help label={copy.label}>{copy.help}</Help>
      </li>; })}
    </ul>
    {pending > 0 && <p className={`text-sm ${muted}`}>{pending} {pending === 1 ? 'atendimento ficou' : 'atendimentos ficaram'} de fora por falta de dados (vários serviços juntos ou sem material). Não entram nessa lista.</p>}
  </section>;
}

function Team({ people, money }: { people: HourMetrics[]; money: Money }) {
  if (!people.length) return null;
  return <section aria-labelledby="chair-team" className="space-y-2">
    <h3 id="chair-team" className="text-base font-semibold text-theme-text">Por profissional</h3>
    <ul className="divide-y divide-[var(--color-border)] rounded-xl border border-[var(--color-border)]">
      {people.map((person, index) => { const ratio = outOfTen(person.occupancy); return <li key={person.id || index} className="space-y-2 p-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="min-w-0 text-sm font-semibold text-theme-text">{person.name || 'Profissional'}</p>
          <p className="text-sm tabular-nums text-theme-text"><strong>{money(person.revenue_per_worked_hour)}</strong> <span className={muted}>por hora atendendo</span></p>
        </div>
        {ratio && <TenBar occupancy={person.occupancy} label={`${person.name || 'Profissional'} atendeu em ${ratio} horas abertas`} />}
        <p className={`text-xs tabular-nums ${muted}`}>{ratio ? `Atendeu em ${ratio} horas abertas` : 'Sem horário registrado no período'}{(person.estimated_count ?? 0) > 0 ? ` · ${person.estimated_count} pela agenda` : ''}</p>
      </li>; })}
    </ul>
  </section>;
}

function OwnerView({ data, item, professionalId, money }: { data: ChairHourData; item: HourMetrics | null | undefined; professionalId: string | null; money: Money }) {
  if (!item || (item.available_minutes == null && !(item.worked_minutes ?? 0))) return <div className="space-y-3">
    <p className="text-base text-theme-text">Defina os horários de trabalho para ver quanto cada hora rende.</p>
    <Cta to={SETTINGS}>Definir horários</Cta>
  </div>;
  const lossService = data.services?.find(service => service.status === 'loss')?.name ?? null;
  const tip = pickTip({ availableMinutes: item.available_minutes, occupancy: item.occupancy, costPerHour: item.cost_per_hour, marginPerHour: item.margin_per_hour, lossService });
  const who = professionalId ? `${item.name || 'O profissional'} atendeu` : 'A equipe atendeu';
  return <div className="space-y-5">
    {item.available_minutes === 0 && <p className="rounded-xl border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] p-3 text-sm text-theme-text">Não houve horas abertas neste período. Confira os horários e bloqueios.</p>}
    <OwnerHero item={item} money={money} />
    {tip && <p className="rounded-xl bg-[var(--color-accent-dim)] p-3 text-sm font-medium leading-snug text-theme-text"><span className="font-bold">Dica: </span>{tip}</p>}
    {(item.available_minutes ?? 0) > 0 && item.cost_per_hour == null && <Cta to={SETTINGS}>Conferir contas e horários</Cta>}
    <Occupancy item={item} who={who} />
    <Tiles item={item} money={money} />
    <IdleHours item={item} money={money} />
    {!professionalId && <Team people={data.professionals} money={money} />}
    <Services data={data} />
    {(data.unassigned_attendance_count ?? 0) > 0 && <p className={`text-sm ${muted}`}>{data.unassigned_attendance_count} atendimentos sem profissional marcado ficaram fora das contas por hora.</p>}
    {data.history_estimated && <p className={`text-sm ${muted}`}>Período antigo: os horários e materiais usam a configuração do início do sistema. O que faltar fica sem avaliação.</p>}
    <Link to={SETTINGS} className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--color-accent)] underline-offset-4 hover:underline">Ajustar contas, horários e material</Link>
  </div>;
}

function Change({ now, before, money, since }: { now: number | null | undefined; before: number | null | undefined; money: Money; since: string }) {
  if (!isNumber(now) || !isNumber(before)) return null;
  const diff = now - before;
  if (Math.abs(diff) < 0.005) return <p className={`text-sm ${muted}`}>Igual ao que rendeu {since}.</p>;
  return <p className="text-sm text-theme-text"><span className={`font-semibold tabular-nums ${diff > 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>{diff > 0 ? '↑' : '↓'} {money(Math.abs(diff))}</span> <span className={muted}>{diff > 0 ? 'a mais' : 'a menos'} que {since} ({money(before)})</span></p>;
}

function StaffView({ item, previous, teamMemberId, money, monthly }: { item: HourMetrics | null | undefined; previous: HourMetrics | null | undefined; teamMemberId: string | null | undefined; money: Money; monthly: boolean }) {
  const since = monthly ? 'no mês anterior' : 'no período anterior';
  if (!teamMemberId) return <p className="text-base text-theme-text">Perfil ainda não vinculado. Peça ao responsável para adicionar você à equipe.</p>;
  if (!item || (item.available_minutes == null && !(item.worked_minutes ?? 0))) return <p className="text-base text-theme-text">Peça ao responsável para definir seus horários de trabalho. Depois disso seus números aparecem aqui.</p>;
  return <div className="space-y-5">
    {item.available_minutes === 0 && <p className="rounded-xl border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] p-3 text-sm text-theme-text">Não houve horas abertas neste período. Confira seus horários com o responsável.</p>}
    <div className="space-y-1">
      <p className={`text-sm font-medium ${muted}`}>Cada hora atendendo rendeu</p>
      <p className="text-4xl font-bold tabular-nums text-theme-text">{money(item.revenue_per_worked_hour)}</p>
      <Change now={item.revenue_per_worked_hour} before={previous?.revenue_per_worked_hour} money={money} since={since} />
    </div>
    <Occupancy item={item} who="Você atendeu" previous={previous} since={monthly ? 'mês anterior' : 'período anterior'} />
    <p className={`rounded-xl border border-[var(--color-border)] p-3 text-sm ${muted}`}>É o valor dos serviços que você fez. <strong className="text-theme-text">Não é sua comissão nem seu salário.</strong></p>
  </div>;
}

export function ChairHourCard({ month, endDate = null, professionalId = null }: Props) {
  const { role, teamMemberId } = useAuth();
  const { chairHour } = useBusinessCopy();
  const { formatMoney } = useTenantLocale();
  const staff = role === 'staff';
  const prev = previousPeriod(month, endDate);
  const { data, status, retry } = useChairHour(month, professionalId, endDate);
  const { data: before } = useChairHour(prev?.start ?? month, null, prev?.end ?? null, { enabled: staff && !!prev });
  const money: Money = value => isNumber(value) ? formatMoney(value) : '—';
  const mine = (source: ChairHourData | null) => source?.professionals?.find(person => person.id === teamMemberId);
  const selected = staff ? mine(data) : professionalId ? data?.professionals?.find(person => person.id === professionalId) : data?.total;
  const estimatedCount = selected?.estimated_count;
  return <Card><section className="space-y-4" aria-label={staff ? 'Sua agenda' : `Sua ${chairHour}`}>
    <header className="flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0">
        <h2 className="text-lg font-bold text-theme-text">{staff ? 'Sua agenda' : `Sua ${chairHour}`}</h2>
        <p className={`text-sm ${muted}`}>{periodLabel(month, endDate)}</p>
      </div>
      {status === 'ready' && selected && <Quality estimated={estimatedCount} historical={data?.history_estimated} />}
    </header>
    {status === 'loading' && <Skeleton />}
    {status === 'error' && <div className="space-y-3"><p className="text-base text-theme-text">Não foi possível carregar os resultados.</p><Button variant="secondary" onClick={retry}>Tentar novamente</Button></div>}
    {status === 'ready' && (staff
      ? <StaffView item={selected} previous={mine(before)} teamMemberId={teamMemberId} money={money} monthly={!endDate} />
      : data ? <OwnerView data={data} item={selected} professionalId={professionalId} money={money} /> : <OwnerView data={{ month, role: 'owner', professionals: [] }} item={null} professionalId={professionalId} money={money} />)}
  </section></Card>;
}
