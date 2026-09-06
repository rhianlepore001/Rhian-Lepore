import {
  daysUntilSettlement,
  normalizePaymentFrequency,
  scheduleSummary,
  type CommissionPaymentFrequency,
} from './commissionSchedule';

export interface CommissionReminderMember {
  id: string;
  name: string;
  is_owner?: boolean | null;
  commission_payment_frequency?: CommissionPaymentFrequency | string | null;
  commission_payment_day?: number | null;
}

export interface CommissionReminderAlert {
  id: string;
  text: string;
  type: 'warning' | 'danger';
  actionPath: string;
}

const ACTION_PATH = '/financeiro?tab=commissions';

export function buildCommissionReminderAlerts(input: {
  universalEnabled: boolean;
  settlementDay: number | null | undefined;
  members: CommissionReminderMember[];
  dueByProfessional: Record<string, number>;
  formatMoney: (value: number) => string;
  today?: Date;
  windowDays?: number;
}): CommissionReminderAlert[] {
  const today = input.today ?? new Date();
  const windowDays = input.windowDays ?? 2;
  const staffWithDue = input.members.filter((member) => {
    if (member.is_owner) return false;
    return (input.dueByProfessional[member.id] ?? 0) > 0;
  });

  if (staffWithDue.length === 0) return [];

  if (input.universalEnabled) {
    const settlementDay = input.settlementDay ?? 5;
    const remaining = daysUntilSettlement('monthly', settlementDay, today);
    if (remaining < 0 || remaining > windowDays) return [];

    const totalDue = staffWithDue.reduce(
      (sum, member) => sum + (input.dueByProfessional[member.id] ?? 0),
      0,
    );

    if (remaining === 0) {
      return [{
        id: 'commission-settlement-today',
        text: `Hoje é dia de acerto de comissões! Total pendente: ${input.formatMoney(totalDue)}`,
        type: 'danger',
        actionPath: ACTION_PATH,
      }];
    }

    return [{
      id: 'commission-settlement-warning',
      text: `Acerto de comissões se aproxima! Dia ${settlementDay} será o dia do acerto.`,
      type: 'warning',
      actionPath: ACTION_PATH,
    }];
  }

  const alerts: CommissionReminderAlert[] = [];
  for (const member of staffWithDue) {
    const frequency = normalizePaymentFrequency(member.commission_payment_frequency);
    const day = member.commission_payment_day;
    const remaining = daysUntilSettlement(frequency, day, today);
    if (remaining < 0 || remaining > windowDays) continue;

    const due = input.dueByProfessional[member.id] ?? 0;
    if (remaining === 0) {
      alerts.push({
        id: `commission-settlement-today-${member.id}`,
        text: `Hoje é dia de acerto de ${member.name}. Pendente: ${input.formatMoney(due)}`,
        type: 'danger',
        actionPath: ACTION_PATH,
      });
    } else {
      alerts.push({
        id: `commission-settlement-warning-${member.id}`,
        text: `Acerto de ${member.name} se aproxima (${scheduleSummary(frequency, day)}).`,
        type: 'warning',
        actionPath: ACTION_PATH,
      });
    }
  }

  return alerts;
}

export function isAnyCommissionSettlementTomorrow(input: {
  universalEnabled: boolean;
  settlementDay: number | null | undefined;
  members: CommissionReminderMember[];
  dueByProfessional?: Record<string, number>;
  today?: Date;
}): boolean {
  const today = input.today ?? new Date();
  const due = input.dueByProfessional;

  if (input.universalEnabled) {
    const hasDue = !due || Object.values(due).some((value) => value > 0);
    return hasDue && daysUntilSettlement('monthly', input.settlementDay ?? 5, today) === 1;
  }

  return input.members.some((member) => {
    if (member.is_owner) return false;
    if (due && (due[member.id] ?? 0) <= 0) return false;
    return daysUntilSettlement(
      member.commission_payment_frequency,
      member.commission_payment_day,
      today,
    ) === 1;
  });
}
