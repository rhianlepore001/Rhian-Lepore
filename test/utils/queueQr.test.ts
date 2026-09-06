import { describe, expect, it } from 'vitest';
import { isQueueModeLocked, queueJoinUrl } from '@/utils/queueQr';

describe('queueQr', () => {
  it('monta URL compartilhada e por profissional', () => {
    expect(queueJoinUrl('https://agendixstudio.com', 'joao')).toBe(
      'https://agendixstudio.com/#/queue/joao',
    );
    expect(queueJoinUrl('https://agendixstudio.com/', 'joao', 'pro-1')).toBe(
      'https://agendixstudio.com/#/queue/joao?pro=pro-1',
    );
  });

  it('trava troca de modo com fila ativa', () => {
    expect(isQueueModeLocked(0)).toBe(false);
    expect(isQueueModeLocked(2)).toBe(true);
  });
});
