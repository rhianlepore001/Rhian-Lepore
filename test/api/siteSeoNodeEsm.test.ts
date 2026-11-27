import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const ENTRY = path.join(ROOT, 'api/site-seo.ts');
const RELATIVE_SPECIFIER = /(?:^|[\s;])(?:import|export)\s[^'"]*?from\s*['"](\.{1,2}\/[^'"]+)['"]|import\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g;

const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'site-seo-esm-'));

function relativeSpecifiers(source: string): string[] {
  return Array.from(source.matchAll(RELATIVE_SPECIFIER), match => match[1] || match[2]);
}

/**
 * Compila arquivo a arquivo, sem bundler, como a Vercel faz com funções Node ESM:
 * os specifiers relativos ficam exatamente como estão no código.
 */
function compileGraph(entry: string): { files: string[]; missingExtension: string[] } {
  const seen = new Set<string>();
  const missingExtension: string[] = [];
  const queue = [entry];
  while (queue.length) {
    const file = queue.shift()!;
    if (seen.has(file)) continue;
    seen.add(file);
    const source = fs.readFileSync(file, 'utf8');
    const output = ts.transpileModule(source, {
      fileName: file,
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
        verbatimModuleSyntax: false,
        isolatedModules: true,
      },
    }).outputText;
    const target = path.join(outDir, path.relative(ROOT, file)).replace(/\.ts$/, '.js');
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, output);
    for (const specifier of relativeSpecifiers(output)) {
      const rel = `${path.relative(ROOT, file)} -> ${specifier}`;
      if (!specifier.endsWith('.js')) {
        missingExtension.push(rel);
        const candidate = path.resolve(path.dirname(file), `${specifier}.ts`);
        if (fs.existsSync(candidate)) queue.push(candidate);
        continue;
      }
      const tsFile = path.resolve(path.dirname(file), specifier.replace(/\.js$/, '.ts'));
      if (fs.existsSync(tsFile)) queue.push(tsFile);
    }
  }
  return { files: [...seen].map(file => path.relative(ROOT, file)), missingExtension };
}

afterAll(() => {
  fs.rmSync(outDir, { recursive: true, force: true });
});

describe('api/site-seo em Node ESM real (como roda na Vercel)', () => {
  const graph = compileGraph(ENTRY);

  it('todo import relativo do grafo de api/site-seo.ts termina em .js', () => {
    expect(graph.files).toEqual(expect.arrayContaining(['api/site-seo.ts', 'api/_lib/siteSeo.ts', 'lib/establishment/model.ts']));
    expect(graph.missingExtension).toEqual([]);
  });

  it('o módulo compilado carrega no Node sem ERR_MODULE_NOT_FOUND', () => {
    fs.writeFileSync(path.join(outDir, 'package.json'), JSON.stringify({ type: 'module' }));
    const moduleUrl = pathToFileURL(path.join(outDir, 'api/site-seo.js')).href;
    const script = `const mod = await import(${JSON.stringify(moduleUrl)}); if (typeof mod.default !== 'function') { throw new Error('handler ausente'); } console.log('ok');`;
    let stdout = '';
    let failure = '';
    try {
      stdout = execFileSync(process.execPath, ['--input-type=module', '-e', script], {
        cwd: outDir,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error) {
      const err = error as { stderr?: string; message: string };
      failure = err.stderr || err.message;
    }
    expect(failure).toBe('');
    expect(stdout.trim()).toBe('ok');
  });
});
