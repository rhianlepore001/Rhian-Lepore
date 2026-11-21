import { Crown } from 'lucide-react';
import { formatCurrency, type Region } from '@/utils/formatters';
import type { MembershipPlan } from '@/services/memberships';
import { MembershipPlanPhoto } from './MembershipPlanPhoto';

interface ClubPromotionProps {
    plans: MembershipPlan[];
    region: Region;
    onOpen: () => void;
}

export function ClubPromotion({ plans, region, onOpen }: ClubPromotionProps) {
    const featured = plans.find(plan => plan.photo_path);
    const startingPrice = Math.min(...plans.map(plan => plan.price_cents)) / 100;

    return (
        <button
            type="button"
            onClick={onOpen}
            className="group relative isolate flex w-full min-w-0 items-center gap-3 overflow-hidden rounded-2xl border border-theme-border bg-theme-card p-3 text-left transition-colors hover:border-theme-accent sm:gap-4 sm:p-4"
        >
            <span className="absolute inset-0 -z-10 bg-gradient-to-r from-[var(--color-accent-dim)] to-transparent" aria-hidden="true" />
            {featured?.photo_path ? (
                <MembershipPlanPhoto path={featured.photo_path} className="size-14 shrink-0 rounded-xl sm:size-16" />
            ) : (
                <span className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-theme-border bg-theme-surface text-theme-accent sm:size-16">
                    <Crown className="size-6" aria-hidden="true" />
                </span>
            )}
            <span className="min-w-0 flex-1">
                <span className="block text-base font-bold leading-tight text-theme-text">Clube de assinatura</span>
                <span className="mt-1 block text-sm leading-snug text-theme-textSecondary">
                    Planos a partir de {formatCurrency(startingPrice, region)}/mês
                </span>
            </span>
            <span className="shrink-0 text-sm font-semibold text-theme-accent group-hover:underline">Ver planos</span>
        </button>
    );
}
