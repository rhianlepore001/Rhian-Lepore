import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Copy, MessageCircle, Star } from 'lucide-react';
import { Button } from '@/components/ui';
import { issueCustomerReviewInvite } from '@/services/customerReviews';
import { copyTextToClipboard } from '@/utils/clipboard';
import { buildWhatsAppLink, type Region } from '@/utils/formatters';

interface AppointmentReviewInviteProps {
    appointmentId: string;
    clientPhone: string;
    region: Region;
}

export function AppointmentReviewInvite({ appointmentId, clientPhone, region }: AppointmentReviewInviteProps) {
    const invite = useMutation({ mutationFn: () => issueCustomerReviewInvite(appointmentId) });
    const [copyStatus, setCopyStatus] = useState('');
    const addressRef = useRef<HTMLInputElement>(null);
    const link = invite.data?.status === 'ready'
        ? `${window.location.origin}/#/avaliar/${invite.data.token}`
        : null;
    const whatsApp = link && clientPhone
        ? buildWhatsAppLink(clientPhone, region, `Olá! Como foi seu atendimento? Sua opinião é bem-vinda: ${link}`)
        : null;

    const copyLink = async () => {
        if (!link) return;
        if (await copyTextToClipboard(link)) {
            setCopyStatus('Link copiado.');
        } else {
            addressRef.current?.focus();
            addressRef.current?.select();
            setCopyStatus('Selecione e copie o link acima.');
        }
    };

    return (
        <div className="space-y-2">
            {link ? (
                <>
                    <label htmlFor="appointment-review-link" className="block text-sm font-semibold text-theme-text">Link para o cliente avaliar</label>
                    <input
                        id="appointment-review-link"
                        ref={addressRef}
                        readOnly
                        value={link}
                        className="min-h-11 w-full rounded-xl border border-theme-border bg-theme-card px-3 text-sm text-theme-text"
                    />
                    <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" onClick={() => void copyLink()}><Copy className="mr-2 size-4" aria-hidden="true" />Copiar link</Button>
                        {whatsApp && (
                            <a
                                href={whatsApp}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-theme-accent px-3 text-sm font-semibold text-[var(--color-on-accent)]"
                            >
                                <MessageCircle className="size-4" aria-hidden="true" />
                                Enviar pelo WhatsApp
                            </a>
                        )}
                    </div>
                    {copyStatus && <p role="status" className="text-sm text-theme-textSecondary">{copyStatus}</p>}
                </>
            ) : invite.data?.status === 'reviewed' ? (
                <p role="status" className="text-sm font-semibold text-theme-text">Atendimento já avaliado pelo cliente.</p>
            ) : (
                <>
                    <Button variant="secondary" onClick={() => invite.mutate()} loading={invite.isPending}>
                        <Star className="mr-2 size-4" aria-hidden="true" />
                        Solicitar avaliação
                    </Button>
                    {invite.isError && (
                        <p role="alert" className="text-sm text-[var(--color-danger)]">
                            Não foi possível gerar o link. Confira se o atendimento está concluído e tente novamente.
                        </p>
                    )}
                </>
            )}
        </div>
    );
}
