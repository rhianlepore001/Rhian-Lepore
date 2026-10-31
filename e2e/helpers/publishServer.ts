import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { fileURLToPath } from 'node:url';

/**
 * Simula a Vercel: serve uma pasta de build e deixa o teste "publicar" outra.
 * Cache-Control segue o vercel.json (index/sw/version sem cache; /assets imutável).
 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

export function buildApp(buildId: string, tag: string): string {
  const outDir = path.join(os.tmpdir(), `agendix-update-e2e-${tag}-${buildId}`);
  fs.rmSync(outDir, { recursive: true, force: true });
  execFileSync('npx', ['vite', 'build', '--outDir', outDir, '--emptyOutDir'], {
    cwd: ROOT,
    stdio: 'pipe',
    env: {
      ...process.env,
      APP_BUILD_ID: buildId,
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || 'https://example.supabase.co',
      VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || 'test-anon-key-for-ci',
    },
  });
  return outDir;
}

export interface PublishServer {
  origin: string;
  /** Publica um build. `swDir` mantém um sw.js antigo no ar (simula Service Worker travado). */
  publish(siteDir: string, swDir?: string): void;
  close(): Promise<void>;
}

export async function startPublishServer(initialDir: string): Promise<PublishServer> {
  let siteDir = initialDir;
  let swDir = initialDir;

  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);
    const isSwFile = pathname === '/sw.js' || pathname === '/sw-bridge.js' || /^\/workbox-[\w-]+\.js$/.test(pathname);
    const base = isSwFile ? swDir : siteDir;
    let file = path.join(base, pathname);
    if (!file.startsWith(base)) {
      res.writeHead(403).end();
      return;
    }
    const exists = fs.existsSync(file) && fs.statSync(file).isFile();
    if (!exists) {
      if (pathname.startsWith('/assets/')) {
        res.writeHead(404, { 'Content-Type': 'text/plain' }).end('not found');
        return;
      }
      file = path.join(siteDir, 'index.html'); // rewrite do SPA
    }
    const noCache = !pathname.startsWith('/assets/');
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream',
      'Cache-Control': noCache ? 'no-cache, max-age=0, must-revalidate' : 'public, max-age=31536000, immutable',
    });
    fs.createReadStream(file).pipe(res);
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;

  return {
    origin: `http://localhost:${port}`,
    publish(nextSiteDir, nextSwDir) {
      siteDir = nextSiteDir;
      swDir = nextSwDir ?? nextSiteDir;
    },
    close: () => new Promise<void>((resolve) => { server.close(() => resolve()); server.closeAllConnections(); }),
  };
}
