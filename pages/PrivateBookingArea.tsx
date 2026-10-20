import React from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ClientBookingCard } from '../components/ClientBookingCard';
import { CancellationPolicyText } from '../components/CancellationPolicyText';
import { useBusinessProfileBySlug, useBusinessSettings, usePublicServices, usePublicProfessionals } from '../hooks/usePublicBooking';
import { fetchPublicBookingById } from '../services/publicBooking';
import { resolveBusinessTimezone } from '../utils/businessTimezone';
import { resolveCancellationPolicyParts } from '../utils/cancellationPolicyCopy';
import { readCancelCutoffHours } from '../utils/clientCancelCutoff';
import { isPublicBookingAutoConfirm } from '../utils/onlineBookingApproval';
import type { Region } from '../utils/formatters';

export const PrivateBookingArea: React.FC = () => {
    const { slug = '' } = useParams<{ slug: string }>();
    const [params] = useSearchParams();
    const token = params.get('token') ?? '';
    const bookingId = params.get('booking') ?? '';
    const { data: business, isLoading: loadingBusiness } = useBusinessProfileBySlug(slug);
    const businessId = business?.id ?? null;
    const { data: settings } = useBusinessSettings(businessId);
    const { data: services = [] } = usePublicServices(businessId);
    const { data: professionals = [] } = usePublicProfessionals(businessId);
    const { data: booking, isPending, refetch } = useQuery({
        queryKey: ['private-booking', businessId, bookingId, token],
        queryFn: () => fetchPublicBookingById(bookingId, businessId!, token),
        enabled: !!businessId && !!bookingId && /^[a-f0-9]{64}$/.test(token),
        retry: false,
        gcTime: 0,
        refetchInterval: 5000,
        refetchIntervalInBackground: false,
    });
    const cutoffHours = readCancelCutoffHours(settings?.client_cancel_cutoff_hours);
    const parts = resolveCancellationPolicyParts({
        cutoffHours,
        businessName: business?.business_name,
        clientCancelPolicyText: settings?.client_cancel_policy_text,
        clientCancelNote: settings?.client_cancel_note,
    });
    const validLink = !!bookingId && /^[a-f0-9]{64}$/.test(token);
    return (
        <main className="min-h-screen bg-theme-bg p-6 text-theme-text">
            <div className="mx-auto max-w-lg space-y-6">
                <Link to={`/book/${encodeURIComponent(slug)}?new=1`} className="text-sm underline">Novo agendamento</Link>
                <h1 className="text-2xl font-bold">{business?.business_name ?? 'Meu agendamento'}</h1>
                {!validLink ? <p>Para ver, remarcar ou cancelar um horário, abra o link privado mostrado após agendar. Se perdeu o link, fale com o estabelecimento.</p>
                    : loadingBusiness || (businessId && isPending) ? <p role="status">Carregando horário…</p>
                        : !booking ? <p role="alert">Link privado inválido ou expirado. Fale com o estabelecimento.</p>
                            : <>
                                <p className="text-sm text-theme-textSecondary">Este link dá acesso somente a este horário. Guarde-o e compartilhe apenas com quem você autorizar.</p>
                                <CancellationPolicyText parts={parts} />
                                <ClientBookingCard
                                    booking={{
                                        ...booking,
                                        service_names: (services as Array<{ id: string; name: string }>).filter(s => booking.service_ids.includes(s.id)).map(s => s.name),
                                        professional_name: (() => {
                                            const pro = (professionals as Array<{ id: string; name?: string; full_name?: string }>).find(p => p.id === booking.professional_id);
                                            return pro?.full_name ?? pro?.name ?? null;
                                        })(),
                                    }}
                                    managementToken={token}
                                    isBeauty={business?.user_type === 'beauty'}
                                    businessPhone={business?.phone ?? null}
                                    businessSlug={slug}
                                    businessName={business?.business_name}
                                    clientName={booking.customer_name}
                                    clientPhone={booking.customer_phone}
                                    region={(business?.region ?? 'BR') as Region}
                                    timeZone={resolveBusinessTimezone({ timezone: settings?.timezone, region: business?.region })}
                                    allowEdit={settings?.enable_self_rescheduling ?? true}
                                    cancelCutoffHours={cutoffHours}
                                    autoConfirmEnabled={isPublicBookingAutoConfirm(settings)}
                                    onCancelled={() => { void refetch(); }}
                                />
                            </>}
            </div>
        </main>
    );
};
