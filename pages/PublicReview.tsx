import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Check, Star } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui';
import { customerReviewInviteKey, PUBLIC_CUSTOMER_REVIEWS_KEY, useCustomerReviewInvite } from '@/hooks/useCustomerReviews';
import { REVIEW_COMMENT_LIMIT, submitCustomerReview } from '@/services/customerReviews';
import { resolveBusinessTimezone } from '@/utils/businessTimezone';
import { isCustomerReviewToken } from '@/utils/customerReviewReceipt';

const RATING_LABELS = ['Muito ruim', 'Ruim', 'Regular', 'Bom', 'Excelente'];

export function PublicReview() {
    const { token } = useParams<'token'>();
    return <CustomerReviewForm key={token} validToken={isCustomerReviewToken(token) ? token : null} />;
}

function CustomerReviewForm({ validToken }: { validToken: string | null }) {
    const query = useCustomerReviewInvite(validToken);
    const visit = query.data;
    const queryClient = useQueryClient();
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const successRef = useRef<HTMLHeadingElement>(null);

    const submission = useMutation({
        mutationFn: () => submitCustomerReview(validToken!, rating, comment),
        onSuccess: result => {
            queryClient.setQueryData(customerReviewInviteKey(validToken), result);
            void queryClient.invalidateQueries({ queryKey: PUBLIC_CUSTOMER_REVIEWS_KEY });
        },
        onError: error => {
            if ((error as { message?: string })?.message === 'review_not_available') void query.refetch();
        },
    });

    useEffect(() => {
        if (!visit?.user_type) return;
        const isBeauty = visit.user_type === 'beauty';
        document.documentElement.setAttribute('data-theme', isBeauty ? 'beauty' : 'barber');
        document.documentElement.setAttribute('data-mode', isBeauty ? 'light' : 'dark');
    }, [visit?.user_type]);

    useEffect(() => {
        if (submission.isSuccess) successRef.current?.focus();
    }, [submission.isSuccess]);

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!validToken || !rating || submission.isPending) return;
        submission.mutate();
    };

    const appointmentDate = visit?.appointment_time
        ? new Intl.DateTimeFormat(visit.region === 'PT' ? 'pt-PT' : 'pt-BR', {
            dateStyle: 'long',
            timeZone: resolveBusinessTimezone({ timezone: visit.timezone, region: visit.region }),
        }).format(new Date(visit.appointment_time))
        : null;
    const businessSlug = visit?.business_slug;
    const clientArea = businessSlug ? `/minha-area/${businessSlug}?tab=historico` : null;

    return (
        <main className="min-h-screen bg-theme-bg px-4 py-6 text-theme-text sm:py-12">
            <div className="mx-auto max-w-xl space-y-4">
                {validToken && query.isPending ? (
                    <p role="status" className="rounded-2xl border border-theme-border bg-theme-card p-5 text-theme-textSecondary">Carregando atendimento…</p>
                ) : query.isError && !visit ? (
                    <section className="space-y-3 rounded-2xl border border-theme-border bg-theme-card p-5">
                        <h1 className="text-xl font-bold">Não foi possível abrir a avaliação</h1>
                        <Button variant="secondary" onClick={() => void query.refetch()}>Tentar novamente</Button>
                    </section>
                ) : visit?.status === 'ready' ? (
                    <section className="space-y-5 rounded-2xl border border-theme-border bg-theme-card p-5 sm:p-7">
                        <header className="space-y-2">
                            <p className="break-words text-sm font-semibold text-theme-accent">{visit.business_name}</p>
                            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Avalie seu atendimento</h1>
                            {appointmentDate && <p className="text-sm text-theme-textSecondary">Atendimento de {appointmentDate}</p>}
                        </header>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <fieldset disabled={submission.isPending} className="min-w-0 space-y-2">
                                <legend className="mb-2 text-base font-semibold">Como foi sua experiência?</legend>
                                <div className="grid grid-cols-5 gap-1 sm:gap-2">
                                    {RATING_LABELS.map((label, index) => {
                                        const stars = index + 1;
                                        return (
                                            <label key={label} className="relative block min-w-0">
                                                <input
                                                    type="radio"
                                                    name="rating"
                                                    aria-label={`${stars} ${stars === 1 ? 'estrela' : 'estrelas'} · ${label}`}
                                                    value={stars}
                                                    checked={rating === stars}
                                                    onChange={() => setRating(stars)}
                                                    required
                                                    className="peer sr-only"
                                                />
                                                <span className="flex min-h-12 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl border border-theme-border bg-theme-surface py-2 text-theme-accent peer-checked:border-theme-accent peer-checked:ring-1 peer-checked:ring-theme-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-theme-accent">
                                                    <Star className="size-5" fill={stars <= rating ? 'currentColor' : 'none'} aria-hidden="true" />
                                                    <span className="text-sm font-semibold text-theme-text" aria-hidden="true">{stars}</span>
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                                {rating > 0 && <p className="text-sm font-medium text-theme-textSecondary">{RATING_LABELS[rating - 1]}</p>}
                            </fieldset>
                            <div className="space-y-2">
                                <label htmlFor="customer-review-comment" className="block font-semibold">
                                    Comentário <span className="text-sm font-normal text-theme-textSecondary">(opcional)</span>
                                </label>
                                <textarea
                                    id="customer-review-comment"
                                    rows={4}
                                    maxLength={REVIEW_COMMENT_LIMIT}
                                    value={comment}
                                    onChange={event => setComment(event.target.value)}
                                    disabled={submission.isPending}
                                    aria-describedby="customer-review-visibility customer-review-limit"
                                    className="w-full resize-y rounded-xl border border-theme-border bg-theme-surface p-3 text-base text-theme-text focus:outline-2 focus:outline-theme-accent"
                                />
                                <p id="customer-review-limit" className="text-right text-sm tabular-nums text-theme-textSecondary">
                                    {comment.length}/{REVIEW_COMMENT_LIMIT}
                                </p>
                                <p id="customer-review-visibility" className="text-sm leading-relaxed text-theme-textSecondary">
                                    Sua nota e seu comentário serão públicos. Seu nome e telefone ficam privados. Evite incluí-los no texto.
                                </p>
                            </div>
                            {submission.isError && (
                                <p role="alert" className="text-sm text-[var(--color-danger)]">
                                    Não foi possível enviar. Tente novamente. Sua nota e seu comentário estão preenchidos.
                                </p>
                            )}
                            <Button type="submit" fullWidth disabled={!rating} loading={submission.isPending}>Enviar avaliação</Button>
                        </form>
                    </section>
                ) : (
                    <section className="space-y-3 rounded-2xl border border-theme-border bg-theme-card p-5 sm:p-7">
                        {visit?.business_name && visit.status !== 'unavailable' && (
                            <p className="break-words text-sm font-semibold text-theme-accent">{visit.business_name}</p>
                        )}
                        {visit?.status === 'reviewed' ? (
                            <>
                                <Check className="size-6 text-theme-accent" aria-hidden="true" />
                                <h1 ref={successRef} tabIndex={-1} className="text-2xl font-bold tracking-tight">Avaliação enviada</h1>
                                <p className="text-sm text-theme-textSecondary">Obrigado por avaliar. Sua nota foi {visit.rating} de 5.</p>
                                {businessSlug && (
                                    <Link className="inline-flex min-h-11 items-center text-sm font-semibold text-theme-accent underline underline-offset-4" to={`/book/${businessSlug}?agendar=1&avaliacoes=1`}>
                                        Ver avaliações de clientes
                                    </Link>
                                )}
                            </>
                        ) : visit?.status === 'pending' ? (
                            <>
                                <h1 className="text-2xl font-bold tracking-tight">Avaliação ainda indisponível</h1>
                                <p className="text-sm text-theme-textSecondary">Você pode avaliar depois que o estabelecimento finalizar seu atendimento.</p>
                                <Button variant="secondary" loading={query.isFetching} onClick={() => void query.refetch()}>Consultar status</Button>
                            </>
                        ) : (
                            <>
                                <h1 className="text-2xl font-bold tracking-tight">Link de avaliação indisponível</h1>
                                <p className="text-sm text-theme-textSecondary">Confira o link ou peça ao estabelecimento um convite para avaliar um atendimento concluído.</p>
                            </>
                        )}
                    </section>
                )}
                {clientArea && (
                    <Link className="inline-flex min-h-11 items-center text-sm font-semibold text-theme-textSecondary underline underline-offset-4" to={clientArea}>
                        Minha Área
                    </Link>
                )}
            </div>
        </main>
    );
}
