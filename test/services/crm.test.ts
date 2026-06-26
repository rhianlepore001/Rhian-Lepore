import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  calcLoyaltyTier,
  createClient,
  findClientByPhone,
  phonesMatch,
  syncPublicClientsToCrm,
} from '@/services/crm';
import { supabase } from '@/lib/supabase';

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
});
