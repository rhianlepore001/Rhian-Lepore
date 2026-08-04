import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  calcLoyaltyTier,
  createClient,
  daysUntilBirthday,
  enrichClients,
  filterEnrichedClients,
  findClientByPhone,
  formatVisitAgo,
  getVipClientIds,
  isBirthdaySoon,
  isInactiveClient,
  isNewClient,
  phonesMatch,
  syncPublicClientsToCrm,
} from '@/services/crm';
import { supabase } from '@/lib/supabase';
import type { ClientRecord } from '@/types/crm';

const notMock = vi.fn().mockResolvedValue({ data: [], error: null });
const eqMock = vi.fn(() => ({ not: notMock, eq: eqMock }));
const selectMock = vi.fn(() => ({ eq: eqMock }));
const insertMock = vi.fn().mockResolvedValue({ error: null });

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: selectMock,
      insert: insertMock,
    })),
  },
}));

describe('crm service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notMock.mockResolvedValue({ data: [], error: null });
    insertMock.mockResolvedValue({ error: null });
  });

  it('calcula loyalty tier por visitas', () => {
    expect(calcLoyaltyTier(3)).toBe('Bronze');
    expect(calcLoyaltyTier(8)).toBe('Silver');
    expect(calcLoyaltyTier(20)).toBe('Gold');
    expect(calcLoyaltyTier(35)).toBe('Platinum');
  });

  it('compara telefones ignorando codigo do pais e formatacao', () => {
    expect(phonesMatch('+55 11 98765-4321', '11987654321')).toBe(true);
    expect(phonesMatch('+351 912 345 678', '912345678')).toBe(true);
    expect(phonesMatch('11999999999', '11888888888')).toBe(false);
  });

  it('encontra cliente existente por telefone flexivel', async () => {
    notMock.mockResolvedValue({
      data: [
        {
          id: 'client-001',
          user_id: 'company-001',
          name: 'Joao',
          phone: '+5511987654321',
        },
      ],
      error: null,
    });

    const result = await findClientByPhone('company-001', '11987654321');

    expect(result?.id).toBe('client-001');
  });

  it('bloqueia criacao manual duplicada por telefone', async () => {
    notMock.mockResolvedValue({
      data: [
        {
          id: 'client-001',
          user_id: 'company-001',
          name: 'Joao',
          phone: '+5511987654321',
        },
      ],
      error: null,
    });

    await expect(createClient({
      companyId: 'company-001',
      name: 'Joao',
      phone: '11987654321',
      email: '',
      origin: 'Novo',
    })).rejects.toThrow('Já existe um cliente com este telefone.');

    expect(insertMock).not.toHaveBeenCalled();
  });

  it('cria cliente antigo como Silver e com uma visita inicial', async () => {
    await createClient({
      companyId: 'company-001',
      name: 'Maria',
      phone: '11999999999',
      email: '',
      origin: 'Antigo',
    });

    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'company-001',
      name: 'Maria',
      loyalty_tier: 'Silver',
      total_visits: 1,
      source: 'manual_legacy',
    }));
  });

  it('sincroniza public_clients novos sem duplicar telefone existente', async () => {
    const fromMock = supabase.from as any;
    fromMock
      .mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'public-001',
                business_id: 'company-001',
                name: 'Ana',
                phone: '11987654321',
                email: null,
                photo_url: null,
              },
              {
                id: 'public-002',
                business_id: 'company-001',
                name: 'Bruno',
                phone: '11999999999',
                email: null,
                photo_url: null,
              },
            ],
            error: null,
          }),
        })),
      })
      .mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            not: vi.fn().mockResolvedValue({
              data: [{ phone: '+5511987654321' }],
              error: null,
            }),
          })),
        })),
      })
      .mockReturnValueOnce({
        insert: insertMock,
      });

    const inserted = await syncPublicClientsToCrm('company-001');

    expect(inserted).toBe(1);
    expect(insertMock).toHaveBeenCalledWith([
      expect.objectContaining({
        name: 'Bruno',
        loyalty_tier: 'Bronze',
        total_visits: 0,
        source: 'agendamento_online',
      }),
    ]);
  });

  it('persiste birth_date opcional no create', async () => {
    await createClient({
      companyId: 'company-001',
      name: 'Carla',
      phone: '11988887777',
      email: '',
      birthDate: '1990-05-20',
    });

    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
      birth_date: '1990-05-20',
      source: 'manual',
      loyalty_tier: 'Bronze',
    }));
  });
});

describe('crm segmentation', () => {
  const now = new Date('2026-08-04T12:00:00');

  it('marca inativo com última visita há 35+ dias', () => {
    expect(isInactiveClient(2, '2026-06-30T10:00:00', now)).toBe(true);
    expect(isInactiveClient(2, '2026-07-20T10:00:00', now)).toBe(false);
    expect(isInactiveClient(0, null, now)).toBe(false);
  });

  it('marca novo sem visitas ou 1ª visita em 30 dias', () => {
    expect(isNewClient(0, null, now)).toBe(true);
    expect(isNewClient(1, '2026-07-20T10:00:00', now)).toBe(true);
    expect(isNewClient(3, '2026-06-01T10:00:00', now)).toBe(false);
  });

  it('VIP = top 10 por LTV com gasto > 0', () => {
    const stats = new Map([
      ['a', { visitCount: 2, ltv: 500 }],
      ['b', { visitCount: 5, ltv: 100 }],
      ['c', { visitCount: 1, ltv: 0 }],
      ['d', { visitCount: 0, ltv: 0 }],
    ]);
    const vip = getVipClientIds(stats, 2);
    expect([...vip]).toEqual(['a', 'b']);
    expect(vip.has('c')).toBe(false);
  });

  it('detecta aniversário nos próximos 7 dias', () => {
    expect(daysUntilBirthday('1990-08-04', now)).toBe(0);
    expect(daysUntilBirthday('1990-08-10', now)).toBe(6);
    expect(isBirthdaySoon('1990-08-10', 7, now)).toBe(true);
    expect(isBirthdaySoon('1990-08-20', 7, now)).toBe(false);
  });

  it('formata última visita relativa', () => {
    expect(formatVisitAgo('2026-08-04T09:00:00', now)).toBe('Hoje');
    expect(formatVisitAgo('2026-08-03T09:00:00', now)).toBe('Ontem');
    expect(formatVisitAgo('2026-07-20T09:00:00', now)).toBe('há 15 dias');
    expect(formatVisitAgo(null, now)).toBe('Nunca');
  });

  it('filtra lista enriquecida por segmento e busca', () => {
    const clients: ClientRecord[] = [
      { id: '1', user_id: 'c', name: 'Ana VIP', phone: '111', birth_date: null },
      { id: '2', user_id: 'c', name: 'Bruno Novo', phone: '222', birth_date: null },
      { id: '3', user_id: 'c', name: 'Carla Inativa', phone: '333', birth_date: null },
    ];
    const appointments = [
      { client_id: '1', appointment_time: '2026-08-01T10:00:00', price: 200 },
      { client_id: '1', appointment_time: '2026-07-01T10:00:00', price: 200 },
      { client_id: '2', appointment_time: '2026-07-25T10:00:00', price: 50 },
      { client_id: '3', appointment_time: '2026-06-01T10:00:00', price: 80 },
    ];
    const enriched = enrichClients(clients, appointments, now);

    expect(filterEnrichedClients(enriched, 'VIP', '').map((c) => c.id)).toContain('1');
    expect(filterEnrichedClients(enriched, 'Novos', '').map((c) => c.id)).toContain('2');
    expect(filterEnrichedClients(enriched, 'Inativo', '').map((c) => c.id)).toContain('3');
    expect(filterEnrichedClients(enriched, 'Todos', 'ana').map((c) => c.name)).toEqual(['Ana VIP']);
  });
});
