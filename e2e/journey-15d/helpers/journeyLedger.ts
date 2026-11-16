import fs from 'node:fs';
import path from 'node:path';

export type FeatureVerdict = 'pass' | 'fail' | 'skip' | 'warn';

export interface FeatureResult {
  id: string;
  day: number;
  title: string;
  verdict: FeatureVerdict;
  detail?: string;
  error?: string;
  ms: number;
}

export function journeyOutputDir() {
  if (!process.env.JOURNEY_RUN_ID) throw new Error('JOURNEY_RUN_ID ausente: use a config da jornada');
  return path.join(process.env.JOURNEY_OUT_DIR || path.join(process.cwd(), 'artifacts', 'journey-15d'), process.env.JOURNEY_RUN_ID);
}

export class JourneyLedger {
  private readonly results: FeatureResult[] = [];
  private readonly startedAt = Date.now();
  private readonly output = journeyOutputDir();

  constructor(public readonly environment: string) {
    fs.mkdirSync(this.output, { recursive: true });
  }

  async run(id: string, day: number, title: string, fn: () => Promise<void>): Promise<void> {
    const t0 = Date.now();
    try {
      await fn();
      if (!this.results.some((result) => result.id === id)) this.results.push({ id, day, title, verdict: 'pass', ms: Date.now() - t0 });
    } catch (error) {
      this.record({ id, day, title, verdict: 'fail', error: error instanceof Error ? error.message : String(error), ms: Date.now() - t0 });
      throw error;
    }
  }

  private record(result: FeatureResult) {
    const index = this.results.findIndex((previous) => previous.id === result.id);
    if (index < 0) this.results.push(result);
    else this.results[index] = result;
  }

  warn(id: string, day: number, title: string, detail: string) {
    this.record({ id, day, title, verdict: 'warn', detail, ms: 0 });
  }

  skip(id: string, day: number, title: string, detail: string) {
    this.record({ id, day, title, verdict: 'skip', detail, ms: 0 });
  }

  flush() {
    const payload = { environment: this.environment, startedAt: this.startedAt, finishedAt: Date.now(), results: this.results };
    fs.writeFileSync(path.join(this.output, `ledger-${this.environment}.json`), JSON.stringify(payload, null, 2));
    return payload;
  }

  static readAll(): ReturnType<JourneyLedger['flush']>[] {
    const output = journeyOutputDir();
    if (!fs.existsSync(output)) return [];
    return fs.readdirSync(output).filter((file) => file.startsWith('ledger-') && file.endsWith('.json'))
      .map((file) => JSON.parse(fs.readFileSync(path.join(output, file), 'utf8')));
  }
}
