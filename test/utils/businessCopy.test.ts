import { describe, expect, it } from 'vitest';
import { getBusinessCopy, resolveBusinessTheme } from '@/utils/businessCopy';

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
    expect(getBusinessCopy('barber').assistantName).toBe('Assistente AgendiX');
    expect(getBusinessCopy('beauty').segmentLabelShort).toBe('Salão');
  });
});
