import React, { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useBusinessProfileBySlug } from '../hooks/usePublicBooking';
import { usePublicClient } from '../contexts/PublicClientContext';
import { useBrutalTheme, ThemeVariant } from '../hooks/useBrutalTheme';
import { ErrorState } from '../components/ui';
import { PublicClubFlow } from '../components/membership/PublicClubFlow';
import { normalizeRegion } from '../utils/formatters';

export const JoinClub: React.FC = () => {
    const { slug: slugParam } = useParams<{ slug: string }>();
    const [searchParams] = useSearchParams();
    const slug = slugParam || searchParams.get('slug') || '';
    const initialPlanId = searchParams.get('plano');
    const fromBooking = searchParams.get('origem') === 'agendamento';
    const { client, hydrateFromStorage } = usePublicClient();
    const { data: businessProfile, isLoading: profileLoading, isError, refetch } = useBusinessProfileBySlug(slug);
    const businessId = (businessProfile as { id?: string } | null)?.id ?? null;
    const region = normalizeRegion(businessProfile?.region);
    const themeOverride: ThemeVariant = (businessProfile as { user_type?: string } | null)?.user_type === 'beauty' ? 'beauty' : 'barber';
    const { colors } = useBrutalTheme({ override: themeOverride });
    const sessionMatches = Boolean(client && businessId && client.business_id === businessId);

    useEffect(() => {
        if (!businessId) return;
        hydrateFromStorage(businessId);
    }, [businessId, hydrateFromStorage]);

    useEffect(() => {
        if (!businessProfile) return;
        const html = document.documentElement;
        html.setAttribute('data-theme', themeOverride);
        html.setAttribute('data-mode', themeOverride === 'beauty' ? 'light' : 'dark');
    }, [businessProfile, themeOverride]);

    if (!slug) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--color-bg)]">
                <p className="text-[var(--color-text)] text-sm text-center max-w-md">
                    Link inválido. Solicite o link correto ao estabelecimento.
                </p>
            </div>
        );
    }

    return (
        <div className={`min-h-screen p-4 md:p-8 ${colors.bg}`}>
            <div className="max-w-lg mx-auto">
                {profileLoading ? (
                    <p role="status" className={`${colors.textSecondary} text-sm py-12 text-center`}>Carregando o clube…</p>
                ) : isError || !businessId ? (
                    <ErrorState
                        title="Não foi possível abrir o clube"
                        message="Confira a conexão e tente novamente. Se o problema continuar, peça um novo link ao estabelecimento."
                        onRetry={() => void refetch()}
                    />
                ) : (
                    <PublicClubFlow
                        key={`${slug}:${initialPlanId ?? ''}`}
                        slug={slug}
                        initialPlanId={initialPlanId}
                        businessId={businessId}
                        region={region}
                        themeOverride={themeOverride}
                        backHref={fromBooking ? `/book/${slug}?agendar=1&secao=clube` : sessionMatches ? `/minha-area/${slug}?tab=clube` : `/book/${slug}`}
                        backLabel={sessionMatches && !fromBooking ? 'Voltar para minha área' : 'Voltar ao agendamento'}
                        prefillName={sessionMatches ? client?.name ?? '' : ''}
                        prefillPhone={sessionMatches ? client?.phone ?? '' : ''}
                    />
                )}
            </div>
        </div>
    );
};
