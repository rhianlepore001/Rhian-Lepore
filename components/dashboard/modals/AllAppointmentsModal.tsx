import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../Modal';
import { BrutalButton } from '../../BrutalButton';
import { Skeleton } from '../../SkeletonLoader';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { formatCurrency } from '../../../utils/formatters';
import { logger } from '../../../utils/Logger';
import { Scissors, Clock, User, Calendar, Trash2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

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

    const accentText = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';

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
                    <div className="text-center py-10">
                        <Calendar className="w-12 h-12 text-neutral-600 mx-auto mb-3 opacity-50" />
                        <p className="text-text-secondary font-mono">Nenhum agendamento futuro encontrado.</p>
                    </div>
                ) : (
                    <ul className="divide-y-2 divide-neutral-800 border-2 border-neutral-800 rounded-lg overflow-hidden">
                        {appointments.map((apt) => (
                            <li
                                key={apt.id}
                                onClick={() => {
                                    onClose();
                                    navigate(`/agenda?date=${apt.rawDate}`);
                                }}
                                className={`p-4 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer ${isBeauty ? 'hover:bg-beauty-neon/10' : 'hover:bg-accent-gold/10'}`}
                            >
                                <div className="flex items-start sm:items-center gap-4">
                                    <div className={`font-mono text-xl font-bold ${accentText} bg-neutral-900 px-3 py-2 border border-neutral-700 flex flex-col items-center min-w-[80px]`}>
                                        <span>{apt.time}</span>
                                        <span className="text-xs opacity-70 mt-1">{apt.date}</span>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <User className="w-3.5 h-3.5 text-neutral-400" />
                                            <p className="font-heading text-lg text-white">{apt.clientName}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Scissors className="w-3 h-3 text-neutral-500" />
                                            <p className="text-sm text-text-secondary font-mono">{apt.service}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="hidden sm:block">
                                    <span className={`px-2 py-1 text-xs font-mono uppercase tracking-wider ${apt.status === 'Confirmed' ? 'text-green-500 bg-green-500/10' : 'text-yellow-500 bg-yellow-500/10'}`}>
                                        {apt.status}
                                    </span>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </Modal>
    );
};
