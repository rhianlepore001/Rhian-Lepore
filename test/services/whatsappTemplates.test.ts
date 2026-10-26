import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchPublicWhatsAppTemplates,
  fetchWhatsAppTemplates,
  saveWhatsAppTemplate,
} from '../../services/whatsappTemplates';

const db = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  upsert: vi.fn(),
  single: vi.fn(),
  rpc: vi.fn(),
}));
vi.mock('../../lib/supabase', () => ({ supabase: db }));

describe('persistência de mensagens', () => {
  beforeEach(() => {
    db.from.mockReturnValue(db);
    db.select.mockReturnValue(db);
    db.eq.mockReturnValue(db);
    db.upsert.mockReturnValue(db);
    db.single.mockResolvedValue({
      data: { message_key: 'reschedule', enabled: true, body: 'Oi' },
      error: null,
    });
  });
  it('leitura privada filtra tenant e pede só os campos usados', async () => {
    db.eq.mockResolvedValueOnce({ data: [], error: null });
    await fetchWhatsAppTemplates('tenant-a');
    expect(db.from).toHaveBeenCalledWith('whatsapp_message_templates');
    expect(db.select).toHaveBeenCalledWith('message_key, enabled, body');
    expect(db.eq).toHaveBeenCalledWith('business_id', 'tenant-a');
  });
  it('grava por tenant/chave sem permitir campos de auditoria no payload', async () => {
    await saveWhatsAppTemplate('tenant-a', {
      message_key: 'reschedule',
      enabled: true,
      body: 'Oi',
    });
    expect(db.upsert).toHaveBeenCalledWith(
      {
        business_id: 'tenant-a',
        message_key: 'reschedule',
        enabled: true,
        body: 'Oi',
      },
      { onConflict: 'business_id,message_key' },
    );
    expect(db.eq).toHaveBeenCalledWith('business_id', 'tenant-a');
  });
  it('valida antes de gravar e aceita body null', async () => {
    await expect(
      saveWhatsAppTemplate('tenant-a', {
        message_key: 'reschedule',
        enabled: true,
        body: '{senha}',
      }),
    ).rejects.toThrow('não está disponível');
    expect(db.upsert).not.toHaveBeenCalled();
    await saveWhatsAppTemplate('tenant-a', {
      message_key: 'reschedule',
      enabled: true,
      body: null,
    });
    expect(db.upsert).toHaveBeenCalled();
  });
  it('público usa a RPC e propaga falhas', async () => {
    db.rpc.mockResolvedValueOnce({
      data: [{ message_key: 'client_change', enabled: false, body: null }],
      error: null,
    });
    expect(await fetchPublicWhatsAppTemplates('studio')).toHaveLength(1);
    expect(db.rpc).toHaveBeenCalledWith('get_public_whatsapp_templates', {
      p_slug: 'studio',
    });
    db.rpc.mockResolvedValueOnce({ data: null, error: new Error('offline') });
    await expect(fetchPublicWhatsAppTemplates('studio')).rejects.toThrow(
      'offline',
    );
  });
});
