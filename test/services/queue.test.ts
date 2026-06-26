import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addManualQueueEntry,
  calcEstimatedWaitMinutes,
  findActiveQueueEntryByPhone,
  finishQueueEntry,
  isCallingExpired,
  joinQueue,
  resetExpiredCallingEntries,
  sanitizeQueuePhone,
  updateQueueStatus,
} from '@/services/queue';
import { supabase } from '@/lib/supabase';

const maybeSingleMock = vi.fn();
const singleMock = vi.fn();
const orderMock = vi.fn(() => ({ limit: vi.fn(() => ({ single: singleMock })) }));
const orMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
let activeQueueData: any[] = [];
const inMock = vi.fn(() => Promise.resolve({ data: activeQueueData, error: null }));
const eqMock = vi.fn(() => ({ in: inMock, eq: eqMock, not: notMock, lte: lteMock, order: orderMock }));
const selectMock = vi.fn(() => ({ eq: eqMock, single: singleMock }));
const insertMock = vi.fn(() => Object.assign(
  Promise.resolve({ data: null, error: null }),
  { select: selectMock },
));
const lteMock = vi.fn().mockResolvedValue({ error: null });
const notMock = vi.fn(() => ({ lte: lteMock }));
const updateEqMock = vi.fn(() => ({ eq: eqMock, not: notMock }));
const updateMock = vi.fn(() => ({ eq: updateEqMock }));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    from: vi.fn(() => ({
      select: selectMock,
      insert: insertMock,
      update: updateMock,
    })),
  },
}));

describe('queue service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    activeQueueData = [];
    maybeSingleMock.mockResolvedValue({ data: null, error: null });
    singleMock.mockResolvedValue({
      data: {
        id: 'queue-001',
        business_id: 'business-001',
        client_name: 'Joao',
        client_phone: '11999999999',
        service_id: 'service-001',
        professional_id: null,
        status: 'waiting',
        joined_at: '2026-05-30T10:00:00.000Z',
      },
      error: null,
    });
    (supabase.rpc as any).mockResolvedValue({ data: null, error: null });
    lteMock.mockResolvedValue({ error: null });
  });

  it('calcula tempo estimado como posicao x 20 minutos', () => {
    expect(calcEstimatedWaitMinutes(3)).toBe(60);
    expect(calcEstimatedWaitMinutes(-1)).toBe(0);
  });

  it('normaliza telefone para verificacao de duplicata', () => {
    expect(sanitizeQueuePhone('(11) 99999-9999')).toBe('11999999999');
  });

  it('detecta timeout de calling apos 5 minutos', () => {
    const now = new Date('2026-05-30T10:06:00.000Z');

    expect(isCallingExpired('2026-05-30T10:00:00.000Z', now)).toBe(true);
    expect(isCallingExpired('2026-05-30T10:03:00.000Z', now)).toBe(false);
  });

  it('busca entrada ativa por telefone no mesmo negocio', async () => {
    (supabase.rpc as any).mockResolvedValue({
      data: [{
        id: 'queue-001',
        business_id: 'business-001',
        client_name: 'Joao',
        client_phone: '11999999999',
        status: 'waiting',
        joined_at: '2026-05-30T10:00:00.000Z',
      }],
      error: null,
    });

    const result = await findActiveQueueEntryByPhone('business-001', '(11) 99999-9999');

    expect(result?.id).toBe('queue-001');
    expect(supabase.rpc).toHaveBeenCalledWith('find_active_queue_entry_by_phone', {
      p_business_id: 'business-001',
      p_phone: '(11) 99999-9999',
    });
  });

  it('bloqueia entrada duplicada por telefone', async () => {
    (supabase.rpc as any).mockResolvedValue({
      data: [{
        id: 'queue-001',
        business_id: 'business-001',
        client_name: 'Joao',
        client_phone: '11999999999',
        status: 'waiting',
        joined_at: '2026-05-30T10:00:00.000Z',
      }],
      error: null,
    });

    await expect(joinQueue({
      businessId: 'business-001',
      clientName: 'Joao',
      clientPhone: '11999999999',
      serviceId: 'service-001',
      professionalId: null,
    })).rejects.toThrow('Este telefone já está na fila.');

    expect(insertMock).not.toHaveBeenCalled();
  });

  it('cria entrada publica com status waiting quando nao ha duplicata', async () => {
    (supabase.rpc as any)
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({
        data: [{
          id: 'queue-001',
          business_id: 'business-001',
          client_name: 'Joao',
          client_phone: '11999999999',
          service_id: 'service-001',
          professional_id: 'pro-001',
          status: 'waiting',
          joined_at: '2026-05-30T10:00:00.000Z',
        }],
        error: null,
      });

    const result = await joinQueue({
      businessId: 'business-001',
      clientName: 'Joao',
      clientPhone: '11999999999',
      serviceId: 'service-001',
      professionalId: 'pro-001',
    });

    expect(insertMock).toHaveBeenCalledWith({
      business_id: 'business-001',
      client_name: 'Joao',
      client_phone: '11999999999',
      service_id: 'service-001',
      professional_id: 'pro-001',
      status: 'waiting',
    });
    expect(result.id).toBe('queue-001');
  });

  it('cria entrada manual usando o tenant do owner', async () => {
    await addManualQueueEntry({
      businessId: 'business-001',
      clientName: 'Maria',
      clientPhone: '11988888888',
    });

    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
      business_id: 'business-001',
      client_name: 'Maria',
      client_phone: '11988888888',
      status: 'waiting',
    }));
  });

  it('marca called_at ao chamar e limpa quando sai de calling', async () => {
    await updateQueueStatus({
      entryId: 'queue-001',
      businessId: 'business-001',
      status: 'calling',
    });

    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({
      status: 'calling',
      called_at: expect.any(String),
    }));

    await updateQueueStatus({
      entryId: 'queue-001',
      businessId: 'business-001',
      status: 'serving',
    });

    expect(updateMock).toHaveBeenLastCalledWith({
      status: 'serving',
      called_at: null,
    });
  });

  it('reseta calling expirado para waiting sem no_show automatico', async () => {
    await resetExpiredCallingEntries('business-001');

    expect(updateMock).toHaveBeenCalledWith({ status: 'waiting' });
    expect(updateMock).not.toHaveBeenCalledWith({ status: 'no_show' });
    expect(notMock).toHaveBeenCalledWith('called_at', 'is', null);
  });

  it('finaliza fila somente pela RPC atomica', async () => {
    await finishQueueEntry({
      entryId: 'queue-001',
      serviceName: 'Corte',
      finalPrice: 80,
      professionalId: 'pro-001',
    });

    expect(supabase.rpc).toHaveBeenCalledWith('finish_queue_entry', {
      p_queue_entry_id: 'queue-001',
      p_service_name: 'Corte',
      p_final_price: 80,
      p_professional_id: 'pro-001',
    });
    expect(insertMock).not.toHaveBeenCalled();
  });
});
