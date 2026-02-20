import React, { useState } from 'react';
import { Target, Check, TrendingUp } from 'lucide-react';
import { BrutalButton } from '../BrutalButton';
import { Modal } from '../Modal';

interface GoalSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentGoal: number;
    onSave: (newGoal: number) => Promise<any>;
    isBeauty?: boolean;
}

export const GoalSettingsModal: React.FC<GoalSettingsModalProps> = ({
    isOpen,
    onClose,
    currentGoal,
    onSave,
    isBeauty = false
}) => {
    const [value, setValue] = useState(currentGoal.toString());
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue < 0) return;

        setIsSaving(true);
        try {
            await onSave(numValue);
            onClose();
        } finally {
            setIsSaving(false);
        }
    };

    const accentText = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';
    const accentBorder = isBeauty ? 'border-beauty-neon' : 'border-accent-gold';

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Configurar Meta"
            size="md"
            footer={
                <div className="flex gap-3 w-full">
                    <BrutalButton
                        variant="ghost"
                        onClick={onClose}
                        className="flex-1"
                    >
                        Cancelar
                    </BrutalButton>
                    <BrutalButton
                        variant="primary"
                        onClick={handleSave}
                        className="flex-1"
                        disabled={isSaving}
                        icon={isSaving ? undefined : <Check className="w-4 h-4" />}
                    >
                        {isSaving ? 'Salvando...' : 'Salvar Meta'}
                    </BrutalButton>
                </div>
            }
        >
            <div className="space-y-6">
                <div>
                    <label className="block text-xs font-mono text-neutral-500 uppercase tracking-wider mb-2">
                        Meta de Faturamento Mensal
                    </label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-mono">
                            R$
                        </span>
                        <input
                            type="number"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            className={`w-full bg-black border-2 ${accentBorder} pl-12 pr-4 py-4 text-2xl font-mono text-white focus:outline-none focus:ring-2 ${isBeauty ? 'focus:ring-beauty-neon/20 rounded-xl' : 'focus:ring-accent-gold/20'}`}
                            placeholder="0.00"
                        />
                    </div>
                    <p className="mt-3 text-xs text-neutral-500 leading-relaxed">
                        Defina uma meta realista para motivar seu crescimento. Este valor será usado para calcular sua barra de progresso no dashboard deste mês.
                    </p>
                </div>

                <div className={`p-4 ${isBeauty ? 'bg-white/5 rounded-xl' : 'bg-neutral-800 border-2 border-brutal-border'} flex items-center gap-4`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isBeauty ? 'bg-beauty-acid/20 text-beauty-acid' : 'bg-green-500/20 text-green-500'}`}>
                        <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-sm text-white font-heading">Foco em Crescimento</p>
                        <p className="text-[10px] text-neutral-400 font-mono uppercase">Mantenha o histórico real de cada mês</p>
                    </div>
                </div>
            </div>
        </Modal>
    );
};
