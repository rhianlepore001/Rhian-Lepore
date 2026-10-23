import { readFileSync } from 'node:fs';
import ts from 'typescript';

export function loadEdgeHandler(
  file: string,
  bindings: Record<string, unknown>,
): (request: Request) => Promise<Response> {
  let handler: ((request: Request) => Promise<Response>) | undefined;
  const source = readFileSync(file, 'utf8');
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
  const stripped = ts.factory.updateSourceFile(
    parsed, parsed.statements.filter((statement) => !ts.isImportDeclaration(statement)),
  );
  const compiled = ts.transpileModule(ts.createPrinter().printFile(stripped), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText;
  const injected = {
    ...bindings,
    exports: {},
    serve: (callback: (request: Request) => Promise<Response>) => { handler = callback; },
  };
  new Function(...Object.keys(injected), compiled)(...Object.values(injected));
  if (!handler) throw new Error('Edge handler was not registered');
  return handler;
}
