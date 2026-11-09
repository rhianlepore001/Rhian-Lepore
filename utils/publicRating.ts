export interface PublicRatingBadge {
  value: string;
  countLabel: string;
}

/**
 * Nota exibida na página pública. Sem avaliações reais (contagem 0/ausente) não mostra
 * nada: o banco tem nota padrão e um "4.9 · 0 avaliações" seria nota inventada.
 */
export function publicRatingBadge(
  rating: number | null | undefined,
  count: number | null | undefined,
): PublicRatingBadge | null {
  const total = Number(count ?? 0);
  const score = Number(rating ?? 0);
  if (!Number.isFinite(total) || total <= 0) return null;
  if (!Number.isFinite(score) || score <= 0) return null;
  return {
    value: score.toFixed(1),
    countLabel: `${total} ${total === 1 ? 'avaliação' : 'avaliações'}`,
  };
}
