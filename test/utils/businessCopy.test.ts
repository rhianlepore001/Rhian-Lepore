import { describe, expect, it } from 'vitest';
import { getBusinessCopy, getBusinessRemainderNoun, resolveBusinessTheme } from '@/utils/businessCopy';

describe('businessCopy', () => {
  it('resolveBusinessTheme trata beauty', () => {
    expect(resolveBusinessTheme('beauty')).toBe('beauty');
    expect(resolveBusinessTheme('barber')).toBe('barber');
    expect(resolveBusinessTheme(undefined)).toBe('barber');
  });

  it('getBusinessCopy retorna vocabulário por segmento', () => {
    expect(getBusinessCopy('barber').businessNoun).toBe('barbearia');
    expect(getBusinessCopy('beauty').businessNoun).toBe('salão');
    expect(getBusinessCopy('beauty').slugPlaceholder).toBe('meu-studio');
    expect(getBusinessCopy('barber').rolePlaceholder).toBe('Ex: Barbeiro');
    expect(getBusinessCopy('beauty').rolePlaceholder).toBe('Ex: Cabeleireira');
    // PR-G: o nome do assistente fica no próprio módulo (lazy), fora do bundle principal.
    expect(getBusinessCopy('barber')).not.toHaveProperty('assistantName');
    expect(getBusinessCopy('beauty').segmentLabelShort).toBe('Salão');
    expect(getBusinessCopy('beauty').registerSubtitle).toContain('salão');
  });
});

describe('getBusinessRemainderNoun', () => {
  it('barbearia usa artigo a', () => {
    expect(getBusinessRemainderNoun('barber')).toEqual({
      noun: 'barbearia',
      article: 'a',
      withArticle: 'a barbearia',
      remainderLabel: 'Ficou para a barbearia',
    });
    expect(getBusinessRemainderNoun('barbearia').remainderLabel).toBe('Ficou para a barbearia');
  });

  it('salão usa artigo o', () => {
    expect(getBusinessRemainderNoun('beauty')).toMatchObject({
      noun: 'salão',
      article: 'o',
      withArticle: 'o salão',
      remainderLabel: 'Ficou para o salão',
    });
  });

  it('estúdio (futuro) usa artigo o', () => {
    expect(getBusinessRemainderNoun('tattoo')).toMatchObject({
      noun: 'estúdio',
      article: 'o',
      withArticle: 'o estúdio',
      remainderLabel: 'Ficou para o estúdio',
    });
    expect(getBusinessRemainderNoun('estúdio').remainderLabel).toBe('Ficou para o estúdio');
  });

  it('tipo desconhecido fica neutro', () => {
    expect(getBusinessRemainderNoun(null).remainderLabel).toBe('Ficou para o negócio');
    expect(getBusinessRemainderNoun(undefined).remainderLabel).toBe('Ficou para o negócio');
    expect(getBusinessRemainderNoun('').remainderLabel).toBe('Ficou para o negócio');
    expect(getBusinessRemainderNoun('clinic').remainderLabel).toBe('Ficou para o negócio');
  });
});
