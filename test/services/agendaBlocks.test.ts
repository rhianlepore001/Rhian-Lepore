import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.fn();
const order = vi.fn();
const gt = vi.fn();
const lt = vi.fn();
const eq = vi.fn();
const select = vi.fn();
const from = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpc(...args),
    from: (...args: unknown[]) => from(...args),
  },
}));

import { createAgendaBlock, deleteAgendaBlock, fetchAgendaBlocks } from '@/services/agendaBlocks';

describe('agendaBlocks service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    order.mockResolvedValue({ data: [], error: null });
    gt.mockReturnValue({ order });
    lt.mockReturnValue({ gt });
    eq.mockReturnValue({ lt });
    select.mockReturnValue({ eq });
    from.mockReturnValue({ select });
  });

  it('lista bloqueios do tenant no intervalo (overlap)', async () => {
    order.mockResolvedValueOnce({
      data: [{
        id: 'b1',
        user_id: 'biz-1',
        professional_id: 'pro-1',
        starts_at: '2026-10-05T12:00:00-03:00',
        ends_at: '2026-10-05T13:00:00-03:00',
      }],
      error: null,
    });
    const rows = await fetchAgendaBlocks('biz-1', '2026-10-05T00:00:00.000Z', '2026-10-06T00:00:00.000Z');
    expect(from).toHaveBeenCalledWith('agenda_blocks');
    expect(eq).toHaveBeenCalledWith('user_id', 'biz-1');
    expect(rows).toHaveLength(1);
  });

  it('cria via RPC sem ack por padrão', async () => {
    rpc.mockResolvedValueOnce({ data: { success: true, id: 'b1' }, error: null });
    const result = await createAgendaBlock({
      professionalId: 'pro-1',
      startsAt: '2026-10-05T15:00:00.000Z',
      endsAt: '2026-10-05T16:00:00.000Z',
    });
    expect(rpc).toHaveBeenCalledWith('create_agenda_block', {
      p_professional_id: 'pro-1',
      p_starts_at: '2026-10-05T15:00:00.000Z',
      p_ends_at: '2026-10-05T16:00:00.000Z',
      p_acknowledge_conflicts: false,
      p_confirmed_conflict_ids: null,
    });
    expect(result).toEqual({ success: true, id: 'b1' });
  });

  it('repassa conflitos para a UI confirmar', async () => {
    rpc.mockResolvedValueOnce({
      data: { success: false, code: 'conflicts', items: [{ id: 'a1', client_name: 'Ana' }] },
      error: null,
    });
    const result = await createAgendaBlock({
      professionalId: 'pro-1',
      startsAt: '2026-10-05T15:00:00.000Z',
      endsAt: '2026-10-05T16:00:00.000Z',
      acknowledgeConflicts: false,
    });
    expect(result.success).toBe(false);
    if (result.success === false) expect(result.code).toBe('conflicts');
  });

  it('remove via RPC', async () => {
    rpc.mockResolvedValueOnce({ data: { success: true }, error: null });
    await deleteAgendaBlock('b1');
    expect(rpc).toHaveBeenCalledWith('delete_agenda_block', { p_block_id: 'b1' });
  });

  it('lista vazia se a tabela ainda não existe', async () => {
    order.mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST205', message: "Could not find the table 'public.agenda_blocks' in the schema cache" },
    });
    const rows = await fetchAgendaBlocks('biz-1', '2026-10-05T00:00:00.000Z', '2026-10-06T00:00:00.000Z');
    expect(rows).toEqual([]);
  });

  it('create devolve unavailable se a RPC ainda não existe', async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'Could not find the function public.create_agenda_block' },
    });
    const result = await createAgendaBlock({
      professionalId: 'pro-1',
      startsAt: '2026-10-05T15:00:00.000Z',
      endsAt: '2026-10-05T16:00:00.000Z',
    });
    expect(result.success).toBe(false);
    if (result.success === false) expect(result.code).toBe('unavailable');
  });
});
