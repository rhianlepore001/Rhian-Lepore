import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpcMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase', () => ({
  supabasePublic: {
    rpc: rpcMock,
  },
}));

import { fetchStaffInvite, parseStaffInviteParams } from '@/services/staffInvite';

describe('parseStaffInviteParams', () => {
  it('lê o path /invite/:company/:member', () => {
    expect(parseStaffInviteParams({
      pathname: '/invite/owner-1/member-2',
    })).toEqual({ companyId: 'owner-1', memberId: 'member-2' });
  });

  it('lê company e member da query do hash', () => {
    expect(parseStaffInviteParams({
      hash: '#/register?company=owner-1&member=member-2',
    })).toEqual({ companyId: 'owner-1', memberId: 'member-2' });
  });

  it('lê query externa quando o WhatsApp tira o ? do hash', () => {
    expect(parseStaffInviteParams({
      pathname: '/register',
      search: '?company=owner-1&member=member-2',
      hash: '#/register',
    })).toEqual({ companyId: 'owner-1', memberId: 'member-2' });
  });
});

describe('fetchStaffInvite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devolve o profissional quando a RPC responde', async () => {
    rpcMock.mockResolvedValue({
      data: [{
        id: 'member-2',
        name: 'Tales Furtado',
        role: 'Barbeiro',
        staff_user_id: null,
        business_name: 'Barbearia Teste',
        user_type: 'barber',
      }],
      error: null,
    });

    const result = await fetchStaffInvite('owner-1', 'member-2');
    expect(result.status).toBe('ready');
    if (result.status === 'ready') {
      expect(result.member.name).toBe('Tales Furtado');
    }
    expect(rpcMock).toHaveBeenCalledWith('get_team_member_for_invite', {
      p_company_id: 'owner-1',
      p_member_id: 'member-2',
    });
  });

  it('não deixa o loading infinito quando a RPC lança', async () => {
    rpcMock.mockRejectedValue(new Error('Failed to fetch'));

    const result = await fetchStaffInvite('owner-1', 'member-2');
    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.message).toMatch(/convite|conexão/i);
    }
  });

  it('marca convite incompleto quando não há member_id', async () => {
    rpcMock.mockResolvedValue({
      data: [{ user_type: 'beauty', business_name: 'Studio' }],
      error: null,
    });

    const result = await fetchStaffInvite('owner-1');
    expect(result.status).toBe('incomplete');
    expect(rpcMock).toHaveBeenCalledWith('get_company_for_invite', { p_company_id: 'owner-1' });
  });

  it('recusa convite já utilizado', async () => {
    rpcMock.mockResolvedValue({
      data: [{
        id: 'member-2',
        name: 'Tales',
        role: 'Barbeiro',
        staff_user_id: 'already-used',
        business_name: 'Barbearia',
        user_type: 'barber',
      }],
      error: null,
    });

    const result = await fetchStaffInvite('owner-1', 'member-2');
    expect(result).toEqual({ status: 'error', message: 'Este convite já foi utilizado.' });
  });
});
