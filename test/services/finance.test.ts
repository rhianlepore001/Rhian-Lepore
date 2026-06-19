import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  calcCommission,
  calcSettlementDate,
  deleteFinanceTransaction,
  fetchDropdownOptions,
  fetchFinanceStats,
  fetchMonthlyHistory,
  filterStaffTransactions,
  mapFinanceTransaction,
  markExpenseAsPaid,
} from '@/services/finance';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ data: {}, error: null }),
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    }),
  },
}));

describe('finance service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.rpc as any).mockResolvedValue({ data: { revenue: 100 }, error: null });
  });

  it('calcula comissao descontando taxa de maquininha quando habilitada', () => {
    expect(calcCommission({
      price: 100,
      commissionRate: 40,
      machineFeeEnabled: true,
      machineFeeAmount: 3,
    })).toEqual({
      commissionBase: 97,
      commissionValue: 38.8,
    });
  });

  it('mantem base cheia quando taxa de maquininha nao entra na comissao', () => {
    expect(calcCommission({
      price: 100,
      commissionRate: 40,
      machineFeeEnabled: false,
      machineFeeAmount: 3,
    })).toEqual({
      commissionBase: 100,
      commissionValue: 40,
    });
  });

  it('usa ultimo dia do mes quando dia de acerto nao existe', () => {
    const date = calcSettlementDate(2026, 3, 31);

    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(3);
    expect(date.getDate()).toBe(30);
  });

  it('chama get_finance_stats com professional_id para staff', async () => {
    const result = await fetchFinanceStats({
      companyId: 'company-001',
      startDate: '2026-05-01',
      endDate: '2026-05-31',
      professionalId: 'pro-001',
    });

    expect(result).toEqual({ revenue: 100 });
    expect(supabase.rpc).toHaveBeenCalledWith('get_finance_stats', {
      p_user_id: 'company-001',
      p_start_date: '2026-05-01',
      p_end_date: '2026-05-31',
      p_professional_id: 'pro-001',
    });
  });

  it('mapeia transacao preservando professional_id', () => {
    const transaction = mapFinanceTransaction({
      id: 'fin-001',
      created_at: '2026-05-30T10:00:00.000Z',
      service_name: 'Corte',
      barber_name: 'Ana',
      professional_id: 'pro-001',
      client_name: 'Joao',
      amount: 80,
      expense: 0,
      type: 'revenue',
      payment_method: 'pix',
      commission_paid: true,
      status: 'paid',
    });

    expect(transaction.professionalId).toBe('pro-001');
    expect(transaction.professionalName).toBe('Ana');
    expect(transaction.type).toBe('revenue');
  });

  it('filtra staff por professional_id e nunca por nome', () => {
    const transactions = [
      mapFinanceTransaction({
        id: 'fin-001',
        created_at: '2026-05-30T10:00:00.000Z',
        service_name: 'Corte',
        barber_name: 'Mesmo Nome',
        professional_id: 'pro-001',
        client_name: 'Joao',
        amount: 80,
        expense: 0,
        type: 'revenue',
        commission_paid: true,
      }),
      mapFinanceTransaction({
        id: 'fin-002',
        created_at: '2026-05-30T11:00:00.000Z',
        service_name: 'Barba',
        barber_name: 'Mesmo Nome',
        professional_id: 'pro-002',
        client_name: 'Pedro',
        amount: 50,
        expense: 0,
        type: 'revenue',
        commission_paid: true,
      }),
    ];

    expect(filterStaffTransactions(transactions, 'pro-001').map(t => t.id)).toEqual(['fin-001']);
  });

  it('chama get_monthly_finance_history com companyId', async () => {
    (supabase.rpc as any).mockResolvedValueOnce({
      data: [{ month_name: 'Maio', year_num: 2026, revenue: 5000, expenses: 1000, profit: 4000 }],
      error: null,
    });

    const result = await fetchMonthlyHistory('company-001', 6);
    expect(result).toHaveLength(1);
    expect(supabase.rpc).toHaveBeenCalledWith('get_monthly_finance_history', {
      p_user_id: 'company-001',
      p_months_count: 6,
    });
  });

  it('chama mark_expense_as_paid com recordId e companyId', async () => {
    (supabase.rpc as any).mockResolvedValueOnce({ data: null, error: null });
    await markExpenseAsPaid('rec-001', 'company-001');
    expect(supabase.rpc).toHaveBeenCalledWith('mark_expense_as_paid', {
      p_record_id: 'rec-001',
      p_user_id: 'company-001',
    });
  });

  it('deleteFinanceTransaction exclui finance_record com appointment vinculado', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { appointment_id: 'apt-001' },
              error: null,
            }),
          }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    });
    (supabase.from as any).mockImplementation(mockFrom);

    await deleteFinanceTransaction('fin-001', 'company-001');
    expect(supabase.from).toHaveBeenCalledWith('finance_records');
    expect(supabase.from).toHaveBeenCalledWith('appointments');
  });
});
