import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Calendar, Clock, User, MessageSquare,
    Edit3, X, RefreshCw, CheckCircle, AlertCircle, Loader2
} from 'lucide-react';
import { formatCurrency, Region } from '../utils/formatters';
import { cancelPublicBooking } from '../services/publicBooking';
import { useToast } from './ui/Toast';
import { logger } from '../utils/Logger';
import { resolveBusinessTimezone } from '../utils/businessTimezone';
import { cancellationMessage, rebookPath } from '../utils/clientBookings';

export interface ClientBooking {
    id: string;
    appointment_time: string;
    status: string;
    service_ids: string[];
    service_names: string[];
    professional_id: string | null;
    professional_name: string | null;
    total_price: number;
    duration_minutes: number;
    created_at: string;
    /** get_client_booking_cancellations: cancelado pelo estabelecimento (item 5b). */
    cancelled_by_business?: boolean;
}

interface ClientBookingCardProps {
    booking: ClientBooking;
    isBeauty: boolean;
    businessPhone: string | null;
    businessSlug: string;
    clientName: string;
    clientPhone: string;
    region?: Region;
    /** Fuso IANA do negócio; horários são exibidos nele (não no do navegador). */
    timeZone?: string;
    allowEdit?: boolean;
    onCancelled: (bookingId: string) => void;
}

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    pending: {
        label: 'Aguardando',
        className: 'bg-[var(--color-warning-bg)] text-[var(--color-warning)] border border-[var(--color-warning-border)]',
        icon: <AlertCircle className="w-3 h-3" />,
    },
    confirmed: {
        label: 'Confirmado',
        className: 'bg-[var(--color-success-bg)] text-[var(--color-success)] border border-[var(--color-success-border)]',
        icon: <CheckCircle className="w-3 h-3" />,
    },
    completed: {
        label: 'Concluído',
        className: 'bg-theme-surface text-theme-textSecondary border border-theme-border',
        icon: <CheckCircle className="w-3 h-3" />,
    },
    cancelled: {
        label: 'Cancelado',
        className: 'bg-[var(--color-danger-bg)] text-[var(--color-danger)] border border-[var(--color-danger-border)]',
        icon: <X className="w-3 h-3" />,
    },
};

export const ClientBookingCard: React.FC<ClientBookingCardProps> = ({
    booking,
    isBeauty,
    businessPhone,
    businessSlug,
    clientName,
    clientPhone,
    region = 'BR',
    timeZone,
    allowEdit = true,
    onCancelled,
}) => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [cancelling, setCancelling] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const isUpcoming = ['pending', 'confirmed'].includes(booking.status);
    const isCancelled = booking.status === 'cancelled';
    const isPast = !isUpcoming && !isCancelled;
    const statusCfg = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.completed;

    const businessTz = resolveBusinessTimezone({ timezone: timeZone, region });
    const appointmentDate = new Date(booking.appointment_time);
    const formattedDate = appointmentDate.toLocaleDateString('pt-BR', {
        timeZone: businessTz, weekday: 'short', day: '2-digit', month: 'short'
    });
    const formattedTime = appointmentDate.toLocaleTimeString('pt-BR', {
        timeZone: businessTz, hour: '2-digit', minute: '2-digit'
    });

    const handleCancel = async () => {
        if (!clientPhone) {
            showToast('Não foi possível cancelar. Entre de novo na Minha Área com o WhatsApp do agendamento.', 'error');
            setShowConfirm(false);
            return;
        }
        setCancelling(true);
        try {
            await cancelPublicBooking(booking.id, clientPhone);
            onCancelled(booking.id);
            showToast('Agendamento cancelado.', 'success');
        } catch (error) {
            logger.error('Error cancelling public booking', error);
            showToast('Não foi possível cancelar. Tente de novo ou fale com o salão.', 'error');
        } finally {
            setCancelling(false);
            setShowConfirm(false);
        }
    };

    const handleRebook = () => {
        const serviceParam = booking.service_ids.join(',');
        navigate(`/book/${businessSlug}?rebook=${serviceParam}`);
    };

    const handleWhatsApp = () => {
        if (!businessPhone) return;
        const clean = businessPhone.replace(/\D/g, '');
        const msg = encodeURIComponent(
            `Olá! Sou ${clientName} e tenho uma dúvida sobre meu agendamento de ${formattedDate} às ${formattedTime}.`
        );
        window.open(`https://wa.me/${clean}?text=${msg}`, '_blank', 'noopener,noreferrer');
    };

    const handleConfirmWhatsApp = () => {
        if (!businessPhone) return;
        const clean = businessPhone.replace(/\D/g, '');
        const recipientName = booking.professional_name ?? 'o salão';
        const msg = encodeURIComponent(
            `Olá, eu fiz um agendamento online (para ${formattedDate} às ${formattedTime} com ${recipientName}) e estou aguardando a sua confirmação.`
        );
        window.open(`https://wa.me/${clean}?text=${msg}`, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className={`
            relative overflow-hidden min-w-0 w-full rounded-2xl
            bg-theme-card border border-theme-border
        `}>
            {/* Status bar — lateral esquerda */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${
                booking.status === 'confirmed' ? 'bg-[var(--color-success)]' :
                booking.status === 'pending' ? 'bg-[var(--color-warning)]' :
                booking.status === 'completed' ? 'bg-[var(--color-text-muted)]' :
                'bg-[var(--color-danger)]'
            }`} aria-hidden="true" />

            <div className="p-4 pl-5 space-y-3 min-w-0">
                {/* Header: date + status */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <Calendar className={`w-4 h-4 shrink-0 ${isBeauty ? 'text-theme-textSecondary' : 'text-[var(--color-text-muted)]'}`} />
                        <div>
                            <p className={`font-bold text-sm capitalize ${isBeauty ? 'text-theme-text' : 'text-theme-text'}`}>
                                {formattedDate}
                            </p>
                            <div className="flex items-center gap-1 mt-0.5">
                                <Clock className={`w-3 h-3 ${isBeauty ? 'text-theme-textSecondary' : 'text-[var(--color-text-muted)]'}`} />
                                <p className={`text-xs ${isBeauty ? 'text-[var(--color-text-muted)]' : 'text-theme-textSecondary'}`}>
                                    {formattedTime} · {booking.duration_minutes}min
                                </p>
                            </div>
                        </div>
                    </div>
                    <span className={`
                        inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0
                        ${statusCfg.className}
                    `}>
                        {statusCfg.icon}
                        {statusCfg.label}
                    </span>
                </div>

                {/* Services */}
                <div>
                    <p className={`text-xs uppercase tracking-wider font-medium mb-1.5 ${isBeauty ? 'text-theme-textSecondary' : 'text-[var(--color-text-muted)]'}`}>
                        Serviços
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {booking.service_names.length > 0
                            ? booking.service_names.map((name, i) => (
                                <span key={i} className={`
                                    text-xs px-2.5 py-1 rounded-full font-medium
                                    ${isBeauty
                                        ? 'bg-theme-surface text-theme-text'
                                        : 'bg-theme-surface text-theme-text border border-theme-border'
                                    }
                                `}>
                                    {name}
                                </span>
                            ))
                            : <span className={`text-xs ${isBeauty ? 'text-theme-textSecondary' : 'text-[var(--color-text-muted)]'}`}>—</span>
                        }
                    </div>
                </div>

                {/* Professional + Price */}
                <div className="flex items-start justify-between gap-2 pt-3 border-t border-theme-border min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                        <User className="w-4 h-4 shrink-0 text-[var(--color-text-muted)]" />
                        <span className="text-sm text-theme-textSecondary break-words">
                            {booking.professional_name ?? 'Qualquer profissional'}
                        </span>
                    </div>
                    <span className="font-bold text-sm text-theme-text shrink-0">
                        {formatCurrency(booking.total_price, region)}
                    </span>
                </div>

                {/* Actions */}
                {isUpcoming && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                        {businessPhone && (
                            <button
                                type="button"
                                onClick={handleWhatsApp}
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl text-xs font-semibold bg-[var(--color-success-bg)] text-[var(--color-success)] border border-[var(--color-success-border)]"
                            >
                                <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                                WhatsApp
                            </button>
                        )}
                        {booking.status === 'pending' && businessPhone && (
                            <button
                                type="button"
                                onClick={handleConfirmWhatsApp}
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl text-xs font-semibold bg-[var(--color-success)] text-[#FFFFFF] col-span-2"
                            >
                                <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                                Pedir confirmação
                            </button>
                        )}
                        {allowEdit && (
                            <button
                                type="button"
                                onClick={() => navigate(`/book/${businessSlug}?edit=${booking.id}`)}
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl text-xs font-semibold bg-theme-surface text-theme-text border border-theme-border"
                            >
                                <Edit3 className="w-3.5 h-3.5 shrink-0" />
                                Editar
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => setShowConfirm(true)}
                            className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl text-xs font-semibold bg-[var(--color-danger-bg)] text-[var(--color-danger)] border border-[var(--color-danger-border)] ${allowEdit ? '' : 'col-span-2'}`}
                        >
                            <X className="w-3.5 h-3.5 shrink-0" />
                            Cancelar
                        </button>
                    </div>
                )}

                {isCancelled && (
                    <div className="space-y-2 pt-1" data-testid="client-booking-cancelled">
                        <p
                            className="flex items-start gap-2 px-3 py-2 rounded-xl text-xs leading-snug break-words bg-[var(--color-danger-bg)] text-[var(--color-danger)] border border-[var(--color-danger-border)]"
                            data-testid="client-booking-cancelled-note"
                        >
                            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" aria-hidden="true" />
                            {cancellationMessage(booking)}
                        </p>
                        <button
                            type="button"
                            onClick={() => navigate(rebookPath(businessSlug, booking))}
                            className={`w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 min-h-[44px] rounded-xl text-xs font-bold uppercase tracking-wider bg-theme-accent hover:opacity-90 transition-opacity ${isBeauty ? 'text-[var(--color-text)]' : 'text-[var(--color-on-accent)]'}`}
                            data-testid="client-booking-reschedule"
                        >
                            <Calendar className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                            Reagendar horário
                        </button>
                    </div>
                )}

                {isPast && (
                    <button
                        onClick={handleRebook}
                        className={`
                            w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all
                            ${isBeauty
                                ? 'bg-theme-surface text-theme-text hover:bg-[var(--color-card-hover)]'
                                : 'bg-theme-surface text-theme-text hover:bg-[var(--color-card-hover)] border border-theme-border'
                            }
                        `}
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Repetir este agendamento
                    </button>
                )}
            </div>

            {/* Confirm cancel overlay */}
            {showConfirm && (
                <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-bg)]/80 backdrop-blur-sm rounded-2xl p-6 animate-in fade-in duration-200">
                    <div className="text-center space-y-4">
                        <AlertCircle className="w-10 h-10 text-[var(--color-danger)] mx-auto" />
                        <p className="text-theme-text font-semibold text-sm">Cancelar este agendamento?</p>
                        <p className="text-theme-textSecondary text-xs">Esta ação não pode ser desfeita.</p>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={() => setShowConfirm(false)}
                                className="px-4 py-2 rounded-lg bg-theme-surface text-theme-text text-xs font-semibold hover:bg-[var(--color-card-hover)] transition-colors"
                            >
                                Manter
                            </button>
                            <button
                                onClick={handleCancel}
                                disabled={cancelling}
                                className="px-4 py-2 rounded-lg bg-[var(--color-danger)] text-theme-text text-xs font-semibold hover:bg-[var(--color-danger)] transition-colors disabled:opacity-60 flex items-center gap-1.5"
                            >
                                {cancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
