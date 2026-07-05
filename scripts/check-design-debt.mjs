#!/usr/bin/env node
// Ratchet de dívida de design: impede NOVAS violações dos anti-padrões do
// design system (MASTER.md §13) sem exigir zerar o legado de uma vez.
//
// Como funciona: conta ocorrências por arquivo+padrão e compara com o
// baseline commitado. Acima do baseline → falha. Abaixo → avisa pra apertar.
//
// Uso:
//   node scripts/check-design-debt.mjs            # verifica (usado no lint)
//   node scripts/check-design-debt.mjs --update   # regrava o baseline

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const BASELINE_PATH = join(ROOT, 'scripts', 'design-debt-baseline.json');
const SCAN_DIRS = ['pages', 'components'];

const PATTERNS = {
  'fonte-sub-12px (use text-xs)': /text-\[(?:9|10|11)px\]/g,
  'text-white hardcoded (use colors.text)': /\btext-white\b/g,
  'text-neutral hardcoded (use colors.textSecondary/textMuted)': /\btext-neutral-[3456]00\b/g,
  'modal custom fixed inset-0 (use ui/Modal)': /fixed inset-0/g,
  'shadow generico (use tokens shadow-*, MASTER.md §8)': /\bshadow-(?:sm|md|lg|xl|2xl)\b/g,
  'hover interpolado (quebra no build estatico)': /hover:\$\{/g,
  'wa.me com DDI fixo (use buildWhatsAppLink)': /wa\.me\/55/g,
};

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === '__tests__' || name === 'node_modules') continue;
      out.push(...walk(full));
    } else if (/\.tsx$/.test(name) && !/\.test\.tsx$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

function scan() {
  const counts = {};
  for (const dir of SCAN_DIRS) {
    for (const file of walk(join(ROOT, dir))) {
      const src = readFileSync(file, 'utf-8');
      const rel = relative(ROOT, file);
      for (const [label, re] of Object.entries(PATTERNS)) {
        const n = (src.match(re) || []).length;
        if (n > 0) {
          counts[rel] = counts[rel] || {};
          counts[rel][label] = n;
        }
      }
    }
  }
  return counts;
}

const current = scan();

if (process.argv.includes('--update')) {
  writeFileSync(BASELINE_PATH, JSON.stringify(current, null, 2) + '\n');
  console.log(`Baseline atualizado: ${BASELINE_PATH}`);
  process.exit(0);
}

let baseline = {};
try {
  baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf-8'));
} catch {
  console.error('Baseline ausente. Rode: node scripts/check-design-debt.mjs --update');
  process.exit(1);
}

const errors = [];
const improvements = [];

for (const [file, patterns] of Object.entries(current)) {
  for (const [label, n] of Object.entries(patterns)) {
    const base = baseline[file]?.[label] ?? 0;
    if (n > base) {
      errors.push(`  ${file} — ${label}: ${n} (baseline: ${base})`);
    } else if (n < base) {
      improvements.push(`  ${file} — ${label}: ${n} (baseline: ${base})`);
    }
  }
}

if (improvements.length > 0) {
  console.log('Dívida reduzida (aperte o baseline com --update):');
  console.log(improvements.join('\n'));
}

if (errors.length > 0) {
  console.error('\nNovas violações do design system (MASTER.md §13):');
  console.error(errors.join('\n'));
  console.error('\nCorrija usando tokens do useBrutalTheme() ou, se for intencional,');
  console.error('atualize o baseline: node scripts/check-design-debt.mjs --update');
  process.exit(1);
}

console.log('check-design-debt: ok (nenhuma violação nova)');
