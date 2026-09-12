import { describe, expect, it } from 'vitest';
import {
  buildQueueTrackingMessage,
  buildQueueTrackingPath,
  buildQueueTrackingUrl,
} from '@/utils/queueShare';

describe('queueShare', () => {
  it('monta o path da Minha Área com a aba da fila', () => {
    expect(buildQueueTrackingPath('barbearia-qa')).toBe('/#/minha-area/barbearia-qa?tab=fila');
    expect(buildQueueTrackingPath('  ')).toBe('');
  });

  it('monta URL absoluta sem barra duplicada', () => {
    expect(buildQueueTrackingUrl('barbearia-qa', 'https://agendixstudio.com/')).toBe(
      'https://agendixstudio.com/#/minha-area/barbearia-qa?tab=fila',
    );
  });

  it('escreve mensagem de WhatsApp com primeiro nome e instrução de cadastro', () => {
    const message = buildQueueTrackingMessage({
      clientName: 'Tales Furtado',
      businessName: 'Barbearia QA',
      url: 'https://agendixstudio.com/#/minha-area/barbearia-qa?tab=fila',
    });
    expect(message).toContain('Olá, Tales!');
    expect(message).toContain('Barbearia QA');
    expect(message).toContain('https://agendixstudio.com/#/minha-area/barbearia-qa?tab=fila');
    expect(message).toContain('mesmo WhatsApp usado no balcão e veja a posição na fila');
  });
});
