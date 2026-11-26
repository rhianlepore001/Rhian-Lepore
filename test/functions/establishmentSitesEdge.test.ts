import { describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createPublishEstablishmentSiteHandler } from '../../supabase/functions/publish-establishment-site/handler';
import { createServeEstablishmentSiteHandler } from '../../supabase/functions/serve-establishment-site/handler';

describe('establishment site edge handlers', () => {
  it('blocks unauthorized and reserved slug publish requests', async () => {
    const publish = createPublishEstablishmentSiteHandler({
      siteOrigin: 'https://www.agendixstudio.com',
      getUserFromToken: async () => null,
      getOwnerSiteByUser: async () => null,
      listPublishedSlugs: async () => [],
      uploadPublishedFile: vi.fn(),
      removePublishedPrefix: vi.fn(),
    });

    const unauth = await publish(new Request('https://edge.local', { method: 'POST' }));
    expect(unauth.status).toBe(401);

    const reserved = createPublishEstablishmentSiteHandler({
      siteOrigin: 'https://www.agendixstudio.com',
      getUserFromToken: async () => ({ id: 'u1' }),
      getOwnerSiteByUser: async () => ({
        companyId: 'u1',
        role: 'owner',
        slug: 'admin',
        name: 'Admin',
        kind: 'barber',
        region: 'BR',
        address: '',
        presenceEnabled: true,
        published: true,
        publishedConfig: {},
        services: [],
      }),
      listPublishedSlugs: async () => [],
      uploadPublishedFile: vi.fn(),
      removePublishedPrefix: vi.fn(),
    });

    const res = await reserved(
      new Request('https://edge.local', { method: 'POST', headers: { Authorization: 'Bearer tok' } }),
    );
    expect(res.status).toBe(400);
  });

  it('publishes static home, service HTML and sitemap, then serves /s/:slug and /sitemap.xml', async () => {
    const files = new Map<string, string>();
    const publish = createPublishEstablishmentSiteHandler({
      siteOrigin: 'https://www.agendixstudio.com',
      getUserFromToken: async () => ({ id: 'u1' }),
      getOwnerSiteByUser: async () => ({
        companyId: 'u1',
        role: 'owner',
        slug: 'corte-fino',
        name: 'Corte Fino',
        kind: 'barber',
        region: 'BR',
        address: 'Rua A, 10 — Pinheiros',
        instagram: '@cortefino.sp',
        cover: 'https://lcqwrngscsziysyfhpfj.supabase.co/storage/v1/object/public/galleries/u1/hero.webp',
        presenceEnabled: true,
        published: true,
        publishedConfig: { headline: 'Corte preciso' },
        services: [
          {
            id: 'srv-1',
            name: 'Corte',
            price: 50,
            duration: 30,
            image: 'https://lcqwrngscsziysyfhpfj.supabase.co/storage/v1/object/public/avatars/u1/barbeiro.webp',
          },
          {
            id: 'srv-2',
            name: 'Barba',
            price: 35,
            duration: 20,
            image: 'https://outro.supabase.co/storage/v1/object/public/service_images/u1/bad.webp',
          },
        ],
      }),
      listPublishedSlugs: async () => [{ slug: 'corte-fino', updated_at: '2026-11-25T18:00:00Z' }],
      uploadPublishedFile: async (path, content) => {
        files.set(path, content);
      },
      removePublishedPrefix: async () => undefined,
    });

    const pubRes = await publish(
      new Request('https://edge.local', {
        method: 'POST',
        headers: { Authorization: 'Bearer tok' },
        body: JSON.stringify({ action: 'publish' }),
      }),
    );
    expect(pubRes.status).toBe(200);
    expect(files.has('sites/corte-fino.html')).toBe(true);
    expect(files.has('sites/corte-fino/servico/srv-1.html')).toBe(true);
    expect(files.has('sitemap.xml')).toBe(true);

    const serve = createServeEstablishmentSiteHandler({
      readPublishedFile: async path => files.get(path) ?? null,
    });

    const homeRes = await serve(new Request('https://www.agendixstudio.com/s/corte-fino'));
    expect(homeRes.status).toBe(200);
    expect(homeRes.headers.get('Content-Type')).toContain('text/html');
    const homeHtml = await homeRes.text();
    expect(homeHtml).toContain('Corte preciso');
    expect(homeHtml).toContain('https://www.instagram.com/cortefino.sp/');
    expect(homeHtml).toContain('@cortefino.sp');
    expect(homeHtml).toContain('lcqwrngscsziysyfhpfj.supabase.co/storage/v1/object/public/galleries/u1/hero.webp');
    const avatarServiceHtml = files.get('sites/corte-fino/servico/srv-1.html') || '';
    expect(avatarServiceHtml).toContain('lcqwrngscsziysyfhpfj.supabase.co/storage/v1/object/public/avatars/u1/barbeiro.webp');
    const badServiceHtml = files.get('sites/corte-fino/servico/srv-2.html') || '';
    expect(badServiceHtml).not.toContain('outro.supabase.co');

    const mapRes = await serve(new Request('https://www.agendixstudio.com/sitemap.xml'));
    expect(mapRes.status).toBe(200);
    expect(await mapRes.text()).toContain('https://www.agendixstudio.com/s/corte-fino');

    const adminRes = await serve(new Request('https://www.agendixstudio.com/s/admin'));
    expect(adminRes.status).toBe(404);

    const fallbackRes = await serve(new Request('https://www.agendixstudio.com/s/ainda-nao-publicado?origem=google'));
    expect(fallbackRes.status).toBe(302);
    expect(fallbackRes.headers.get('Location')).toBe('/#/book/ainda-nao-publicado?origem=google');
    expect(fallbackRes.headers.get('Cache-Control')).toBe('no-store');
  });

  it('retorna CORS, rejeita slug malformado e exige companyId igual ao usuário', async () => {
    const base = {
      siteOrigin: 'https://www.agendixstudio.com',
      getUserFromToken: async () => ({ id: 'u1' }),
      listPublishedSlugs: async () => [],
      uploadPublishedFile: vi.fn(),
      removePublishedPrefix: vi.fn(),
    };
    const site = {
      companyId: 'u1', role: 'owner', slug: '../sitemap', name: 'X', kind: 'barber', region: 'BR' as const,
      address: '', presenceEnabled: true, published: true, publishedConfig: {}, services: [],
    };
    const bad = createPublishEstablishmentSiteHandler({ ...base, getOwnerSiteByUser: async () => site });
    const req = () => new Request('https://edge.local', { method: 'POST', headers: { Authorization: 'Bearer t' } });
    const badRes = await bad(req());
    expect(badRes.status).toBe(400);
    expect(badRes.headers.get('Access-Control-Allow-Origin')).toBe('https://www.agendixstudio.com');

    const other = createPublishEstablishmentSiteHandler({ ...base, getOwnerSiteByUser: async () => ({ ...site, slug: 'ok', companyId: 'outra' }) });
    expect((await other(req())).status).toBe(403);

    const pre = await bad(new Request('https://edge.local', { method: 'OPTIONS' }));
    expect(pre.status).toBe(204);
    expect(pre.headers.get('Access-Control-Allow-Methods')).toContain('POST');
  });

  it('configura verify_jwt explicitamente no supabase/config.toml e seleciona instagram_handle', () => {
    const configToml = fs.readFileSync(path.resolve(process.cwd(), 'supabase/config.toml'), 'utf8');
    expect(configToml).toMatch(/\[functions\.publish-establishment-site\][\s\S]*verify_jwt\s*=\s*true/);
    expect(configToml).toMatch(/\[functions\.serve-establishment-site\][\s\S]*verify_jwt\s*=\s*false/);

    const edgeEntry = fs.readFileSync(
      path.resolve(process.cwd(), 'supabase/functions/publish-establishment-site/index.ts'),
      'utf8',
    );
    expect(edgeEntry).toContain('instagram_handle');
  });
});
