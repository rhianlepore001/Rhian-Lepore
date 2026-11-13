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

const OUT_DIR =
  process.env.JOURNEY_OUT_DIR ||
  path.join(process.cwd(), 'artifacts', 'journey-15d');

function ledgerPath(environment: string) {
  return path.join(OUT_DIR, `ledger-${environment}.json`);
}

export class JourneyLedger {
  private readonly results: FeatureResult[] = [];
  private startedAt = Date.now();

  constructor(public readonly environment: string) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  async run(
    id: string,
    day: number,
    title: string,
    fn: () => Promise<void>,
  ): Promise<void> {
    const t0 = Date.now();
    try {
      await fn();
      this.results.push({ id, day, title, verdict: 'pass', ms: Date.now() - t0 });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.results.push({ id, day, title, verdict: 'fail', error: msg, ms: Date.now() - t0 });
    }
  }

  warn(id: string, day: number, title: string, detail: string) {
    this.results.push({ id, day, title, verdict: 'warn', detail, ms: 0 });
  }

  skip(id: string, day: number, title: string, detail: string) {
    this.results.push({ id, day, title, verdict: 'skip', detail, ms: 0 });
  }

  flush() {
    const payload = {
      environment: this.environment,
      startedAt: this.startedAt,
      finishedAt: Date.now(),
      results: this.results,
    };
    fs.writeFileSync(ledgerPath(this.environment), JSON.stringify(payload, null, 2));
    return payload;
  }

  static readAll(): Array<{
    environment: string;
    startedAt: number;
    finishedAt: number;
    results: FeatureResult[];
  }> {
    if (!fs.existsSync(OUT_DIR)) return [];
    return fs
      .readdirSync(OUT_DIR)
      .filter((f) => f.startsWith('ledger-') && f.endsWith('.json'))
      .map((f) => JSON.parse(fs.readFileSync(path.join(OUT_DIR, f), 'utf8')));
  }
}
