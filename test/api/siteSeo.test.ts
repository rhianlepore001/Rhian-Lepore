import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vercel from '../../vercel.json';
import { createVercelSiteSeoHandler, publishedStorageUrl, resolveSupabaseOrigin } from '../../api/_lib/siteSeo';

describe('Vercel SEO endpoint (/s/:slug & /sitemap.xml)', () => {
  it('routes /sitemap.xml, /s/:slug and /s/:slug/servico/:serviceId before SPA catch-all without breaking SPA exclusions', () => {
    const rewrites = (vercel as { rewrites?: Array<{ source: string; destination: string }> }).rewrites ?? [];
    expect(rewrites).toEqual([
      { source: '/sitemap.xml', destination: '/api/site-seo?kind=sitemap' },
      { source: '/s/:slug/servico/:serviceId', destination: '/api/site-seo?kind=service&slug=:slug&serviceId=:serviceId' },
      { source: '/s/:slug', destination: '/api/site-seo?kind=site&slug=:slug' },
      { source: '/((?!assets/)(?!api/).*)', destination: '/index.html' },
    ]);
  });

  it('locks Supabase storage origin to the official AgendiX project', () => {
    expect(resolveSupabaseOrigin()).toBe('https://lcqwrngscsziysyfhpfj.supabase.co');
    expect(resolveSupabaseOrigin('https://outro.supabase.co')).toBe('https://lcqwrngscsziysyfhpfj.supabase.co');
    expect(resolveSupabaseOrigin('https://lcqwrngscsziysyfhpfj.supabase.co/')).toBe('https://lcqwrngscsziysyfhpfj.supabase.co');
    expect(publishedStorageUrl('https://lcqwrngscsziysyfhpfj.supabase.co', 'sites/corte-fino.html')).toBe(
      'https://lcqwrngscsziysyfhpfj.supabase.co/storage/v1/object/public/published-sites/sites/corte-fino.html',
    );
  });

  it('serves HTML and XML with proper Content-Type and security headers while rejecting reserved slugs', async () => {
    const files = new Map<string, string>([
      ['sites/corte-fino.html', '<!DOCTYPE html><html><head><title>Corte Fino</title></head></html>'],
      ['sites/corte-fino/servico/srv-1.html', '<!DOCTYPE html><html><head><title>Corte — Corte Fino</title></head></html>'],
      ['sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?><urlset><url><loc>https://www.agendixstudio.com/s/corte-fino</loc></url></urlset>'],
    ]);

    const handler = createVercelSiteSeoHandler({
      readPublishedFile: async file => files.get(file) ?? null,
    });

    const siteRes = await handler(new Request('https://www.agendixstudio.com/api/site-seo?kind=site&slug=Corte-Fino'));
    expect(siteRes.status).toBe(200);
    expect(siteRes.headers.get('Content-Type')).toBe('text/html; charset=utf-8');
    expect(siteRes.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(siteRes.headers.get('X-Frame-Options')).toBe('SAMEORIGIN');
    expect(siteRes.headers.get('Cache-Control')).toContain('max-age=60');
    expect(await siteRes.text()).toContain('Corte Fino');

    const serviceRes = await handler(
      new Request('https://www.agendixstudio.com/api/site-seo?kind=service&slug=corte-fino&serviceId=srv-1'),
    );
    expect(serviceRes.status).toBe(200);
    expect(serviceRes.headers.get('Content-Type')).toBe('text/html; charset=utf-8');
    expect(await serviceRes.text()).toContain('Corte — Corte Fino');

    const xmlRes = await handler(new Request('https://www.agendixstudio.com/api/site-seo?kind=sitemap'));
    expect(xmlRes.status).toBe(200);
    expect(xmlRes.headers.get('Content-Type')).toBe('application/xml; charset=utf-8');
    expect(await xmlRes.text()).toContain('/s/corte-fino');

    const headRes = await handler(
      new Request('https://www.agendixstudio.com/api/site-seo?kind=site&slug=corte-fino', { method: 'HEAD' }),
    );
    expect(headRes.status).toBe(200);
    expect(await headRes.text()).toBe('');

    const reservedRes = await handler(new Request('https://www.agendixstudio.com/api/site-seo?kind=site&slug=admin'));
    expect(reservedRes.status).toBe(404);

    const traversalRes = await handler(new Request('https://www.agendixstudio.com/api/site-seo?kind=site&slug=../sitemap'));
    expect(traversalRes.status).toBe(404);

    const postRes = await handler(new Request('https://www.agendixstudio.com/api/site-seo?kind=sitemap', { method: 'POST' }));
    expect(postRes.status).toBe(405);

    const entrySource = fs.readFileSync(path.resolve(process.cwd(), 'api/site-seo.ts'), 'utf8');
    expect(entrySource).toContain('createVercelSiteSeoHandler');
  });
});
