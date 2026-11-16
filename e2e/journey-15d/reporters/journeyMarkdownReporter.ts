import type { FullConfig, FullResult, Reporter, Suite, TestCase, TestResult } from '@playwright/test/reporter';
import fs from 'node:fs';
import path from 'node:path';
import { JourneyLedger, journeyOutputDir, type FeatureResult } from '../helpers/journeyLedger';

export function buildMarkdown(ledgers: Array<{ environment: string; results: FeatureResult[] }>, environments: string[], failures: string[], expected = 15): string {
  const lines = [
    '# Relatório — cenários mock e smoke da jornada', '',
    `Execução: ${process.env.JOURNEY_RUN_ID}`, '',
    'A nota mede somente as asserções destes cenários. Não certifica features completas, onboarding, checkout, Stripe ou segurança do backend real.', '',
    '| Ambiente | Nota dos cenários | Pass | Fail | Warn | Skip | Ausentes |',
    '|---|---:|---:|---:|---:|---:|---:|',
  ];
  for (const environment of environments) {
    const results = ledgers.find((ledger) => ledger.environment === environment)?.results ?? [];
    const count = (verdict: string) => results.filter((result) => result.verdict === verdict).length;
    const missing = Math.max(0, expected - results.length);
    const failed = failures.some((failure) => failure.startsWith(`[${environment}]`));
    const score = failed ? 0 : Math.round(count('pass') / expected * 100) / 10;
    lines.push(`| ${environment} | ${score}/10 | ${count('pass')} | ${count('fail')} | ${count('warn')} | ${count('skip')} | ${missing} |`);
  }
  if (failures.length) lines.push('', '## Falhas Playwright nesta execução', '', ...failures.map((failure) => `- ${failure}`));
  for (const ledger of ledgers) {
    lines.push('', `## ${ledger.environment}`, '', '| Dia | Cenário | Resultado | Detalhe |', '|---:|---|---|---|');
    for (const result of ledger.results) {
      const detail = (result.error || result.detail || result.title).replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
      lines.push(`| ${result.day} | ${result.id} | ${result.verdict} | ${detail} |`);
    }
  }
  return lines.join('\n');
}

class JourneyMarkdownReporter implements Reporter {
  private readonly failures: string[] = [];
  private environments: string[] = [];

  constructor(private readonly options: { expectedScenarios?: number } = {}) {}

  onBegin(_config: FullConfig, suite: Suite) {
    this.environments = [...new Set(suite.allTests().map((test) => test.parent.project()!.name))];
  }

  onTestEnd(test: TestCase, result: TestResult) {
    if (result.status !== 'passed') this.failures.push(`[${test.parent.project()?.name}] ${test.title} — ${result.status}`);
  }

  onError(error: { message?: string }) {
    for (const environment of this.environments) this.failures.push(`[${environment}] ${error.message || 'erro global'}`);
  }

  onEnd(result: FullResult) {
    const output = journeyOutputDir();
    fs.mkdirSync(output, { recursive: true });
    const ledgers = JourneyLedger.readAll();
    fs.writeFileSync(path.join(output, 'RELATORIO.md'), buildMarkdown(ledgers, this.environments, this.failures, this.options.expectedScenarios ?? 15));
    fs.writeFileSync(path.join(output, 'summary.json'), JSON.stringify({ runId: process.env.JOURNEY_RUN_ID, exit: result.status, ledgers, failures: this.failures }, null, 2));
  }
}

export default JourneyMarkdownReporter;
