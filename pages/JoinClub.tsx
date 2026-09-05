import React, { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useBusinessProfileBySlug } from '../hooks/usePublicBooking';
import { usePublicClient } from '../contexts/PublicClientContext';
import { useBrutalTheme, ThemeVariant } from '../hooks/useBrutalTheme';
import { PublicClubFlow } from '../components/membership/PublicClubFlow';
import { Region } from '../utils/formatters';

export const JoinClub: React.FC = () => {
    const { slug: slugParam } = useParams<{ slug: string }>();
    const [searchParams] = useSearchParams();
    const slug = slugParam || searchParams.get('slug') || '';
    const { client, hydrateFromStorage } = usePublicClient();
    const { data: businessProfile, isLoading: profileLoading } = useBusinessProfileBySlug(slug);
    const businessId = (businessProfile as { id?: string } | null)?.id ?? null;
    const region = ((businessProfile as { region?: string } | null)?.region === 'PT' ? 'PT' : 'BR') as Region;
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
                {profileLoading || !businessId ? (
                    <p className={`${colors.textSecondary} text-sm py-12 text-center`}>Carregando...</p>
                ) : (
                    <PublicClubFlow
                        slug={slug}
                        businessId={businessId}
                        region={region}
                        themeOverride={themeOverride}
                        backHref={sessionMatches ? `/minha-area/${slug}` : `/book/${slug}`}
                        backLabel={sessionMatches ? 'Voltar para minha área' : 'Voltar ao agendamento'}
                        prefillName={sessionMatches ? client?.name ?? '' : ''}
                        prefillPhone={sessionMatches ? client?.phone ?? '' : ''}
                    />
                )}
            </div>
        </div>
    );
};
