import type { IncomingMessage, ServerResponse } from 'node:http';
import { createVercelSiteSeoHandler, publishedStorageUrl, resolveSupabaseOrigin } from './_lib/siteSeo';

const supabaseOrigin = resolveSupabaseOrigin(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL);

const seoHandler = createVercelSiteSeoHandler({
  async readPublishedFile(path) {
    try {
      const response = await fetch(publishedStorageUrl(supabaseOrigin, path), {
        cache: 'no-store',
      });
      if (!response.ok) return null;
      return await response.text();
    } catch {
      return null;
    }
  },
});

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const host = req.headers.host || 'www.agendixstudio.com';
  const protoHeader = req.headers['x-forwarded-proto'];
  const proto = typeof protoHeader === 'string' && protoHeader.split(',')[0].trim() === 'http' ? 'http' : 'https';
  let targetUrl: URL;
  try {
    targetUrl = new URL(req.url || '/', `${proto}://${host}`);
  } catch {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Bad Request');
    return;
  }

  const response = await seoHandler(new Request(targetUrl.href, { method: req.method || 'GET' }));
  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  if (req.method === 'HEAD' || response.body === null) {
    res.end();
    return;
  }

  const text = await response.text();
  res.end(text);
}
