import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// Concluir atendimento só pelo fluxo completo (CheckoutModal -> complete_appointment*):
// é ele que grava finance_records, comissão, taxa de máquina, produtos e "Tempo de trabalho".
// Um update direto de status para 'Completed' pula tudo isso (bug do antigo "Concluir" do Meu Dia).
const ROOT = path.resolve(__dirname, '../..');
const SCAN_DIRS = ['components', 'pages', 'hooks', 'services', 'utils', 'contexts', 'lib'];

function sourceFiles(dir: string): string[] {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs, { withFileTypes: true }).flatMap((e) => {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : sourceFiles(rel);
    return /\.(ts|tsx)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [rel] : [];
  });
}

function updatePayloads(src: string): string[] {
  const out: string[] = [];
  let i = src.indexOf('.update(');
  while (i !== -1) {
    let depth = 0;
    let j = i + '.update'.length;
    for (; j < src.length; j++) {
      if (src[j] === '(') depth++;
      else if (src[j] === ')' && --depth === 0) break;
    }
    out.push(src.slice(i, j + 1));
    i = src.indexOf('.update(', j);
  }
  return out;
}

describe('conclusão de atendimento usa o fluxo completo', () => {
  const files = SCAN_DIRS.flatMap(sourceFiles);

  it('nenhum código de app conclui atendimento com update direto de status', () => {
    const offenders = files.filter((f) => {
      const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
      return updatePayloads(src).some((p) => /status\s*:\s*['"]Completed['"]/.test(p));
    });
    expect(offenders).toEqual([]);
  });

  it('não existe helper genérico que grava status arbitrário em appointments', () => {
    const offenders = files.filter((f) =>
      /export\s+async\s+function\s+updateAppointmentStatus\b/.test(fs.readFileSync(path.join(ROOT, f), 'utf8')),
    );
    expect(offenders).toEqual([]);
  });

  it('nenhum código de app conclui pelo atalho mutate({ status: "Completed" })', () => {
    const offenders = files.filter((f) =>
      /mutate(Async)?\(\s*\{[^}]*status\s*:\s*['"]Completed['"]/.test(fs.readFileSync(path.join(ROOT, f), 'utf8')),
    );
    expect(offenders).toEqual([]);
  });

  it('o guard enxerga o padrão (autoteste)', () => {
    expect(updatePayloads(".from('appointments').update({ status: 'Completed' }).eq('id', id)")[0]).toMatch(/Completed/);
  });
});
