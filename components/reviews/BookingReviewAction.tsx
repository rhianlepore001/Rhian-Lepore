import { Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCustomerReviewInvite } from '@/hooks/useCustomerReviews';

export function BookingReviewAction({ token }: { token: string }) {
    const invite = useCustomerReviewInvite(token);

    if (invite.data?.status === 'reviewed' && invite.data.rating) {
        return (
            <p className="flex min-h-11 items-center gap-2 rounded-xl border border-theme-border bg-theme-surface px-3 py-2 text-sm font-semibold text-theme-text">
                <Star className="size-4 shrink-0 text-theme-accent" fill="currentColor" aria-hidden="true" />
                Avaliação enviada · {invite.data.rating} de 5
            </p>
        );
    }
    if (invite.data?.status !== 'ready' && !invite.isError) return null;

    return (
        <Link
            to={`/avaliar/${token}`}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-theme-border bg-theme-surface px-3 py-2 text-sm font-semibold text-theme-text hover:border-theme-accent"
        >
            <Star className="size-4 shrink-0 text-theme-accent" aria-hidden="true" />
            Avaliar atendimento
        </Link>
    );
}
