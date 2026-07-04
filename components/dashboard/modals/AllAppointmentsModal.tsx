import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../Modal';
import { BrutalButton } from '../../BrutalButton';
import { Skeleton } from '../../SkeletonLoader';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { formatCurrency } from '../../../utils/formatters';
import { logger } from '../../../utils/Logger';
import { useBrutalTheme } from '../../../hooks/useBrutalTheme';
import { EmptyState } from '../../EmptyState';
import { Scissors, Clock, User, Calendar, Trash2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { getVisualStatus, VISUAL_STATUS_CLASSES, VISUAL_STATUS_LABEL } from '../../../utils/appointmentStatus';

interface AllAppointmentsModalProps {
    isOpen: boolean;
    onClose: () => void;
    fetchAllAppointments: () => Promise<any[]>;
    isBeauty?: boolean;
}

export const AllAppointmentsModal: React.FC<AllAppointmentsModalProps> = ({
    isOpen,
    onClose,
    fetchAllAppointments,
    isBeauty = false
}) => {
    const [appointments, setAppointments] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        if (!isOpen) return;

        let cancelled = false;
        setLoading(true);
        setAppointments([]);

        fetchAllAppointments().then(data => {
            if (!cancelled) {
                setAppointments(data ?? []);
                setLoading(false);
            }
        }).catch(() => {
            if (!cancelled) setLoading(false);
        });

        return () => { cancelled = true; };
    }, [isOpen, fetchAllAppointments]);

    const { accent, colors, classes } = useBrutalTheme();

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Todos os Agendamentos Futuros"
            size="lg"
            footer={
                <div className="w-full flex justify-end">
                    <BrutalButton variant="ghost" onClick={onClose}>
                        Fechar
                    </BrutalButton>
                </div>
            }
        >
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3, 4, 5].map(i => (
                            <Skeleton key={i} className="h-16 w-full" />
                        ))}
                    </div>
                ) : appointments.length === 0 ? (
                    <EmptyState
                        icon={Calendar}
                        message="Nenhum agendamento futuro encontrado."
                    />
                ) : (
                    <ul className={`divide-y-2 ${colors.divider} border-2 ${colors.divider} rounded-lg overflow-hidden`}>
                        {appointments.map((apt) => (
                            <li
                                key={apt.id}
                                onClick={() => {
                                    onClose();
                                    navigate(`/agenda?date=${apt.rawDate}`);
                                }}
                                className={`p-4 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-[var(--color-accent-dim)]`}
                            >
                                <div className="flex items-start sm:items-center gap-4">
                                    <div className={`font-mono text-xl font-bold ${accent.text} ${colors.card} px-3 py-2 border ${colors.border} flex flex-col items-center min-w-[80px]`}>
                                        <span>{apt.time}</span>
                                        <span className={`text-xs ${colors.textMuted} mt-1`}>{apt.date}</span>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <User className={`w-3.5 h-3.5 ${colors.textSecondary}`} />
                                            <p className={`font-heading text-lg ${colors.text}`}>{apt.clientName}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Scissors className={`w-3 h-3 ${colors.textMuted}`} />
                                            <p className={`text-sm ${colors.textSecondary} font-mono`}>{apt.service}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="hidden sm:block">
                                    {(() => {
                                        const v = getVisualStatus(apt);
                                        return (
                                            <span className={`px-2 py-1 text-xs font-mono uppercase tracking-wider rounded-full border ${VISUAL_STATUS_CLASSES[v].card} ${VISUAL_STATUS_CLASSES[v].text}`}>
                                                {VISUAL_STATUS_LABEL[v]}
                                            </span>
                                        );
                                    })()}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </Modal>
    );
};
