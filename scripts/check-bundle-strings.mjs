#!/usr/bin/env node
/**
 * Pós-build: garante que recursos desligados não vazam no bundle de produção.
 * Com ASSISTANT_ENABLED = false (utils/featureFlags.ts), nenhum arquivo em dist/assets
 * pode conter textos do Assistente AgendiX. Roda em `npm run build` (postbuild), inclusive na Vercel.
 *
 *   node scripts/check-bundle-strings.mjs [distDir]
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const dist = path.resolve(process.argv[2] || path.join(root, 'dist'));
const flags = fs.readFileSync(path.join(root, 'utils/featureFlags.ts'), 'utf8');
const assistantOn = /export const ASSISTANT_ENABLED\s*=\s*true/.test(flags);

const FORBIDDEN = assistantOn ? [] : ['Assistente AgendiX', 'Sou seu assistente pessoal', 'Fechar assistente'];

const assets = path.join(dist, 'assets');
if (!fs.existsSync(assets)) {
  console.error(`check-bundle-strings: ${assets} não existe (rode o build antes).`);
  process.exit(1);
}
const files = fs.readdirSync(assets).filter((f) => /\.(js|css|html)$/.test(f));
const hits = [];
for (const f of files) {
  const text = fs.readFileSync(path.join(assets, f), 'utf8');
  for (const s of FORBIDDEN) if (text.includes(s)) hits.push(`${f}: "${s}"`);
}
if (hits.length) {
  console.error('check-bundle-strings: textos de recurso desligado no bundle:\n  ' + hits.join('\n  '));
  process.exit(1);
}
console.log(`check-bundle-strings: ok (${files.length} arquivos, ${FORBIDDEN.length} textos proibidos)`);
