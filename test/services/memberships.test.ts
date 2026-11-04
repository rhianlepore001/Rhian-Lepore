import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cancelMembership,
  cancelPublicClientMembership,
  confirmMembershipPayment,
  fetchClientActiveMembership,
  fetchClientMemberships,
  fetchPublicClientMembership,
  fetchPublicPixConfig,
} from '@/services/memberships';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

const fromMock = supabase.from as unknown as ReturnType<typeof vi.fn>;
const rpcMock = supabase.rpc as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

function mockClientsLookup(rows: Array<{ id: string; name: string; phone: string }>, error: unknown = null) {
  const inMock = vi.fn().mockResolvedValue({ data: error ? null : rows, error });
  const eq = vi.fn(() => ({ in: inMock }));
  const select = vi.fn(() => ({ eq }));
  fromMock.mockReturnValueOnce({ select });
  return { select, eq, inMock };
}

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
    mockClientsLookup([{ id: 'client-1', name: 'Paulo', phone: '11999990000' }]);

    const result = await fetchClientActiveMembership('company-001', 'client-1');

    expect(fromMock).toHaveBeenCalledWith('client_memberships');
    expect(eqUser).toHaveBeenCalledWith('user_id', 'company-001');
    expect(eqClient).toHaveBeenCalledWith('client_id', 'client-1');
    expect(inMock).toHaveBeenCalledWith('status', ['pending', 'active', 'overdue']);
    expect(result?.id).toBe('ms-1');
    expect(result?.client).toEqual({ id: 'client-1', name: 'Paulo', phone: '11999990000' });
    expect(String((select.mock.calls as unknown[][])[0][0])).not.toMatch(/clients\s*\(/);
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

describe('memberships service — fetchPublicClientMembership', () => {
  it('mapeia a row da RPC pública', async () => {
    rpcMock.mockResolvedValueOnce({
      data: [{
        membership_id: 'ms-pub',
        stored_status: 'active',
        effective_status: 'active',
        plan_id: 'plan-1',
        plan_name: 'Corte Ilimitado',
        plan_description: 'Cortes no mês',
        price_cents: 9000,
        badge_color: 'gold',
        service_ids: ['s1'],
        service_names: ['Corte'],
        usage_limit_per_month: null,
        usage_this_period: 2,
        starts_at: '2026-09-01T00:00:00.000Z',
        current_period_start: '2026-09-01T00:00:00.000Z',
        current_period_end: '2026-10-01T00:00:00.000Z',
        next_billing_at: '2026-10-01T00:00:00.000Z',
        last_paid_at: '2026-09-01T00:00:00.000Z',
        payment_method: 'pix',
      }],
      error: null,
    });

    const result = await fetchPublicClientMembership('biz-1', '11999999999');

    expect(rpcMock).toHaveBeenCalledWith('get_public_client_membership', {
      p_business_id: 'biz-1',
      p_phone: '11999999999',
    });
    expect(result?.plan_name).toBe('Corte Ilimitado');
    expect(result?.usage_this_period).toBe(2);
    expect(result?.effective_status).toBe('active');
  });

  it('retorna null quando a RPC não acha membership', async () => {
    rpcMock.mockResolvedValueOnce({ data: [], error: null });
    await expect(fetchPublicClientMembership('biz-1', '11999999999')).resolves.toBeNull();
  });
});

describe('memberships service — cancelPublicClientMembership', () => {
  it('chama a RPC de cancelamento público', () => {
    rpcMock.mockResolvedValueOnce({ data: 'ms-pub', error: null });
    return cancelPublicClientMembership('biz-1', '11999999999').then((id) => {
      expect(id).toBe('ms-pub');
      expect(rpcMock).toHaveBeenCalledWith('cancel_public_client_membership', {
        p_business_id: 'biz-1',
        p_phone: '11999999999',
      });
    });
  });
});

describe('memberships service — fetchPublicPixConfig', () => {
  it('lê a primeira linha quando o RPC devolve array', async () => {
    rpcMock.mockResolvedValueOnce({
      data: [{
        pix_key_type: 'cpf',
        pix_key_value: '52998224725',
        pix_holder_name: 'Loja',
        pix_merchant_city: 'SAO PAULO',
        mbway_phone: null,
        mbway_holder_name: null,
      }],
      error: null,
    });
    const result = await fetchPublicPixConfig('biz-1');
    expect(result.pix_key_value).toBe('52998224725');
    expect(result.mbway_phone).toBeNull();
  });

  it('lê objeto único quando o RPC não envolve array', async () => {
    rpcMock.mockResolvedValueOnce({
      data: {
        pix_key_type: 'email',
        pix_key_value: 'a@b.com',
        pix_holder_name: 'Loja',
        pix_merchant_city: 'LISBOA',
        mbway_phone: '+351912345678',
        mbway_holder_name: 'Loja PT',
      },
      error: null,
    });
    const result = await fetchPublicPixConfig('biz-1');
    expect(result.pix_key_type).toBe('email');
    expect(result.mbway_phone).toBe('+351912345678');
  });
});

describe('memberships service — fetchClientMemberships (sem relação direta com clients)', () => {
  function mockMembershipsQuery(rows: unknown[], error: unknown = null) {
    const result = { data: error ? null : rows, error };
    const chain: any = {
      eq: vi.fn(() => chain),
      order: vi.fn(() => chain),
      then: (resolve: (r: typeof result) => unknown) => resolve(result),
    };
    const select = vi.fn(() => chain);
    fromMock.mockReturnValueOnce({ select });
    return { select, chain };
  }

  it('busca assinaturas e clientes em duas consultas e junta o cliente em cada assinatura', async () => {
    const { select } = mockMembershipsQuery([
      { id: 'ms-1', user_id: 'company-001', client_id: 'c1', status: 'active', plan: { id: 'p1' } },
      { id: 'ms-2', user_id: 'company-001', client_id: 'c2', status: 'pending', plan: { id: 'p1' } },
      { id: 'ms-3', user_id: 'company-001', client_id: 'c1', status: 'cancelled', plan: { id: 'p1' } },
    ]);
    const lookup = mockClientsLookup([
      { id: 'c1', name: 'Paulo', phone: '1' },
      { id: 'c2', name: 'Ana', phone: '2' },
    ]);

    const result = await fetchClientMemberships('company-001');

    expect(String((select.mock.calls as unknown[][])[0][0])).not.toMatch(/clients\s*\(/);
    expect(fromMock).toHaveBeenNthCalledWith(1, 'client_memberships');
    expect(fromMock).toHaveBeenNthCalledWith(2, 'clients');
    expect(lookup.eq).toHaveBeenCalledWith('user_id', 'company-001');
    expect(lookup.inMock).toHaveBeenCalledWith('id', ['c1', 'c2']);
    expect(result.map(r => r.client?.name)).toEqual(['Paulo', 'Ana', 'Paulo']);
  });

  it('deixa client nulo quando o cliente não é encontrado, sem derrubar a lista', async () => {
    mockMembershipsQuery([{ id: 'ms-1', user_id: 'company-001', client_id: 'gone', status: 'active', plan: null }]);
    mockClientsLookup([]);

    const result = await fetchClientMemberships('company-001');

    expect(result).toHaveLength(1);
    expect(result[0].client).toBeNull();
  });

  it('não consulta clients quando não há assinaturas', async () => {
    mockMembershipsQuery([]);

    const result = await fetchClientMemberships('company-001');

    expect(result).toEqual([]);
    expect(fromMock).toHaveBeenCalledTimes(1);
  });

  it('propaga erro da consulta de clientes', async () => {
    mockMembershipsQuery([{ id: 'ms-1', user_id: 'company-001', client_id: 'c1', status: 'active', plan: null }]);
    mockClientsLookup([], { message: 'boom' });

    await expect(fetchClientMemberships('company-001')).rejects.toBeTruthy();
  });
});
