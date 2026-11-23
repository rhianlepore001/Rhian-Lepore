import { Star } from 'lucide-react';
import { Button, Modal } from '@/components/ui';
import type { usePublicCustomerReviews } from '@/hooks/useCustomerReviews';
import { publicRatingBadge } from '@/utils/publicRating';

interface PublicCustomerReviewsProps {
    open: boolean;
    onClose: () => void;
    query: ReturnType<typeof usePublicCustomerReviews>;
}

export function PublicCustomerReviews({ open, onClose, query }: PublicCustomerReviewsProps) {
    const summary = query.data?.pages[0];
    const rating = publicRatingBadge(summary?.average, summary?.total);
    const reviews = query.data?.pages.flatMap(page => page.reviews) ?? [];

    return (
        <Modal open={open} onClose={onClose} title="Avaliações de clientes" size="lg" bodyClassName="flex min-h-0 flex-1 flex-col">
            <div role="region" aria-label="Lista de avaliações" tabIndex={0} className="min-h-0 overflow-y-auto p-5 md:p-6">
                {query.isPending ? (
                    <p role="status" className="text-sm text-theme-textSecondary">Carregando avaliações…</p>
                ) : query.isError && !summary ? (
                    <div className="space-y-3">
                        <p role="alert" className="text-sm text-theme-textSecondary">Não foi possível carregar as avaliações.</p>
                        <Button variant="secondary" onClick={() => void query.refetch()}>Tentar novamente</Button>
                    </div>
                ) : !rating ? (
                    <div className="space-y-2 rounded-2xl border border-theme-border bg-theme-surface p-4">
                        <p className="font-semibold text-theme-text">Ainda não há avaliações</p>
                        <p className="text-sm text-theme-textSecondary">Clientes podem avaliar depois que o atendimento for concluído.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl border border-theme-border bg-theme-surface p-4">
                            <Star className="size-5 text-theme-accent" fill="currentColor" aria-hidden="true" />
                            <strong className="text-xl text-theme-text">{rating.value} de 5</strong>
                            <span className="text-sm text-theme-textSecondary">· {rating.countLabel}</span>
                        </div>
                        <ul className="space-y-3">
                            {reviews.map(review => (
                                <li key={review.id} className="min-w-0 space-y-2 rounded-2xl border border-theme-border bg-theme-card p-4">
                                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                                        <p className="text-sm font-semibold text-theme-text">Atendimento verificado</p>
                                        <time dateTime={review.created_at} className="text-sm text-theme-textSecondary">
                                            {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(review.created_at))}
                                        </time>
                                    </div>
                                    <div role="img" aria-label={`${review.rating} de 5 estrelas`} className="flex gap-1 text-theme-accent">
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <Star key={star} className="size-4" fill={star <= review.rating ? 'currentColor' : 'none'} aria-hidden="true" />
                                        ))}
                                    </div>
                                    {review.comment && <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-theme-text">{review.comment}</p>}
                                </li>
                            ))}
                        </ul>
                        {query.isFetchNextPageError && <p role="alert" className="text-sm text-[var(--color-danger)]">Não foi possível carregar mais avaliações.</p>}
                        {query.hasNextPage && (
                            <Button variant="secondary" loading={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>
                                {query.isFetchNextPageError ? 'Tentar novamente' : 'Mostrar mais avaliações'}
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </Modal>
    );
}
