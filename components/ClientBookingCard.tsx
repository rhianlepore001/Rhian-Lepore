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

const STATUS_CONFIG: Record<string, { label: string; classBeauty: string; classBarber: string; icon: React.ReactNode }> = {
    pending: {
        label: 'Aguardando',
        classBeauty: 'bg-amber-100 text-amber-700 border border-amber-200',
        classBarber: 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/20',
        icon: <AlertCircle className="w-3 h-3" />,
    },
    confirmed: {
        label: 'Confirmado',
        classBeauty: 'bg-green-100 text-green-700 border border-green-200',
        classBarber: 'bg-green-500/15 text-green-300 border border-green-500/20',
        icon: <CheckCircle className="w-3 h-3" />,
    },
    completed: {
        label: 'Concluído',
        classBeauty: 'bg-stone-100 text-stone-500 border border-stone-200',
        classBarber: 'bg-zinc-700/30 text-zinc-400 border border-zinc-600/20',
        icon: <CheckCircle className="w-3 h-3" />,
    },
    cancelled: {
        label: 'Cancelado',
        classBeauty: 'bg-red-50 text-red-400 border border-red-100',
        classBarber: 'bg-red-500/10 text-red-400 border border-red-500/20',
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
            relative overflow-hidden rounded-2xl transition-all duration-300 hover:translate-y-[-2px] hover:shadow-promax-glass
            ${isBeauty
                ? 'bg-silk-card border border-silk-border shadow-silk-shadow hover:shadow-[0_14px_40px_rgba(0,0,0,0.2)]'
                : 'bg-brutal-card border border-white/5 hover:border-white/10'
            }
        `}>
            {/* Status bar — lateral esquerda */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl ${
                booking.status === 'confirmed' ? (isBeauty ? 'bg-green-400' : 'bg-green-500') :
                booking.status === 'pending' ? (isBeauty ? 'bg-amber-400' : 'bg-yellow-500') :
                booking.status === 'completed' ? (isBeauty ? 'bg-stone-300' : 'bg-zinc-600') :
                'bg-red-400'
            }`} aria-hidden="true" />

            <div className="p-5 pl-6 space-y-4">
                {/* Header: date + status */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <Calendar className={`w-4 h-4 shrink-0 ${isBeauty ? 'text-stone-400' : 'text-zinc-500'}`} />
                        <div>
                            <p className={`font-bold text-sm capitalize ${isBeauty ? 'text-stone-800' : 'text-white'}`}>
                                {formattedDate}
                            </p>
                            <div className="flex items-center gap-1 mt-0.5">
                                <Clock className={`w-3 h-3 ${isBeauty ? 'text-stone-400' : 'text-zinc-500'}`} />
                                <p className={`text-xs ${isBeauty ? 'text-stone-500' : 'text-zinc-400'}`}>
                                    {formattedTime} · {booking.duration_minutes}min
                                </p>
                            </div>
                        </div>
                    </div>
                    <span className={`
                        inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0
                        ${isBeauty ? statusCfg.classBeauty : statusCfg.classBarber}
                    `}>
                        {statusCfg.icon}
                        {statusCfg.label}
                    </span>
                </div>

                {/* Services */}
                <div>
                    <p className={`text-xs uppercase tracking-wider font-medium mb-1.5 ${isBeauty ? 'text-stone-400' : 'text-zinc-500'}`}>
                        Serviços
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {booking.service_names.length > 0
                            ? booking.service_names.map((name, i) => (
                                <span key={i} className={`
                                    text-xs px-2.5 py-1 rounded-full font-medium
                                    ${isBeauty
                                        ? 'bg-stone-100 text-stone-700'
                                        : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                                    }
                                `}>
                                    {name}
                                </span>
                            ))
                            : <span className={`text-xs ${isBeauty ? 'text-stone-400' : 'text-zinc-500'}`}>—</span>
                        }
                    </div>
                </div>

                {/* Professional + Price */}
                <div className={`flex items-center justify-between pt-3 border-t ${isBeauty ? 'border-stone-100' : 'border-zinc-800'}`}>
                    <div className="flex items-center gap-2">
                        <User className={`w-4 h-4 ${isBeauty ? 'text-stone-400' : 'text-zinc-500'}`} />
                        <span className={`text-sm ${isBeauty ? 'text-stone-600' : 'text-zinc-400'}`}>
                            {booking.professional_name ?? 'Qualquer profissional'}
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <DollarSign className={`w-4 h-4 ${isBeauty ? 'text-stone-500' : 'text-zinc-500'}`} />
                        <span className={`font-bold text-sm ${isBeauty ? 'text-stone-800' : 'text-white'}`}>
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
                                    ${isBeauty
                                        ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                                        : 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20'
                                    }
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
                                    bg-green-600 text-white hover:bg-green-500 border border-green-700
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
                                        ? 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700'
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
                                ${isBeauty
                                    ? 'bg-red-50 text-red-400 hover:bg-red-100 border border-red-100'
                                    : 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/15'
                                }
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
                                ? 'bg-stone-800 text-white hover:bg-stone-700'
                                : 'bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700'
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
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-2xl p-6 animate-in fade-in duration-200">
                    <div className="text-center space-y-4">
                        <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
                        <p className="text-white font-semibold text-sm">Cancelar este agendamento?</p>
                        <p className="text-zinc-400 text-xs">Esta ação não pode ser desfeita.</p>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={() => setShowConfirm(false)}
                                className="px-4 py-2 rounded-lg bg-zinc-700 text-white text-xs font-semibold hover:bg-zinc-600 transition-colors"
                            >
                                Manter
                            </button>
                            <button
                                onClick={handleCancel}
                                disabled={cancelling}
                                className="px-4 py-2 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-400 transition-colors disabled:opacity-60 flex items-center gap-1.5"
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
