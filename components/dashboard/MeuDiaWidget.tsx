import React, { useState } from 'react';
import { BrutalCard } from '../BrutalCard';
import { CheckCircle2, Clock, Calendar, Check, Undo2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useMeuDiaData, MeuDiaAppointment } from '../../hooks/useMeuDiaData';
import { formatCurrency } from '../../utils/formatters';

// Animação inline para simular sucesso imediato de 1-toque
const QuickActionItem: React.FC<{
    apt: MeuDiaAppointment,
    onComplete: (id: string) => Promise<boolean>
}> = ({ apt, onComplete }) => {
    const [status, setStatus] = useState<'idle' | 'completing' | 'done'>('idle');

    const isConfirmed = apt.status === 'Confirmed' || apt.status === 'Confirmado';
    const isCompleted = apt.status === 'Completed' || apt.status === 'Concluído' || status === 'done';

    const handleCompleteClick = async () => {
        setStatus('completing');
        const success = await onComplete(apt.id);
        if (success) {
            setStatus('done');
        } else {
            setStatus('idle');
        }
    };

    if (isCompleted) {
        return (
            <li className="p-3 md:p-4 bg-green-900/10 border-l-4 border-green-500 rounded-lg flex items-center justify-between group opacity-70 transition-all duration-500">
                <div className="flex items-center gap-3">
                    <div className="bg-green-900/50 p-2 rounded-full">
                        <CheckCircle2 className="w-6 h-6 text-green-500" />
                    </div>
                    <div>
                        <p className="font-heading text-sm md:text-lg text-white line-through">{apt.clientName}</p>
                        <p className="text-[10px] md:text-xs text-green-400 font-mono">Concluído • {apt.service}</p>
                    </div>
                </div>
            </li>
        );
    }

    return (
        <li className={`p-3 md:p-4 hover:bg-white/5 bg-neutral-900/30 rounded-lg transition-all flex items-center justify-between group ${status === 'completing' ? 'opacity-50 scale-95' : ''}`}>
            <div className="flex items-center gap-3 md:gap-4 flex-1">
                <div className="font-mono text-base font-bold text-white bg-neutral-900 px-3 py-2 border border-neutral-700 flex flex-col items-center shadow-inner">
                    <span>{apt.time}</span>
                </div>
                <div className="flex-1 truncate">
                    <p className="font-heading text-sm md:text-lg text-white truncate">{apt.clientName}</p>
                    <div className="flex justify-between w-full max-w-[200px]">
                        <p className="text-[10px] md:text-xs text-text-secondary font-mono truncate">{apt.service}</p>
                        <p className="text-[10px] md:text-xs text-accent-gold font-mono ml-2">R$ {apt.price}</p>
                    </div>
                </div>
            </div>

            {isConfirmed && (
                <div className="ml-2">
                    <button
                        onClick={handleCompleteClick}
                        disabled={status === 'completing'}
                        className="bg-green-600 hover:bg-green-500 text-white p-3 rounded-xl font-bold font-mono uppercase tracking-widest text-xs flex items-center shadow-[0_4px_0_0_rgb(21,128,61)] active:translate-y-1 active:shadow-none transition-all"
                        aria-label="Concluir agendamento"
                    >
                        {status === 'completing' ? <Clock className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                    </button>
                </div>
            )}
        </li>
    );
};

export const MeuDiaWidget: React.FC = () => {
    const { userType, region, fullName } = useAuth();
    const { appointments, summary, loading, markAsCompleted } = useMeuDiaData();

    const isBeauty = userType === 'beauty';
    const currencyRegion = region === 'PT' ? 'PT' : 'BR';
    const accentText = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';

    const firstName = fullName?.split(' ')[0] || 'Profissional';

    return (
        <BrutalCard
            id="dashboard-meu-dia"
            className="brutal-card-enhanced gold-accent-border mb-6"
            title={
                <div className="flex flex-col gap-1">
                    <span className="text-xl md:text-2xl font-heading text-white">Bom dia, {firstName}! ☀️</span>
                    <span className="text-xs md:text-sm text-text-secondary font-mono">
                        {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </span>
                </div>
            }
        >
            <div className="space-y-6">
                {/* Resumo Rápido */}
                <div className="grid grid-cols-3 gap-2 md:gap-4 bg-neutral-900 p-4 rounded-xl border border-white/10">
                    <div className="flex flex-col items-center text-center">
                        <span className="text-[10px] md:text-xs uppercase font-mono text-text-secondary">Concluídos</span>
                        <span className={`text-xl md:text-3xl font-bold font-heading ${accentText}`}>{summary.completed}</span>
                    </div>
                    <div className="flex flex-col items-center text-center border-x border-white/10">
                        <span className="text-[10px] md:text-xs uppercase font-mono text-text-secondary">Pendentes</span>
                        <span className="text-xl md:text-3xl font-bold font-heading text-white">{summary.pending}</span>
                    </div>
                    <div className="flex flex-col items-center text-center">
                        <span className="text-[10px] md:text-xs uppercase font-mono text-text-secondary">Faturamento</span>
                        <span className="text-sm md:text-lg font-bold font-mono text-green-400 pt-1">
                            {formatCurrency(summary.dailyEarnings, currencyRegion)}
                        </span>
                    </div>
                </div>

                {/* Lista de Atendimentos */}
                <div>
                    <h3 className="text-sm font-bold uppercase text-white mb-4 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Sua Agenda de Hoje
                    </h3>

                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-20 bg-neutral-800/50 animate-pulse rounded-lg border border-white/5"></div>
                            ))}
                        </div>
                    ) : appointments.length > 0 ? (
                        <ul className="space-y-3">
                            {appointments.map(apt => (
                                <QuickActionItem key={apt.id} apt={apt} onComplete={markAsCompleted} />
                            ))}
                        </ul>
                    ) : (
                        <div className="text-center py-8 bg-neutral-900/50 rounded-lg border border-white/5 border-dashed">
                            <Calendar className="w-8 h-8 text-text-secondary/30 mx-auto mb-2" />
                            <p className="text-text-secondary font-mono text-sm">Dia tranquilo — nenhum agendamento.</p>
                            <p className="text-[10px] mt-2 opacity-50">Aproveite para chamar clientes que não aparecem há tempo!</p>
                        </div>
                    )}
                </div>
            </div>
        </BrutalCard>
    );
};
