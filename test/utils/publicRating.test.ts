import { describe, it, expect } from 'vitest';
import { publicRatingBadge } from '../../utils/publicRating';

describe('publicRatingBadge', () => {
  it('não mostra nota quando o negócio não tem avaliações (evita 4.9 inventado)', () => {
    expect(publicRatingBadge(4.9, 0)).toBeNull();
    expect(publicRatingBadge(4.9, undefined)).toBeNull();
    expect(publicRatingBadge(4.9, null)).toBeNull();
  });
  it('não mostra nota zerada ou ausente', () => {
    expect(publicRatingBadge(0, 10)).toBeNull();
    expect(publicRatingBadge(undefined, 10)).toBeNull();
  });
  it('mostra nota e contagem quando há avaliações reais', () => {
    expect(publicRatingBadge(4.72, 12)).toEqual({ value: '4.7', countLabel: '12 avaliações' });
    expect(publicRatingBadge(5, 1)).toEqual({ value: '5.0', countLabel: '1 avaliação' });
  });
});
