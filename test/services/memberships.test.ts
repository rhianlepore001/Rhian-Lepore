import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cancelMembership,
  confirmMembershipPayment,
  fetchClientActiveMembership,
} from '@/services/memberships';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

const fromMock = supabase.from as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('memberships service — fetchClientActiveMembership', () => {
  it('retorna a membership ativa do cliente com plano', async () => {
    const membership = {
      id: 'ms-1',
      user_id: 'company-001',
      client_id: 'client-1',
      status: 'active',
      plan: { id: 'plan-1', price_cents: 5000 },
    };
    const maybeSingle = vi.fn().mockResolvedValue({ data: membership, error: null });
    const limit = vi.fn(() => ({ maybeSingle }));
    const order = vi.fn(() => ({ limit }));
    const inMock = vi.fn(() => ({ order }));
    const eqClient = vi.fn(() => ({ in: inMock }));
    const eqUser = vi.fn(() => ({ eq: eqClient }));
    const select = vi.fn(() => ({ eq: eqUser }));
    fromMock.mockReturnValueOnce({ select });

    const result = await fetchClientActiveMembership('company-001', 'client-1');

    expect(fromMock).toHaveBeenCalledWith('client_memberships');
    expect(eqUser).toHaveBeenCalledWith('user_id', 'company-001');
    expect(eqClient).toHaveBeenCalledWith('client_id', 'client-1');
    expect(inMock).toHaveBeenCalledWith('status', ['pending', 'active', 'overdue']);
    expect(result?.id).toBe('ms-1');
  });

  it('retorna null quando o cliente nao tem membership ativa', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const limit = vi.fn(() => ({ maybeSingle }));
    const order = vi.fn(() => ({ limit }));
    const inMock = vi.fn(() => ({ order }));
    const eqClient = vi.fn(() => ({ in: inMock }));
    const eqUser = vi.fn(() => ({ eq: eqClient }));
    const select = vi.fn(() => ({ eq: eqUser }));
    fromMock.mockReturnValueOnce({ select });

    const result = await fetchClientActiveMembership('company-001', 'client-2');

    expect(result).toBeNull();
  });

  it('propaga erro do supabase', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } });
    const limit = vi.fn(() => ({ maybeSingle }));
    const order = vi.fn(() => ({ limit }));
    const inMock = vi.fn(() => ({ order }));
    const eqClient = vi.fn(() => ({ in: inMock }));
    const eqUser = vi.fn(() => ({ eq: eqClient }));
    const select = vi.fn(() => ({ eq: eqUser }));
    fromMock.mockReturnValueOnce({ select });

    await expect(fetchClientActiveMembership('company-001', 'client-1')).rejects.toBeTruthy();
  });
});

describe('memberships service — confirmMembershipPayment', () => {
  it('cria pagamento confirmado com o valor do plano e ativa a membership', async () => {
    // 1) SELECT membership + plan
    const single = vi.fn().mockResolvedValue({
      data: { plan_id: 'plan-1', plan: { price_cents: 5000 } },
      error: null,
    });
    const selEqId = vi.fn(() => ({ single }));
    const selEqUser = vi.fn(() => ({ eq: selEqId }));
    const select = vi.fn(() => ({ eq: selEqUser }));
    // 2) INSERT payment
    const insert = vi.fn().mockResolvedValue({ error: null });
    // 3) UPDATE membership
    const updEqId = vi.fn().mockResolvedValue({ error: null });
    const updEqUser = vi.fn(() => ({ eq: updEqId }));
    const update = vi.fn(() => ({ eq: updEqUser }));

    fromMock
      .mockReturnValueOnce({ select })
      .mockReturnValueOnce({ insert })
      .mockReturnValueOnce({ update });

    await confirmMembershipPayment('company-001', 'ms-1', 'pix', 'user-owner');

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'company-001',
        membership_id: 'ms-1',
        amount_cents: 5000,
        method: 'pix',
        status: 'confirmed',
        confirmed_by: 'user-owner',
      }),
    );
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'active' }),
    );
    expect(updEqUser).toHaveBeenCalledWith('user_id', 'company-001');
    expect(updEqId).toHaveBeenCalledWith('id', 'ms-1');
  });

  it('usa amount_cents = 0 quando o plano nao tem preco', async () => {
    const single = vi.fn().mockResolvedValue({
      data: { plan_id: 'plan-1', plan: null },
      error: null,
    });
    const selEqId = vi.fn(() => ({ single }));
    const selEqUser = vi.fn(() => ({ eq: selEqId }));
    const select = vi.fn(() => ({ eq: selEqUser }));
    const insert = vi.fn().mockResolvedValue({ error: null });
    const updEqId = vi.fn().mockResolvedValue({ error: null });
    const updEqUser = vi.fn(() => ({ eq: updEqId }));
    const update = vi.fn(() => ({ eq: updEqUser }));

    fromMock
      .mockReturnValueOnce({ select })
      .mockReturnValueOnce({ insert })
      .mockReturnValueOnce({ update });

    await confirmMembershipPayment('company-001', 'ms-1', 'cash', 'user-owner');

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ amount_cents: 0, method: 'cash' }),
    );
  });

  it('lanca se a membership nao for encontrada', async () => {
    const single = vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } });
    const selEqId = vi.fn(() => ({ single }));
    const selEqUser = vi.fn(() => ({ eq: selEqId }));
    const select = vi.fn(() => ({ eq: selEqUser }));
    fromMock.mockReturnValueOnce({ select });

    await expect(
      confirmMembershipPayment('company-001', 'ms-x', 'pix', 'user-owner'),
    ).rejects.toBeTruthy();
  });
});

describe('memberships service — cancelMembership', () => {
  it('marca a membership do tenant como cancelled', async () => {
    const updEqId = vi.fn().mockResolvedValue({ error: null });
    const updEqUser = vi.fn(() => ({ eq: updEqId }));
    const update = vi.fn(() => ({ eq: updEqUser }));
    fromMock.mockReturnValueOnce({ update });

    await cancelMembership('company-001', 'ms-1');

    expect(fromMock).toHaveBeenCalledWith('client_memberships');
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'cancelled' }),
    );
    expect(updEqUser).toHaveBeenCalledWith('user_id', 'company-001');
    expect(updEqId).toHaveBeenCalledWith('id', 'ms-1');
  });

  it('propaga erro ao cancelar', async () => {
    const updEqId = vi.fn().mockResolvedValue({ error: { message: 'boom' } });
    const updEqUser = vi.fn(() => ({ eq: updEqId }));
    const update = vi.fn(() => ({ eq: updEqUser }));
    fromMock.mockReturnValueOnce({ update });

    await expect(cancelMembership('company-001', 'ms-1')).rejects.toBeTruthy();
  });
});
