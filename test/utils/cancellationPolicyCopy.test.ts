import { describe, expect, it } from 'vitest';
import {
  CANCELLATION_POLICY_NOTES_HINT,
  composeCancellationPolicyForSave,
  GENERATED_CANCELLATION_POLICY_TEXT,
  GENERATED_CANCELLATION_POLICY_VERSIONS,
  LEGACY_CANCELLATION_POLICY_TEMPLATES,
  resolveCancellationPolicyDisplay,
  splitCancellationPolicyForEditor,
} from '@/utils/cancellationPolicyCopy';

describe('cancellationPolicyCopy — PR-1 / D3', () => {
  it('chave flexible nunca aparece para o cliente; vira a regra real', () => {
    const text = resolveCancellationPolicyDisplay('flexible');
    expect(text.toLowerCase()).not.toContain('flexible');
    expect(text).toBe(GENERATED_CANCELLATION_POLICY_TEXT);
    expect(text.toLowerCase()).not.toContain('50%');
    expect(text.toLowerCase()).not.toContain('cobrança de');
    expect(text).not.toMatch(/24h|48h|72h/i);
  });

  it('texto gerado D3 não promete multa por 24h/50%', () => {
    expect(GENERATED_CANCELLATION_POLICY_TEXT).not.toMatch(/24h|50%|cobrança integral|reembolso/i);
  });

  it('chaves moderate e strict também viram a regra real, sem multa prometida', () => {
    for (const key of ['moderate', 'strict', 'FLEXIBLE', ' Moderate ']) {
      const text = resolveCancellationPolicyDisplay(key);
      expect(text).toBe(GENERATED_CANCELLATION_POLICY_TEXT);
      expect(text.toLowerCase()).not.toMatch(/50%|100%|reembolso|cobrança integral/);
    }
  });

  it('parágrafos antigos 24h/48h/72h (gravados pelo chip) são substituídos pela regra real', () => {
    for (const body of Object.values(LEGACY_CANCELLATION_POLICY_TEMPLATES)) {
      expect(resolveCancellationPolicyDisplay(body)).toBe(GENERATED_CANCELLATION_POLICY_TEXT);
    }
  });

  it('vazio ou nulo usa a regra real, nunca o fallback de 24h', () => {
    expect(resolveCancellationPolicyDisplay(null)).toBe(GENERATED_CANCELLATION_POLICY_TEXT);
    expect(resolveCancellationPolicyDisplay('')).toBe(GENERATED_CANCELLATION_POLICY_TEXT);
    expect(resolveCancellationPolicyDisplay(undefined)).toBe(GENERATED_CANCELLATION_POLICY_TEXT);
    expect(resolveCancellationPolicyDisplay('   ')).toBe(GENERATED_CANCELLATION_POLICY_TEXT);
  });

  it('observação customizada do dono aparece depois da regra real', () => {
    const custom = 'Avisar pelo WhatsApp se atrasar mais de 10 min.';
    expect(resolveCancellationPolicyDisplay(custom)).toBe(
      `${GENERATED_CANCELLATION_POLICY_TEXT}\n\n${custom}`,
    );
  });

  it('editor: chave/legado abre vazio nas observações; custom preenche o textarea', () => {
    expect(splitCancellationPolicyForEditor('flexible')).toEqual({
      generated: GENERATED_CANCELLATION_POLICY_TEXT,
      notes: '',
    });
    expect(splitCancellationPolicyForEditor(LEGACY_CANCELLATION_POLICY_TEMPLATES.moderate).notes).toBe('');
    expect(splitCancellationPolicyForEditor('Chegar 5 min antes.').notes).toBe('Chegar 5 min antes.');
  });

  it('compose grava só as observações; vazio vira string vazia, sem a frase gerada', () => {
    expect(composeCancellationPolicyForSave('')).toBe('');
    expect(composeCancellationPolicyForSave('   ')).toBe('');
    expect(composeCancellationPolicyForSave('Avisar pelo WhatsApp.')).toBe('Avisar pelo WhatsApp.');
    expect(composeCancellationPolicyForSave('  Avisar.  ')).toBe('Avisar.');
    expect(composeCancellationPolicyForSave('')).not.toBe(GENERATED_CANCELLATION_POLICY_TEXT);
  });

  it('texto [AGENDIX-DEMO] 24h é legado e não vira observação', () => {
    const demo = 'Cancelamentos com até 24h de antecedência sem custo. Dados fictícios [AGENDIX-DEMO].';
    expect(splitCancellationPolicyForEditor(demo).notes).toBe('');
    expect(resolveCancellationPolicyDisplay(demo)).toBe(GENERATED_CANCELLATION_POLICY_TEXT);
    expect(splitCancellationPolicyForEditor('foo [AGENDIX-DEMO] bar').notes).toBe('');
  });

  it('descasca versões passadas da frase gerada e deixa só a observação do dono', () => {
    expect(GENERATED_CANCELLATION_POLICY_VERSIONS.length).toBeGreaterThanOrEqual(1);
    expect(GENERATED_CANCELLATION_POLICY_VERSIONS).toContain(GENERATED_CANCELLATION_POLICY_TEXT);
    expect(splitCancellationPolicyForEditor(GENERATED_CANCELLATION_POLICY_TEXT).notes).toBe('');
    expect(splitCancellationPolicyForEditor(
      `${GENERATED_CANCELLATION_POLICY_TEXT}\n\nChegar 5 min antes.`,
    ).notes).toBe('Chegar 5 min antes.');
  });

  it('dica das observações avisa para não prometer multa', () => {
    expect(CANCELLATION_POLICY_NOTES_HINT).toBe(
      'Aparece abaixo da regra. Não prometa multa: o sistema não cobra.',
    );
  });
});
