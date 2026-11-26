import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultConfig, type SiteData } from '@/lib/establishment/model';
import { loadSite, loadSiteDraft, saveSiteDraft, loadOwnerSite, saveOwnerSiteDraft, publishOwnerSite, unpublishOwnerSite } from './establishmentSite';

const { rpc, from, table, invoke } = vi.hoisted(() => {
  const table: any = {};
  for (const method of ['select', 'eq', 'update', 'insert']) table[method] = vi.fn(() => table);
  table.maybeSingle = vi.fn();
  table.single = vi.fn();
  return { rpc: vi.fn(), from: vi.fn(() => table), table, invoke: vi.fn() };
});
vi.mock('@/lib/supabase', () => ({ supabase: { rpc, from, functions: { invoke } } }));
const empty: SiteData = { id: 'a', slug: 'safe', name: 'Safe', kind: 'barber', region: 'BR', demo: false, address: '', hours: [], services: [], team: [], gallery: [], reviews: [], reviewCount: 0 };

beforeEach(() => {
  rpc.mockReset();
  from.mockClear();
  invoke.mockReset();
  invoke.mockResolvedValue({ data: { ok: true }, error: null });
  table.maybeSingle.mockReset();
  table.single.mockReset();
  for (const method of ['select', 'eq', 'update', 'insert']) table[method].mockClear();
  localStorage.clear();
});

describe('public site reads', () => {
  it('does not show an unpublished site or silently upgrade a plan', async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    expect(await loadSite('safe')).toBeNull();
    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith('get_public_establishment_site', { p_slug: 'safe' });
  });
  it('keeps the old schema safe while waiting for migration approval', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'PGRST202' } });
    expect(await loadSite('safe')).toBeNull();
  });
  it('uses only public RPC allowlists scoped to the resolved public profile', async () => {
    rpc.mockImplementation(async (name: string, args: Record<string, unknown>) => {
      if (name === 'get_public_profile_by_slug') return { data: { id: 'company-a', business_slug: 'safe', business_name: 'Safe' }, error: null };
      if (name === 'get_public_establishment_site') return { data: { config: { style: 'light' } }, error: null };
      expect(args.p_business_id).toBe('company-a');
      if (name === 'get_public_categories_catalog') return { data: [{ id: 'cat-1', name: 'Cortes' }], error: null };
      if (name === 'get_public_services_catalog') return { data: [{ id: 'cut', name: 'Corte', price: 50, duration_minutes: 30, category_id: 'cat-1', active: true }], error: null };
      if (name === 'get_public_membership_plans') return { data: [{ id: 'plan-1', name: 'Plano Mensal', price_cents: 9900, active: true }], error: null };
      if (name === 'get_public_team_catalog') return { data: [], error: { message: 'offline' } };
      return { data: null, error: null };
    });
    const result = await loadSite('safe');
    expect(result?.services[0].name).toBe('Corte');
    expect(result?.services[0].category).toBe('Cortes');
    expect(result?.clubPlans?.[0].name).toBe('Plano Mensal');
    expect(result?.team).toEqual([]);
    expect(result?.config?.style).toBe('light');
    expect(rpc.mock.calls.map(call => call[0])).not.toContain('get_available_slots_v2');
  });
  it('allows an explicit owner preview before publication without exposing private rows', async () => {
    rpc.mockImplementation(async (name: string) => ({ data: name === 'get_public_profile_by_slug' ? { id: 'a', business_slug: 'safe', business_name: 'Safe' } : null, error: null }));
    expect((await loadSite('safe', { preview: true }))?.name).toBe('Safe');
    expect(rpc.mock.calls.map(call => call[0])).not.toContain('get_public_establishment_site');
  });
  it('rejects path-like and empty slugs before reading', async () => {
    expect(await loadSite('../private')).toBeNull();
    expect(await loadSite('')).toBeNull();
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe('local drafts', () => {
  it('isolates tenants, validates stored values, and never publishes', () => {
    const fallback = defaultConfig(empty);
    saveSiteDraft('company-a', { ...fallback, headline: 'Minha casa' });
    expect(loadSiteDraft('company-a', fallback).headline).toBe('Minha casa');
    expect(loadSiteDraft('company-b', fallback)).toEqual(fallback);
    expect(rpc).not.toHaveBeenCalled();
  });
  it('recovers from malformed or outdated storage', () => {
    const fallback = defaultConfig(empty);
    localStorage.setItem('agendix:presence:draft:v1:a', '{broken');
    expect(loadSiteDraft('a', fallback)).toEqual(fallback);
    localStorage.setItem('agendix:presence:draft:v1:a', JSON.stringify({ style: 'unknown', accent: 'url(secret)', sections: [{ id: 'private', enabled: true }] }));
    expect(loadSiteDraft('a', fallback)).toEqual({ ...fallback, cover: undefined });
  });
  it('requires an explicit tenant key for writing', () => {
    expect(() => saveSiteDraft('', defaultConfig(empty))).toThrow();
  });
});


describe('owner draft adapter', () => {
  it('reads and writes only the explicit authenticated tenant', async () => {
    table.maybeSingle.mockResolvedValue({ data: { draft_config: { headline: 'Meu site' }, published: false, presence_enabled: false }, error: null });
    const result = await loadOwnerSite('company-a', defaultConfig(empty));
    expect(result.storage).toBe('remote');
    expect(result.config.headline).toBe('Meu site');
    expect(table.eq).toHaveBeenCalledWith('company_id', 'company-a');
    table.maybeSingle.mockResolvedValue({ data: { company_id: 'company-a' }, error: null });
    expect(await saveOwnerSiteDraft('company-a', result.config)).toEqual({ storage: 'remote' });
    expect(table.update).toHaveBeenCalledWith({ draft_config: result.config });
    expect(table.update.mock.calls[0][0]).not.toHaveProperty('published');
    expect(loadSiteDraft('company-a', defaultConfig(empty)).headline).toBe('Meu site');
  });
  it('falls back locally only when the unapplied schema is missing', async () => {
    table.maybeSingle.mockResolvedValue({ data: null, error: { code: 'PGRST205' } });
    const config = { ...defaultConfig(empty), headline: 'Local' };
    expect(await saveOwnerSiteDraft('company-a', config)).toEqual({ storage: 'local' });
    expect((await loadOwnerSite('company-a', defaultConfig(empty))).config.headline).toBe('Local');
  });
  it('keeps authorization and network failures visible', async () => {
    table.maybeSingle.mockResolvedValue({ data: null, error: { code: '42501', message: 'not allowed' } });
    await expect(loadOwnerSite('company-a', defaultConfig(empty))).rejects.toMatchObject({ code: '42501' });
    await expect(saveOwnerSiteDraft('company-a', defaultConfig(empty))).rejects.toMatchObject({ code: '42501' });
  });
  it('inserts the first draft without setting publication or entitlement', async () => {
    table.maybeSingle.mockResolvedValue({ data: null, error: null });
    table.single.mockResolvedValue({ data: { company_id: 'company-a' }, error: null });
    const config = defaultConfig(empty);
    expect(await saveOwnerSiteDraft('company-a', config)).toEqual({ storage: 'remote' });
    expect(table.insert).toHaveBeenCalledWith({ company_id: 'company-a', draft_config: config });
  });
});


describe('owner publication adapter', () => {
  it('publishes a separate snapshot for the authenticated tenant and syncs draft', async () => {
    table.maybeSingle.mockResolvedValue({ data: { company_id: 'company-a' }, error: null });
    const config = defaultConfig(empty);
    const result = await publishOwnerSite('company-a', config);
    expect(result).toEqual({ published: true, sharePageSynced: true });
    expect(table.update).toHaveBeenCalledWith({ draft_config: config, published_config: config, published: true });
    expect(table.eq).toHaveBeenCalledWith('company_id', 'company-a');
    expect(table.update.mock.calls[0][0]).not.toHaveProperty('presence_enabled');
    expect(invoke).toHaveBeenCalledWith('publish-establishment-site', { body: { action: 'publish' } });
    expect(loadSiteDraft('company-a', defaultConfig(empty)).headline).toBe(config.headline);
  });
  it('keeps publication saved when the edge function fails or is unavailable', async () => {
    table.maybeSingle.mockResolvedValue({ data: { company_id: 'company-a' }, error: null });
    invoke.mockResolvedValueOnce({ data: null, error: new Error('FunctionsFetchError') });
    const config = defaultConfig(empty);
    await expect(publishOwnerSite('company-a', config)).resolves.toEqual({ published: true, sharePageSynced: false });
    expect(loadSiteDraft('company-a', defaultConfig(empty)).headline).toBe(config.headline);

    invoke.mockRejectedValueOnce(new Error('network down'));
    await expect(publishOwnerSite('company-a', config)).resolves.toEqual({ published: true, sharePageSynced: false });
  });
  it('surfaces server entitlement denial instead of claiming publication', async () => {
    table.maybeSingle.mockResolvedValue({ data: null, error: { code: '23514', message: 'entitlement denied' } });
    await expect(publishOwnerSite('company-a', defaultConfig(empty))).rejects.toMatchObject({ code: '23514' });
    expect(localStorage.length).toBe(0);
  });
  it('unpublishes without deleting drafts or the published snapshot', async () => {
    table.single.mockResolvedValue({ data: { company_id: 'company-a' }, error: null });
    await expect(unpublishOwnerSite('company-a')).resolves.toEqual({ published: false, sharePageSynced: true });
    expect(table.update).toHaveBeenCalledWith({ published: false });
    expect(table.eq).toHaveBeenCalledWith('company_id', 'company-a');

    invoke.mockResolvedValueOnce({ data: null, error: new Error('unavailable') });
    await expect(unpublishOwnerSite('company-a')).resolves.toEqual({ published: false, sharePageSynced: false });
  });
});
