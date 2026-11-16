import { afterEach, describe, expect, it, vi } from 'vitest';
import { virtualDayIso, virtualDayTime } from '../e2e/journey-15d/helpers/virtualCalendar';
import { JourneyLedger } from '../e2e/journey-15d/helpers/journeyLedger';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

afterEach(() => vi.unstubAllEnvs());

describe('calendário civil da jornada em São Paulo', () => {
  it.each([[1, '2026-09-01'], [2, '2026-09-02'], [15, '2026-09-15'], [31, '2026-10-01']])('D%s corresponde a %s', (day, iso) => {
    vi.stubEnv('E2E_TZ', 'America/Sao_Paulo');
    vi.stubEnv('E2E_ANCHOR_DATE', '2026-09-01');
    expect(virtualDayIso(day)).toBe(iso);
  });

  it('alinha o relógio às 09h no fuso do negócio, inclusive com offset histórico', () => {
    vi.stubEnv('E2E_ANCHOR_DATE', '2026-09-01');
    expect(virtualDayTime(1).toISOString()).toBe('2026-09-01T12:00:00.000Z');
    expect(virtualDayTime(15).toISOString()).toBe('2026-09-15T12:00:00.000Z');
    vi.stubEnv('E2E_ANCHOR_DATE', '2018-12-01');
    expect(virtualDayTime(1).toISOString()).toBe('2018-12-01T11:00:00.000Z');
  });

  it('atravessa o ano e fevereiro bissexto', () => {
    vi.stubEnv('E2E_ANCHOR_DATE', '2024-02-28');
    expect(virtualDayIso(2)).toBe('2024-02-29');
    expect(virtualDayIso(3)).toBe('2024-03-01');
    vi.stubEnv('E2E_ANCHOR_DATE', '2026-12-31');
    expect(virtualDayIso(2)).toBe('2027-01-01');
  });
});

describe('ledger da jornada', () => {
  it('registra a falha e propaga a exceção; finally preserva o relatório', async () => {
    vi.stubEnv('JOURNEY_RUN_ID', 'unit');
    vi.stubEnv('JOURNEY_OUT_DIR', fs.mkdtempSync(path.join(os.tmpdir(), 'journey-test-')));
    const ledger = new JourneyLedger('unit');
    const error = new Error('falha proposital');
    await expect((async () => {
      try {
        await ledger.run('D01', 1, 'cenário', async () => { throw error; });
      } finally {
        ledger.flush();
      }
    })()).rejects.toBe(error);
    expect(ledger.flush().results).toEqual([expect.objectContaining({ id: 'D01', verdict: 'fail' })]);
  });
});

describe('isolamento e destino', () => {
  it.each(['https://agendixstudio.com', 'http://example.com', 'https://localhost:3000', 'http://127.0.0.1.evil.test', 'http://user:pass@localhost:3000'])('recusa base mock %s', async (base) => {
    const { mockBaseUrl } = await import('../e2e/journey-15d/helpers/journeySafety');
    expect(() => mockBaseUrl(base)).toThrow();
  });

  it('aceita apenas as bases locais http', async () => {
    const { mockBaseUrl } = await import('../e2e/journey-15d/helpers/journeySafety');
    expect(mockBaseUrl('http://localhost:3000')).toBe('http://localhost:3000');
    expect(mockBaseUrl('http://127.0.0.1:3418/')).toBe('http://127.0.0.1:3418');
  });

  it.each([
    { E2E_BASE_URL: 'https://www.agendixstudio.com' },
    { E2E_BASE_URL: 'https://agendixstudio.com' },
    { E2E_BASE_URL: 'https://agendixstudio.com?x=1' },
    { E2E_BASE_URL: 'https://agendixstudio.com#x' },
    { E2E_BASE_URL: 'https://example.test@agendixstudio.com/' },
    { E2E_BASE_URL: 'https://www.agendixstudio.com./' },
    { VITE_SUPABASE_URL: 'https://lcqwrngscsziysyfhpfj.supabase.co' },
    { E2E_SUPABASE_REF: 'lcqwrngscsziysyfhpfj' },
  ])('recusa produção explicitamente no live: %o', async (target) => {
    const { assertLiveTarget } = await import('../e2e/journey-15d/helpers/journeySafety');
    expect(() => assertLiveTarget({ E2E_OWNER_EMAIL: 'fake@example.test', E2E_OWNER_PASS: 'fake', ...target })).toThrow(/produção/);
  });
});

describe('relatórios de execução', () => {
  it('não lê ledger de corrida anterior e mantém um veredito por cenário', async () => {
    vi.stubEnv('JOURNEY_OUT_DIR', fs.mkdtempSync(path.join(os.tmpdir(), 'journey-runs-')));
    vi.stubEnv('JOURNEY_RUN_ID', 'old');
    const old = new JourneyLedger('desktop');
    await old.run('D01', 1, 'antigo', async () => undefined);
    old.flush();
    vi.stubEnv('JOURNEY_RUN_ID', 'new');
    expect(JourneyLedger.readAll()).toEqual([]);
    const current = new JourneyLedger('desktop');
    await current.run('D01', 1, 'aviso', async () => current.warn('D01', 1, 'aviso', 'lacuna'));
    current.flush();
    expect(JourneyLedger.readAll()[0].results).toEqual([expect.objectContaining({ verdict: 'warn' })]);
  });

  it('penaliza warns, skips, dias ausentes e falhas do Playwright', async () => {
    const { buildMarkdown } = await import('../e2e/journey-15d/reporters/journeyMarkdownReporter');
    const results = [
      { id: 'D01', day: 1, title: 'passou', verdict: 'pass' as const, ms: 0 },
      { id: 'D02', day: 2, title: 'aviso', verdict: 'warn' as const, ms: 0 },
      { id: 'D03', day: 3, title: 'skip', verdict: 'skip' as const, ms: 0 },
    ];
    expect(buildMarkdown([{ environment: 'desktop', results }], ['desktop'], [])).toContain('| desktop | 0.7/10 | 1 | 0 | 1 | 1 | 12 |');
    expect(buildMarkdown([{ environment: 'desktop', results }], ['desktop'], ['[desktop] falhou'])).toContain('| desktop | 0/10');
    expect(buildMarkdown([], ['android'], [])).toContain('| android | 0/10 | 0 | 0 | 0 | 0 | 15 |');
  });
});
