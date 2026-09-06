import { describe, expect, it } from 'vitest';
import {
  buildCommissionReminderAlerts,
  isAnyCommissionSettlementTomorrow,
} from '@/utils/commissionReminders';

const formatMoney = (value: number) => `€${value.toFixed(2)}`;

const ana = {
  id: 'ana',
  name: 'Ana',
  is_owner: false,
  commission_payment_frequency: 'weekly' as const,
  commission_payment_day: 5,
};

const bruno = {
  id: 'bruno',
  name: 'Bruno',
  is_owner: false,
  commission_payment_frequency: 'biweekly' as const,
  commission_payment_day: 7,
};

const owner = {
  id: 'owner',
  name: 'Dono',
  is_owner: true,
  commission_payment_frequency: 'monthly' as const,
  commission_payment_day: 5,
};

describe('commissionReminders', () => {
  it('lembrete universal ignora datas individuais e o dono', () => {
    const sunday = new Date(2026, 8, 6);
    const alerts = buildCommissionReminderAlerts({
      universalEnabled: true,
      settlementDay: 8,
      members: [ana, bruno, owner],
      dueByProfessional: { ana: 10, bruno: 20, owner: 999 },
      formatMoney,
      today: sunday,
    });

    expect(alerts).toHaveLength(1);
    expect(alerts[0].id).toBe('commission-settlement-warning');
    expect(alerts[0].text).toContain('Dia 8');
  });

  it('lembrete individual usa a agenda de cada colaborador com saldo', () => {
    const sunday = new Date(2026, 8, 6);
    const alerts = buildCommissionReminderAlerts({
      universalEnabled: false,
      settlementDay: 5,
      members: [ana, bruno, owner],
      dueByProfessional: { ana: 0, bruno: 45, owner: 10 },
      formatMoney,
      today: sunday,
    });

    expect(alerts).toHaveLength(1);
    expect(alerts[0].id).toContain('bruno');
    expect(alerts[0].text).toContain('Bruno');
    expect(alerts[0].text).toContain('Quinzenal');
  });

  it('nao gera alerta sem comissao pendente', () => {
    const alerts = buildCommissionReminderAlerts({
      universalEnabled: false,
      settlementDay: 5,
      members: [bruno],
      dueByProfessional: { bruno: 0 },
      formatMoney,
      today: new Date(2026, 8, 6),
    });
    expect(alerts).toEqual([]);
  });

  it('detecta acerto amanha no modo individual', () => {
    const sunday = new Date(2026, 8, 6);
    expect(isAnyCommissionSettlementTomorrow({
      universalEnabled: false,
      settlementDay: 31,
      members: [bruno],
      dueByProfessional: { bruno: 12 },
      today: sunday,
    })).toBe(true);
  });
});
