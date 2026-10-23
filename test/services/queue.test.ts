import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addManualQueueEntry,
  calcEstimatedWaitMinutes,
  confirmQueuePayment,
  findActiveQueueEntryByPhone,
  findNameToOpenPublicArea,
  finishQueueEntry,
  hydrateQueuePublicBoard,
  isCallingExpired,
  joinQueue,
  QUEUE_LAST_SLUG_KEY,
  QUEUE_TICKET_KEY,
  QueueAlreadyActiveError,
  QueueLookupError,
  isRecentClosedQueueEntry,
  resetExpiredCallingEntries,
  resolveClientQueueEntry,
  sanitizeQueuePhone,
  storeQueueTicket,
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
    vi.mocked(supabase.rpc).mockReset();
    sessionStorage.clear();
    localStorage.clear();
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

  it('não recupera dados se o lookup legado por telefone está bloqueado', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: null, error: { code: '42501', message: 'permission denied' } } as any);
    await expect(findActiveQueueEntryByPhone('business-001', '11999999999')).resolves.toBeNull();
  });

  it('busca entrada ativa pelo token guardado no mesmo negocio', async () => {
    storeQueueTicket({ businessId: 'business-001', entryId: 'queue-001', token: 'a'.repeat(64), slug: 'loja' });
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
    expect(supabase.rpc).toHaveBeenCalledWith('get_queue_entry_with_token', { p_entry_id: 'queue-001', p_token: 'a'.repeat(64) });
  });

  it('reabre a senha somente quando o aparelho tem o token privado', async () => {
    storeQueueTicket({ businessId: 'business-001', entryId: 'queue-001', token: 'a'.repeat(64), slug: 'loja' });
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

    const attempt = joinQueue({
      businessId: 'business-001',
      slug: 'loja',
      clientName: 'Joao',
      clientPhone: '11999999999',
      serviceId: 'service-001',
      professionalId: null,
    });

    await expect(attempt).rejects.toBeInstanceOf(QueueAlreadyActiveError);
    await attempt.catch((error: QueueAlreadyActiveError) => {
      expect(error.entry.id).toBe('queue-001');
    });
    expect(sessionStorage.getItem(QUEUE_LAST_SLUG_KEY)).toBe('loja');
    expect(JSON.parse(localStorage.getItem(QUEUE_TICKET_KEY('business-001'))!).entryId).toBe('queue-001');
    expect(insertMock).not.toHaveBeenCalled();
    expect(supabase.rpc).not.toHaveBeenCalledWith('join_queue_entry_private', expect.anything());
  });

  it('unique violation sem senha localizavel nao promete abrir a senha', async () => {
    (supabase.rpc as any).mockImplementation((fn: string) => {
      if (fn === 'find_active_queue_entry_by_phone') return Promise.resolve({ data: [], error: null });
      if (fn === 'join_queue_entry_private') return Promise.resolve({ data: null, error: { message: 'Este telefone ja esta na fila.' } });
      return Promise.resolve({ data: null, error: null });
    });

    const attempt = joinQueue({
      businessId: 'business-001',
      slug: 'loja',
      clientName: 'Joao',
      clientPhone: '11999999999',
      serviceId: 'service-001',
      professionalId: null,
    });

    await expect(attempt).rejects.not.toBeInstanceOf(QueueAlreadyActiveError);
    await attempt.catch((error: Error) => {
      expect(error.message).not.toMatch(/abrindo/i);
      expect(error.message).toMatch(/senha ativa/i);
    });
  });

  it('cria entrada publica via RPC quando nao ha duplicata', async () => {
    (supabase.rpc as any).mockResolvedValueOnce({ data: { entry: {
      id: 'queue-001', business_id: 'business-001', client_name: 'Joao', client_phone: '11999999999',
      service_id: 'service-001', professional_id: 'pro-001', status: 'waiting', joined_at: new Date().toISOString(),
    }, management_token: 'a'.repeat(64) }, error: null });

    const result = await joinQueue({
      businessId: 'business-001',
      slug: 'loja',
      clientName: 'Joao',
      clientPhone: '11999999999',
      serviceId: 'service-001',
      professionalId: 'pro-001',
    });

    expect(supabase.rpc).toHaveBeenCalledWith('join_queue_entry_private', expect.objectContaining({
      p_slug: 'loja',
      p_client_name: 'Joao',
      p_service_id: 'service-001',
      p_br_code: null,
      p_txid: null,
      p_mbway_phone: null,
    }));
    expect(insertMock).not.toHaveBeenCalled();
    expect(result.id).toBe('queue-001');
    expect(sessionStorage.getItem(QUEUE_LAST_SLUG_KEY)).toBe('loja');
  });

  it('nao inventa senha sem token quando o retorno da criacao e incompleto', async () => {
    (supabase.rpc as any).mockResolvedValueOnce({ data: { id: 'queue-009' }, error: null });
    await expect(joinQueue({ businessId: 'business-001', slug: 'loja', clientName: 'Joao', clientPhone: '11999999999', serviceId: 'service-001' })).rejects.toThrow('Fale com o estabelecimento');
    expect(localStorage.getItem(QUEUE_TICKET_KEY('business-001'))).toBeNull();
  });

  it('recupera a senha persistida quando find_active falha', async () => {
    storeQueueTicket({
      businessId: 'business-001',
      entryId: 'queue-001',
      phone: '11999999999',
      token: 'a'.repeat(64),
      slug: 'loja',
    });

    (supabase.rpc as any).mockImplementation((name: string) => {
      if (name === 'get_queue_entry_with_token') {
        return Promise.resolve({
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
      }
      return Promise.resolve({ data: null, error: { message: 'operator does not exist: text = uuid' } });
    });

    const result = await resolveClientQueueEntry({
      businessId: 'business-001',
      phone: '11999999999',
      slug: 'loja',
    });

    expect(result?.id).toBe('queue-001');
    expect(supabase.rpc).toHaveBeenCalledWith('get_queue_entry_with_token', expect.objectContaining({
      p_entry_id: 'queue-001',
    }));
  });

  it('propaga falha de RPC em vez de dizer que o cliente está fora da fila', async () => {
    storeQueueTicket({
      businessId: 'business-001',
      entryId: 'queue-001',
      phone: '11999999999',
      token: 'a'.repeat(64),
      slug: 'loja',
    });
    (supabase.rpc as any).mockResolvedValue({ data: null, error: { message: 'FetchError: network' } });

    await expect(resolveClientQueueEntry({
      businessId: 'business-001',
      phone: '11999999999',
      slug: 'loja',
    })).rejects.toBeInstanceOf(QueueLookupError);
  });

  it('falha de rede no ticket local continua erro mesmo com telefone sem senha ativa', async () => {
    storeQueueTicket({
      businessId: 'business-001',
      entryId: 'queue-001',
      phone: '11999999999',
      token: 'a'.repeat(64),
      slug: 'loja',
    });
    (supabase.rpc as any).mockImplementation((fn: string) => {
      if (fn === 'get_queue_entry_with_token') return Promise.resolve({ data: null, error: { message: 'FetchError: network' } });
      return Promise.resolve({ data: [], error: null });
    });

    await expect(resolveClientQueueEntry({
      businessId: 'business-001',
      phone: '11999999999',
      slug: 'loja',
    })).rejects.toBeInstanceOf(QueueLookupError);
  });

  it('senha inexistente e telefone sem senha ativa resolve para null', async () => {
    storeQueueTicket({
      businessId: 'business-001',
      entryId: 'queue-old',
      phone: '11999999999',
      token: 'a'.repeat(64),
      slug: 'loja',
    });
    (supabase.rpc as any).mockResolvedValue({ data: [], error: null });

    await expect(resolveClientQueueEntry({
      businessId: 'business-001',
      phone: '11999999999',
      slug: 'loja',
    })).resolves.toBeNull();
  });

  it('devolve a senha encerrada nas últimas 12h quando não há senha ativa', async () => {
    const joinedAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    storeQueueTicket({
      businessId: 'business-001',
      entryId: 'queue-done',
      phone: '11999999999',
      token: 'a'.repeat(64),
      slug: 'loja',
    });
    (supabase.rpc as any).mockImplementation((name: string) => {
      if (name === 'get_queue_entry_with_token') {
        return Promise.resolve({
          data: [{
            id: 'queue-done',
            business_id: 'business-001',
            client_name: 'Joao',
            client_phone: '11999999999',
            status: 'completed',
            joined_at: joinedAt,
          }],
          error: null,
        });
      }
      return Promise.resolve({ data: [], error: null });
    });

    const result = await resolveClientQueueEntry({ businessId: 'business-001', phone: '11999999999', slug: 'loja' });
    expect(result?.status).toBe('completed');
    expect(isRecentClosedQueueEntry({
      id: 'x', business_id: 'b', client_name: 'a', client_phone: '1', status: 'completed',
      joined_at: new Date(Date.now() - 13 * 60 * 60 * 1000).toISOString(),
    })).toBe(false);
  });

  it('calcula ETA do board com cadeiras e descarta campos internos', () => {
    const board = hydrateQueuePublicBoard({
      entryId: 'b',
      status: 'waiting',
      paymentStatus: 'unpaid',
      serviceName: 'Corte',
      position: 2,
      etaMinutes: null,
      people: [{ position: 1, firstName: 'Ana', isYou: false }],
      settings: { allowLeave: true, lateMinutes: 10 },
      calledAt: null,
      queueMode: 'shared',
      chairs: 1,
      etaPeople: [
        {
          id: 'a',
          joinedAt: '2026-09-06T11:00:00.000Z',
          durationMinutes: 30,
          status: 'waiting',
          professionalId: null,
        },
        {
          id: 'b',
          joinedAt: '2026-09-06T11:01:00.000Z',
          durationMinutes: 30,
          status: 'waiting',
          professionalId: null,
        },
      ],
    });
    expect(board.etaMinutes).toBe(30);
    expect(board).not.toHaveProperty('etaPeople');
  });

  it('usa 1 cadeira quando o board vem com zero (dono sozinho)', () => {
    const board = hydrateQueuePublicBoard({
      entryId: 'b',
      status: 'waiting',
      paymentStatus: 'unpaid',
      serviceName: 'Corte',
      position: 2,
      etaMinutes: null,
      people: [{ position: 1, firstName: 'Ana', isYou: false }],
      settings: { allowLeave: true, lateMinutes: 10 },
      calledAt: null,
      queueMode: 'shared',
      chairs: 0,
      etaPeople: [
        {
          id: 'a',
          joinedAt: '2026-09-06T11:00:00.000Z',
          durationMinutes: 30,
          status: 'waiting',
          professionalId: null,
        },
        {
          id: 'b',
          joinedAt: '2026-09-06T11:01:00.000Z',
          durationMinutes: 40,
          status: 'waiting',
          professionalId: null,
        },
      ],
    });
    expect(board.etaMinutes).toBe(30);
  });

  it('cria entrada manual via RPC do tenant autenticado sem lookup publico por telefone', async () => {
    (supabase.rpc as any).mockResolvedValueOnce({ data: { id: 'queue-002' }, error: null });
    const result = await addManualQueueEntry({ businessId: 'business-001', clientName: 'Maria', clientPhone: '11988888888', serviceId: 'service-001' });
    expect(result.id).toBe('queue-002');
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
    expect(supabase.rpc).toHaveBeenCalledWith('add_manual_queue_entry', expect.objectContaining({ p_client_name: 'Maria', p_client_phone: '11988888888', p_payment_method: null }));
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('propaga falha da entrada manual sem fabricar um id', async () => {
    (supabase.rpc as any).mockResolvedValueOnce({ data: null, error: { message: 'timeout' } });
    await expect(addManualQueueEntry({ businessId: 'business-001', clientName: 'Maria', clientPhone: '11988888888', serviceId: 'service-001' })).rejects.toThrow();
  });

  it('recupera o nome da propria senha com token guardado', async () => {
    storeQueueTicket({ businessId: 'business-001', entryId: 'queue-001', token: 'a'.repeat(64), slug: 'loja' });
    (supabase.rpc as any).mockResolvedValueOnce({
      data: [{
        id: 'queue-001',
        business_id: 'business-001',
        client_name: 'Tales Furtado',
        client_phone: '11939064172',
        status: 'waiting',
        joined_at: '2026-09-11T10:00:00.000Z',
      }],
      error: null,
    });

    await expect(findNameToOpenPublicArea('business-001', '11939064172')).resolves.toBe('Tales Furtado');
  });

  it('nao consulta agendamento nem nome por telefone', async () => {
    await expect(findNameToOpenPublicArea('business-001', '11900000000')).resolves.toBeNull();
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('propaga falha ao consultar o token privado sem buscar por telefone', async () => {
    storeQueueTicket({ businessId: 'business-001', entryId: 'queue-001', token: 'a'.repeat(64), slug: 'loja' });
    (supabase.rpc as any).mockResolvedValueOnce({ data: null, error: { message: 'timeout' } });
    await expect(findNameToOpenPublicArea('business-001', '11900000000')).rejects.toBeInstanceOf(QueueLookupError);
  });

  it('atualiza status somente pela RPC', async () => {
    await updateQueueStatus({
      entryId: 'queue-001',
      businessId: 'business-001',
      status: 'calling',
    });

    expect(supabase.rpc).toHaveBeenCalledWith('update_queue_status', {
      p_entry_id: 'queue-001',
      p_status: 'calling',
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('nao marca no_show nem reescreve calling por timeout', async () => {
    await resetExpiredCallingEntries('business-001');

    expect(updateMock).not.toHaveBeenCalled();
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

  it('confirma pagamento da fila pela RPC', async () => {
    await confirmQueuePayment('queue-001');
    expect(supabase.rpc).toHaveBeenCalledWith('confirm_queue_payment', {
      p_entry_id: 'queue-001',
    });
  });
});
