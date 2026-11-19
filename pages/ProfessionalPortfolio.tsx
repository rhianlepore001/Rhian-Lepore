import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Calendar, User } from 'lucide-react';
import { Card, ErrorState } from '../components/ui';
import { supabase } from '../lib/supabase';

export const ProfessionalPortfolio: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const { data: professional, isLoading, isError, refetch } = useQuery({
        queryKey: ['public-professional-portfolio', slug],
        enabled: Boolean(slug),
        queryFn: async () => {
            const { data, error } = await supabase
                .from('team_members')
                .select('*, profiles:user_id(*)')
                .eq('slug', slug!)
                .eq('active', true)
                .single();

            if (error?.code === 'PGRST116') return null;
            if (error) throw error;
            return data;
        },
    });
    const business = professional?.profiles;
    const theme = business?.user_type === 'beauty' ? 'beauty' : 'barber';
    const businessSlug = business?.business_slug;

    return (
        <main
            data-theme={business ? theme : undefined}
            data-mode={business ? (theme === 'beauty' ? 'light' : 'dark') : undefined}
            className="min-h-screen bg-theme-bg px-4 py-8 text-theme-text sm:py-16"
        >
            <div className="mx-auto max-w-xl">
                {isLoading ? (
                    <p role="status" className="py-12 text-center text-sm text-theme-textSecondary">Carregando perfil…</p>
                ) : isError ? (
                    <ErrorState
                        title="Não foi possível carregar o perfil"
                        message="Confira a conexão e tente novamente."
                        onRetry={() => void refetch()}
                    />
                ) : !professional || !business ? (
                    <Card className="space-y-2 text-center">
                        <h1 className="text-xl font-bold">Profissional não encontrado</h1>
                        <p className="text-sm text-theme-textSecondary">Confira o endereço ou peça um novo link ao estabelecimento.</p>
                        <Link to="/" className="inline-flex min-h-11 items-center text-sm font-semibold text-theme-accent">Ir ao início do AgendiX</Link>
                    </Card>
                ) : (
                    <Card className="space-y-5">
                        <header className="flex items-center gap-4">
                            {professional.photo_url ? (
                                <img src={professional.photo_url} alt="" className="h-20 w-20 shrink-0 rounded-full object-cover" />
                            ) : (
                                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-dim)] text-theme-accent">
                                    <User className="h-8 w-8" aria-hidden="true" />
                                </div>
                            )}
                            <div className="min-w-0">
                                <p className="break-words text-sm text-theme-textSecondary">{business.business_name}</p>
                                <h1 className="break-words font-heading text-2xl font-bold sm:text-3xl">{professional.name}</h1>
                                {professional.role && <p className="break-words text-sm text-theme-textSecondary">{professional.role}</p>}
                            </div>
                        </header>
                        {businessSlug && (
                            <Link
                                to={`/book/${businessSlug}?${new URLSearchParams({ pro: professional.id })}`}
                                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-theme-accent px-4 text-sm font-semibold text-[var(--color-on-accent)]"
                            >
                                <Calendar className="h-5 w-5" aria-hidden="true" />
                                Ver serviços e horários
                            </Link>
                        )}
                        {professional.bio && <p className="whitespace-pre-line break-words text-sm leading-relaxed">{professional.bio}</p>}
                    </Card>
                )}
            </div>
        </main>
    );
};
