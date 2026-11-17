// Serve o build (dist/) aplicando os headers do vercel.json, para testar
// o comportamento real de X-Frame-Options/CSP sem depender da Vercel.
// Também sobe uma "origem externa" (outra porta) que tenta embutir o site.
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), 'dist');
const vercel = JSON.parse(readFileSync(path.resolve(process.cwd(), 'vercel.json'), 'utf8'));
const appPort = Number(process.env.APP_PORT || 4310);
const foreignPort = Number(process.env.FOREIGN_PORT || 4311);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2' };

const rules = (vercel.headers ?? []).map((rule) => ({ re: new RegExp(`^${rule.source}$`), headers: rule.headers }));

createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  for (const rule of rules) if (rule.re.test(pathname)) for (const h of rule.headers) res.setHeader(h.key, h.value);
  let file = path.join(root, pathname);
  if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) file = path.join(root, 'index.html');
  res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
  res.end(readFileSync(file));
}).listen(appPort, '127.0.0.1');

createServer((req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(`<!doctype html><title>origem externa</title><iframe id="alvo" src="http://127.0.0.1:${appPort}/#/demo/barber/agenda" width="800" height="600"></iframe>`);
}).listen(foreignPort, '127.0.0.1');

console.log(`app em http://127.0.0.1:${appPort} · origem externa em http://127.0.0.1:${foreignPort}`);
