import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';
import fs from 'node:fs';
import path from 'node:path';
import { JourneyLedger, type FeatureResult } from '../helpers/journeyLedger';

const OUT = process.env.JOURNEY_OUT_DIR || path.join(process.cwd(), 'artifacts', 'journey-15d');

function grade(score: number): string {
  if (score >= 9) return 'A';
  if (score >= 7.5) return 'B';
  if (score >= 6) return 'C';
  if (score >= 4) return 'D';
  return 'F';
}

function buildMarkdown(
  ledgers: Array<{
    environment: string;
    results: FeatureResult[];
  }>,
  playwrightFails: string[],
): string {
  const lines: string[] = [
    '# Relatório crítico — Journey E2E 15 dias',
    '',
    `Gerado: ${new Date().toISOString()}`,
    '',
    '## Nota por ambiente',
    '',
    '| Ambiente | Nota | Resumo |',
    '|---|---|---|',
  ];

  const envScores: Array<{ env: string; score: number; note: string }> = [];

  for (const ledger of ledgers) {
    const total = ledger.results.filter((r) => r.verdict !== 'skip').length || 1;
    const pass = ledger.results.filter((r) => r.verdict === 'pass').length;
    const fail = ledger.results.filter((r) => r.verdict === 'fail').length;
    const warn = ledger.results.filter((r) => r.verdict === 'warn').length;
    const score = Math.max(0, Math.round(((pass + warn * 0.5) / total) * 10 * 10) / 10);
    const letter = grade(score);
    envScores.push({ env: ledger.environment, score, note: letter });
    lines.push(`| ${ledger.environment} | **${score}/10** (${letter}) | pass ${pass} · fail ${fail} · warn ${warn} |`);
  }

  const avg =
    envScores.length > 0
      ? Math.round((envScores.reduce((a, b) => a + b.score, 0) / envScores.length) * 10) / 10
      : 0;
  lines.push(
    '',
    `## Nota global: **${avg}/10** (${grade(avg)})`,
    '',
    '### Pontos críticos (achados conhecidos + falhas de runtime)',
    '',
    '- **CAM-001** — Staff/recepção não confirma booking online (impacto operação multi-cadeira).',
    '- **CAM-013** — Copy “confirmado” com pedido ainda `pending` (confiança do cliente).',
    '- **CAM-014** — Double-book em booking público sem RPC atômica.',
    '- **CAM-020** — Staff não conclui na Agenda; checkout só na fila (treinamento).',
    '- Journey **mock** não cobre RPC `complete_appointment` nem Stripe; use `journey-live-15d` com credenciais.',
    '',
  );

  if (playwrightFails.length) {
    lines.push('### Falhas Playwright nesta execução', '');
    playwrightFails.forEach((f) => lines.push(`- ${f}`));
    lines.push('');
  }

  lines.push('## Detalhe por feature', '');
  for (const ledger of ledgers) {
    lines.push(`### ${ledger.environment}`, '', '| Dia | ID | Resultado | Detalhe |', '|---:|---|---|---|');
    for (const r of ledger.results) {
      const detail = r.error || r.detail || '—';
      lines.push(`| ${r.day} | ${r.id} | ${r.verdict} | ${detail.replace(/\|/g, '\\|')} |`);
    }
    lines.push('');
  }

  lines.push(
    '## Recomendações',
    '',
    '1. Priorizar correção **CAM-001/CAM-023** antes de campanha com recepcionista.',
    '2. Alinhar copy pública (**CAM-013**) com estado real do pedido.',
    '3. Rodar `journey-live-15d` em staging com conta seed antes de release.',
    '4. Manter matriz `e2e/campaign-30d/MATRIX.md` como backlog de produto.',
    '',
  );

  return lines.join('\n');
}

class JourneyMarkdownReporter implements Reporter {
  private fails: string[] = [];

  onTestEnd(test: TestCase, result: TestResult) {
    if (result.status !== 'passed') {
      this.fails.push(`${test.title} [${test.parent.project()?.name}] — ${result.status}`);
    }
  }

  async onEnd(result: FullResult) {
    fs.mkdirSync(OUT, { recursive: true });
    const ledgers = JourneyLedger.readAll().map((l) => ({
      environment: l.environment,
      results: l.results,
    }));
    const md = buildMarkdown(ledgers, this.fails);
    fs.writeFileSync(path.join(OUT, 'RELATORIO.md'), md);
    fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify({ exit: result.status, ledgers, fails: this.fails }, null, 2));
  }

  printsToStdio() {
    return true;
  }
}

export default JourneyMarkdownReporter;
