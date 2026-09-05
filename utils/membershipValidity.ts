import type { MembershipStatus } from '../services/memberships';

export function effectiveMembershipStatus(
  stored: MembershipStatus,
  nextBillingAt: string | null,
  now: Date = new Date()
): MembershipStatus {
  if (stored === 'active' && nextBillingAt && new Date(nextBillingAt).getTime() < now.getTime()) {
    return 'overdue';
  }
  return stored;
}

export function daysRemaining(endIso: string | null, now: Date = new Date()): number | null {
  if (!endIso) return null;
  const end = new Date(endIso).getTime();
  if (Number.isNaN(end)) return null;
  return Math.ceil((end - now.getTime()) / (24 * 60 * 60 * 1000));
}

export function periodProgressPercent(
  startIso: string | null,
  endIso: string | null,
  now: Date = new Date()
): number | null {
  if (!startIso || !endIso) return null;
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return null;
  const ratio = (now.getTime() - start) / (end - start);
  return Math.min(100, Math.max(0, Math.round(ratio * 100)));
}

export function formatDatePt(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function validityHeadline(
  status: MembershipStatus,
  periodEnd: string | null,
  now: Date = new Date()
): string {
  const days = daysRemaining(periodEnd, now);
  if (status === 'pending') return 'Pagamento pendente — o plano só vale depois da confirmação';
  if (status === 'cancelled') return 'Plano cancelado';
  if (status === 'overdue') {
    return periodEnd ? `Venceu em ${formatDatePt(periodEnd)}` : 'Assinatura atrasada';
  }
  if (!periodEnd) return 'Assinatura ativa';
  if (days === null) return `Válido até ${formatDatePt(periodEnd)}`;
  if (days < 0) return `Venceu em ${formatDatePt(periodEnd)}`;
  if (days === 0) return `Válido até hoje · ${formatDatePt(periodEnd)}`;
  if (days === 1) return `Válido até ${formatDatePt(periodEnd)} · 1 dia restante`;
  return `Válido até ${formatDatePt(periodEnd)} · ${days} dias restantes`;
}
