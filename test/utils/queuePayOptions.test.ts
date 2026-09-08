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

  it('descrição do balcão cita o meio digital da região', () => {
    const br = queuePayOptions({ canUseMembership: false, region: 'BR' }).find((o) => o.id === 'cash');
    const pt = queuePayOptions({ canUseMembership: false, region: 'PT' }).find((o) => o.id === 'cash');
    expect(br?.description).toContain('Pix');
    expect(br?.description).not.toContain('MB WAY');
    expect(pt?.description).toContain('MB WAY');
    expect(pt?.description).not.toContain('Pix');
  });

  it('sem chave Pix / MB WAY configurados só oferece o balcão', () => {
    expect(queuePayOptions({ canUseMembership: false, region: 'BR', digitalAvailable: false }).map((o) => o.id))
      .toEqual(['cash']);
    expect(queuePayOptions({ canUseMembership: true, region: 'PT', digitalAvailable: false }).map((o) => o.id))
      .toEqual(['membership', 'cash']);
  });
});
