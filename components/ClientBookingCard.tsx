import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Calendar, Clock, User, DollarSign, MessageSquare,
    Edit3, X, RefreshCw, CheckCircle, AlertCircle, Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatCurrency, Region } from '../utils/formatters';

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
}

interface ClientBookingCardProps {
    booking: ClientBooking;
    isBeauty: boolean;
    businessPhone: string | null;
    businessSlug: string;
    clientName: string;
    region?: Region;
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
    region = 'BR',
    allowEdit = true,
    onCancelled,
}) => {
    const navigate = useNavigate();
    const [cancelling, setCancelling] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const isUpcoming = ['pending', 'confirmed'].includes(booking.status);
    const isPast = !isUpcoming && booking.status !== 'cancelled';
    const statusCfg = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.completed;

    const appointmentDate = new Date(booking.appointment_time);
    const formattedDate = appointmentDate.toLocaleDateString('pt-BR', {
        weekday: 'short', day: '2-digit', month: 'short'
    });
    const formattedTime = appointmentDate.toLocaleTimeString('pt-BR', {
        hour: '2-digit', minute: '2-digit'
    });

    const handleCancel = async () => {
        setCancelling(true);
        try {
            const { error } = await supabase
                .from('public_bookings')
                .update({ status: 'cancelled' })
                .eq('id', booking.id);

            if (error) throw error;
            onCancelled(booking.id);
        } catch {
            // silently fail — user stays on page
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
            relative overflow-hidden rounded-2xl transition-all duration-300 hover:translate-y-[-2px] hover:shadow-[var(--shadow-card)]
            ${isBeauty
                ? 'bg-theme-card border border-theme-border shadow-[var(--elevation-2)]'
                : 'bg-theme-card border border-theme-border hover:border-[var(--color-border-strong)]'
            }
        `}>
            {/* Status bar — lateral esquerda */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${
                booking.status === 'confirmed' ? 'bg-[var(--color-success)]' :
                booking.status === 'pending' ? 'bg-[var(--color-warning)]' :
                booking.status === 'completed' ? 'bg-[var(--color-text-muted)]' :
                'bg-[var(--color-danger)]'
            }`} aria-hidden="true" />

            <div className="p-5 pl-6 space-y-4">
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
                <div className={`flex items-center justify-between pt-3 border-t ${isBeauty ? 'border-theme-border' : 'border-theme-border'}`}>
                    <div className="flex items-center gap-2">
                        <User className={`w-4 h-4 ${isBeauty ? 'text-theme-textSecondary' : 'text-[var(--color-text-muted)]'}`} />
                        <span className={`text-sm ${isBeauty ? 'text-[var(--color-text-muted)]' : 'text-theme-textSecondary'}`}>
                            {booking.professional_name ?? 'Qualquer profissional'}
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <DollarSign className={`w-4 h-4 ${isBeauty ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-text-muted)]'}`} />
                        <span className={`font-bold text-sm ${isBeauty ? 'text-theme-text' : 'text-theme-text'}`}>
                            {formatCurrency(booking.total_price, region)}
                        </span>
                    </div>
                </div>

                {/* Actions */}
                {isUpcoming && (
                    <div className="flex items-center gap-2 pt-1">
                        {businessPhone && (
                            <button
                                onClick={handleWhatsApp}
                                className={`
                                    flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all
                                    bg-[var(--color-success-bg)] text-[var(--color-success)] hover:brightness-110 border border-[var(--color-success-border)]
                                `}
                            >
                                <MessageSquare className="w-3.5 h-3.5" />
                                WhatsApp
                            </button>
                        )}
                        {booking.status === 'pending' && businessPhone && (
                            <button
                                onClick={handleConfirmWhatsApp}
                                className={`
                                    flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all
                                    bg-[var(--color-success)] text-[var(--color-bg)] hover:brightness-110 border border-[var(--color-success-border)]
                                `}
                            >
                                <MessageSquare className="w-3.5 h-3.5" />
                                Cobrar Confirmação
                            </button>
                        )}
                        {allowEdit && (
                            <button
                                onClick={() => navigate(`/book/${businessSlug}?edit=${booking.id}`)}
                                className={`
                                    flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all
                                    ${isBeauty
                                        ? 'bg-theme-surface text-theme-text hover:bg-[var(--color-card-hover)]'
                                        : 'bg-theme-surface text-theme-text hover:bg-[var(--color-card-hover)] border border-theme-border'
                                    }
                                `}
                            >
                                <Edit3 className="w-3.5 h-3.5" />
                                Editar
                            </button>
                        )}
                        <button
                            onClick={() => setShowConfirm(true)}
                            className={`
                                flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ml-auto
                                bg-[var(--color-danger-bg)] text-[var(--color-danger)] hover:brightness-110 border border-[var(--color-danger-border)]
                            `}
                        >
                            <X className="w-3.5 h-3.5" />
                            Cancelar
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
