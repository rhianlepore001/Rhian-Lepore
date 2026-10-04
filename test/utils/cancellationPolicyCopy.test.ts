import { describe, expect, it } from 'vitest';
import {
  CANCELLATION_POLICY_NOTES_HINT,
  cancellationPolicyNotesForDisplay,
  composeCancellationPolicyForSave,
  generatedCancellationPolicyText,
  GENERATED_CANCELLATION_POLICY_TEXT,
  isLegacyCancellationPolicy,
  LEGACY_CANCELLATION_POLICY_TEMPLATES,
  LEGACY_GENERATED_CANCELLATION_POLICY_TEXT,
  resolveCancellationPolicyDisplay,
  splitCancellationPolicyForEditor,
} from '@/utils/cancellationPolicyCopy';

describe('cancellationPolicyCopy — PR-5 gerada da regra real', () => {
  it('cutoff 2h gera a frase curta sem multa', () => {
    const text = generatedCancellationPolicyText(2, 'Barbearia São João');
    expect(text).toBe('Você pode cancelar até 2h antes pela Minha Área');
    expect(text).not.toMatch(/50%|100%|reembolso|cobrança integral|24h/i);
  });

  it('cutoff 0 pede para falar com o negócio', () => {
    expect(generatedCancellationPolicyText(0, 'Studio Aurora')).toBe(
      'Para cancelar, fale com Studio Aurora.',
    );
    expect(generatedCancellationPolicyText(0, '  ')).toBe(
      'Para cancelar, fale com o estabelecimento.',
    );
  });

  it('chave flexible nunca aparece para o cliente', () => {
    const text = resolveCancellationPolicyDisplay('flexible');
    expect(text.toLowerCase()).not.toContain('flexible');
    expect(text).toBe('Você pode cancelar até 2h antes pela Minha Área');
    expect(text.toLowerCase()).not.toContain('50%');
  });

  it('parágrafos antigos 24h/48h/72h são enlatados (match exato) e não viram observações', () => {
    for (const body of Object.values(LEGACY_CANCELLATION_POLICY_TEMPLATES)) {
      expect(isLegacyCancellationPolicy(body)).toBe(true);
      expect(resolveCancellationPolicyDisplay(body)).toBe(
        'Você pode cancelar até 2h antes pela Minha Área',
      );
    }
    expect(isLegacyCancellationPolicy('Chegar 5 min antes.')).toBe(false);
  });

  it('vazio ou nulo usa a regra real do cutoff padrão', () => {
    expect(resolveCancellationPolicyDisplay(null)).toBe(
      'Você pode cancelar até 2h antes pela Minha Área',
    );
    expect(resolveCancellationPolicyDisplay('')).toBe(
      'Você pode cancelar até 2h antes pela Minha Área',
    );
  });

  it('observação customizada do dono aparece depois da regra', () => {
    const custom = 'Avisar pelo WhatsApp se atrasar mais de 10 min.';
    expect(resolveCancellationPolicyDisplay({
      cutoffHours: 6,
      businessName: 'Corte Fino',
      legacyPolicy: custom,
    })).toBe(
      `Você pode cancelar até 6h antes pela Minha Área\n\n${custom}`,
    );
  });

  it('client_cancel_note tem prioridade; string vazia não volta o legado', () => {
    expect(cancellationPolicyNotesForDisplay('Chegar cedo.', 'flexible')).toBe('Chegar cedo.');
    expect(cancellationPolicyNotesForDisplay('', 'Chegar 5 min antes.')).toBe('');
    expect(cancellationPolicyNotesForDisplay(null, 'Chegar 5 min antes.')).toBe('Chegar 5 min antes.');
    expect(cancellationPolicyNotesForDisplay(undefined, LEGACY_CANCELLATION_POLICY_TEMPLATES.strict)).toBe('');
  });

  it('editor: chave/legado abre vazio nas observações; custom preenche', () => {
    expect(splitCancellationPolicyForEditor('flexible').notes).toBe('');
    expect(splitCancellationPolicyForEditor(LEGACY_CANCELLATION_POLICY_TEMPLATES.moderate).notes).toBe('');
    expect(splitCancellationPolicyForEditor('Chegar 5 min antes.').notes).toBe('Chegar 5 min antes.');
  });

  it('compose grava só as observações', () => {
    expect(composeCancellationPolicyForSave('')).toBe('');
    expect(composeCancellationPolicyForSave('  Avisar.  ')).toBe('Avisar.');
    expect(composeCancellationPolicyForSave('')).not.toBe(GENERATED_CANCELLATION_POLICY_TEXT);
  });

  it('texto [AGENDIX-DEMO] 24h é legado e não vira observação', () => {
    const demo = 'Cancelamentos com até 24h de antecedência sem custo. Dados fictícios [AGENDIX-DEMO].';
    expect(splitCancellationPolicyForEditor(demo).notes).toBe('');
    expect(isLegacyCancellationPolicy(demo)).toBe(true);
  });

  it('descasca a frase gerada PR-1 se ainda estiver concatenada', () => {
    expect(cancellationPolicyNotesForDisplay(
      `${LEGACY_GENERATED_CANCELLATION_POLICY_TEXT}\n\nChegar 5 min antes.`,
      null,
    )).toBe('Chegar 5 min antes.');
  });

  it('dica das observações avisa para não prometer multa', () => {
    expect(CANCELLATION_POLICY_NOTES_HINT).toBe(
      'Aparece abaixo da regra. Não prometa multa: o sistema não cobra.',
    );
  });
});
