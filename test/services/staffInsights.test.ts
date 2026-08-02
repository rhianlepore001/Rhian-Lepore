import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  aggregateStaffProducts,
  aggregateStaffServices,
  fetchStaffInsights,
  resolveStaffPeriodRange,
} from '@/services/staffInsights';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

function mockQueryResult(data: unknown, error: unknown = null) {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  builder.select = vi.fn(chain);
  builder.eq = vi.fn(chain);
  builder.gte = vi.fn(chain);
  builder.lte = vi.fn(chain);
  builder.in = vi.fn(chain);
  builder.order = vi.fn().mockResolvedValue({ data, error });
  return builder;
}

describe('staffInsights service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolveStaffPeriodRange cobre dia, semana e mês histórico', () => {
    const now = new Date(2026, 7, 2, 15, 0, 0); // 2 ago 2026

    const day = resolveStaffPeriodRange('day', 7, 2026, now);
    expect(day.label).toBe('Hoje');
    expect(day.start).toBe('2026-08-02T00:00:00');
    expect(day.end).toBe('2026-08-02T23:59:59');

    const week = resolveStaffPeriodRange('week', 7, 2026, now);
    expect(week.label).toBe('Esta semana');
    expect(week.start).toBe('2026-08-02T00:00:00'); // domingo
    expect(week.end).toBe('2026-08-08T23:59:59');

    const pastMonth = resolveStaffPeriodRange('month', 5, 2026, now);
    expect(pastMonth.start).toBe('2026-06-01T00:00:00');
    expect(pastMonth.end).toBe('2026-06-30T23:59:59');
    expect(pastMonth.label.toLowerCase()).toContain('junho');
  });

  it('aggregateStaffServices lista todos os serviços ordenados por volume', () => {
    const rows = aggregateStaffServices([
      {
        id: '1',
        service: 'Corte',
        clientName: 'A',
        appointmentTime: '2026-08-01T10:00:00',
        price: 50,
        commissionValue: 20,
      },
      {
        id: '2',
        service: 'Barba',
        clientName: 'B',
        appointmentTime: '2026-08-01T11:00:00',
        price: 30,
        commissionValue: 12,
      },
      {
        id: '3',
        service: 'Corte',
        clientName: 'C',
        appointmentTime: '2026-08-01T12:00:00',
        price: 50,
        commissionValue: 20,
      },
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBe('Corte');
    expect(rows[0].count).toBe(2);
    expect(rows[0].commission).toBe(40);
    expect(rows[1].name).toBe('Barba');
  });

  it('aggregateStaffProducts soma unidades e estoque', () => {
    const rows = aggregateStaffProducts([
      {
        id: 's1',
        productName: 'Pomada',
        clientName: null,
        quantity: 2,
        totalRevenue: 80,
        commissionValue: 8,
        stockQuantity: 5,
        createdAt: '2026-08-01T10:00:00',
      },
      {
        id: 's2',
        productName: 'Pomada',
        clientName: 'Cliente',
        quantity: 1,
        totalRevenue: 40,
        commissionValue: 4,
        stockQuantity: 4,
        createdAt: '2026-08-01T12:00:00',
      },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0].count).toBe(3);
    expect(rows[0].revenue).toBe(120);
    expect(rows[0].commission).toBe(12);
    expect(rows[0].stockQuantity).toBe(4);
  });

  it('fetchStaffInsights filtra por professional_id e company_id', async () => {
    const appointments = [
      {
        id: 'apt-1',
        service: 'Corte',
        price: 80,
        appointment_time: '2026-08-01T14:00:00',
        status: 'Completed',
        clients: { name: 'João' },
        finance_records: [{ id: 'fr-1', commission_value: 32, type: 'revenue' }],
      },
    ];
    const products = [
      {
        id: 'sale-1',
        created_at: '2026-08-01T15:00:00',
        quantity: 1,
        total_revenue: 40,
        commission_value: 4,
        finance_record_id: 'fr-prod',
        products: { id: 'p1', name: 'Shampoo', stock_quantity: 9 },
        clients: { name: 'João' },
      },
    ];

    const fromMock = vi.mocked(supabase.from);
    fromMock
      .mockReturnValueOnce(mockQueryResult(appointments) as never)
      .mockReturnValueOnce(mockQueryResult(products) as never)
      .mockReturnValueOnce(mockQueryResult([{ commission_value: 36 }]) as never)
      .mockReturnValueOnce(mockQueryResult([]) as never);

    const result = await fetchStaffInsights({
      companyId: 'company-001',
      professionalId: 'pro-001',
      period: 'month',
      selectedMonth: 7,
      selectedYear: 2026,
    });

    expect(fromMock).toHaveBeenCalledWith('appointments');
    expect(fromMock).toHaveBeenCalledWith('product_sales');
    expect(fromMock).toHaveBeenCalledWith('finance_records');

    const aptBuilder = fromMock.mock.results[0].value as {
      eq: ReturnType<typeof vi.fn>;
    };
    expect(aptBuilder.eq).toHaveBeenCalledWith('professional_id', 'pro-001');
    expect(aptBuilder.eq).toHaveBeenCalledWith('user_id', 'company-001');

    const productBuilder = fromMock.mock.results[1].value as {
      eq: ReturnType<typeof vi.fn>;
    };
    expect(productBuilder.eq).toHaveBeenCalledWith('professional_id', 'pro-001');
    expect(productBuilder.eq).toHaveBeenCalledWith('company_id', 'company-001');

    expect(result.summary.appointmentsCount).toBe(1);
    expect(result.summary.productsUnits).toBe(1);
    expect(result.summary.commissionsTotal).toBe(36);
    expect(result.services[0].name).toBe('Corte');
    expect(result.products[0].name).toBe('Shampoo');
    expect(result.recentServices[0].clientName).toBe('João');
  });
});
