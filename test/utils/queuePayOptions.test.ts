import { describe, expect, it } from 'vitest';
import { queuePayOptions } from '@/utils/queuePayOptions';

describe('queuePayOptions', () => {
  it('assinante elegível no BR vê clube, balcão e Pix', () => {
    const options = queuePayOptions({ canUseMembership: true, region: 'BR' });
    expect(options.map((option) => option.id)).toEqual(['membership', 'cash', 'pix']);
  });

  it('teto estourado esconde clube e mostra MB WAY em PT', () => {
    const options = queuePayOptions({ canUseMembership: false, region: 'PT' });
    expect(options.map((option) => option.id)).toEqual(['cash', 'mbway']);
  });

  it('sem chave Pix / MB WAY configurados só oferece o balcão', () => {
    expect(queuePayOptions({ canUseMembership: false, region: 'BR', digitalAvailable: false }).map((o) => o.id))
      .toEqual(['cash']);
    expect(queuePayOptions({ canUseMembership: true, region: 'PT', digitalAvailable: false }).map((o) => o.id))
      .toEqual(['membership', 'cash']);
  });
});
