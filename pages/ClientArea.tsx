import React from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ClientQueuePanel } from '../components/queue/ClientQueuePanel';
import { ClientMembershipPanel } from '../components/membership/ClientMembershipPanel';
import { PublicClubFlow } from '../components/membership/PublicClubFlow';
import { useBusinessProfileBySlug } from '../hooks/usePublicBooking';
import { usePublicClientMembership, useCancelPublicClientMembership } from '../hooks/useMemberships';
import { membershipTokenKey, readMembershipToken } from '../services/memberships';
import { hasQueueQrVisit, storeQueueTicket } from '../services/queue';
import { PrivateBookingArea } from './PrivateBookingArea';
import { useToast } from '../components/ui/Toast';
import type { Region } from '../utils/formatters';

export const ClientArea: React.FC = () => {
    const [params] = useSearchParams();
    return params.get('tab') === 'fila' || params.get('tab') === 'clube'
        ? <PrivateClientPortal key={params.toString()} />
        : <PrivateBookingArea />;
};

const PrivateClientPortal: React.FC = () => {
    const { slug = '' } = useParams<{ slug: string }>();
    const [params] = useSearchParams();
    const [accessReady, setAccessReady] = React.useState(false);
    const queue = params.get('tab') === 'fila';
    const { data: business, isLoading } = useBusinessProfileBySlug(slug);
    const businessId = business?.id ?? null;
    const linkToken = params.get('token');
    const token = linkToken ?? (businessId ? readMembershipToken(businessId) : null);
    const validToken = /^[a-f0-9]{64}$/.test(token ?? '');
    const membership = usePublicClientMembership(queue ? null : businessId, token);
    const cancel = useCancelPublicClientMembership(businessId, token);
    const { showToast } = useToast();
    React.useEffect(() => {
        if (!businessId) return;
        if (!linkToken || !/^[a-f0-9]{64}$/.test(linkToken)) { setAccessReady(true); return; }
        if (queue) {
            const entryId = params.get('queue');
            if (entryId) storeQueueTicket({ businessId, entryId, token: linkToken, slug });
        } else {
            localStorage.setItem(membershipTokenKey(businessId), linkToken);
        }
        setAccessReady(true);
    }, [businessId, linkToken, params, queue, slug]);
    React.useEffect(() => {
        if (!business) return;
        const isBeauty = business.user_type === 'beauty';
        document.documentElement.setAttribute('data-theme', isBeauty ? 'beauty' : 'barber');
        document.documentElement.setAttribute('data-mode', isBeauty ? 'light' : 'dark');
    }, [business]);
    const handleCancel = async () => {
        try {
            await cancel.mutateAsync();
            showToast('Plano cancelado.', 'success');
        } catch {
            showToast('Não foi possível cancelar o plano. Tente novamente ou fale com o estabelecimento.', 'error');
        }
    };
    if (isLoading || (businessId && !accessReady)) return <p role="status">Carregando…</p>;
    if (!business) return <p role="alert">Estabelecimento não encontrado.</p>;
    const region = (business.region ?? 'BR') as Region;
    return (
        <main className="min-h-screen bg-theme-bg p-6 text-theme-text">
            <div className="mx-auto max-w-lg space-y-6">
                <Link to={`/book/${encodeURIComponent(slug)}`} className="text-sm underline">Novo agendamento</Link>
                <h1 className="text-2xl font-bold">{business.business_name}</h1>
                {queue ? <ClientQueuePanel businessId={business.id} phone={null} slug={slug} cameFromQr={hasQueueQrVisit(slug)} />
                    : <>
                        {linkToken && !validToken ? <p role="alert">Link privado inválido ou expirado. Fale com o estabelecimento.</p> : validToken ? membership.isError || (!membership.isPending && !membership.data)
                            ? <p role="alert">Link privado inválido ou expirado. Fale com o estabelecimento.</p>
                            : <ClientMembershipPanel
                                membership={membership.data ?? null}
                                slug={slug}
                                businessId={business.id}
                                isBeauty={business.user_type === 'beauty'}
                                region={region}
                                businessPhone={business.phone ?? null}
                                businessName={business.business_name}
                                clientName=""
                                loading={membership.isPending}
                                cancelling={cancel.isPending}
                                onCancel={handleCancel}
                            />
                            : <>
                                <p>Para consultar ou cancelar seu plano, abra o link privado guardado neste aparelho. Se perdeu o link, fale com o estabelecimento. Informar o telefone não libera os dados do plano.</p>
                                <PublicClubFlow slug={slug} businessId={business.id} region={region} themeOverride={business.user_type === 'beauty' ? 'beauty' : 'barber'} embedded />
                            </>}
                    </>}
            </div>
        </main>
    );
};
