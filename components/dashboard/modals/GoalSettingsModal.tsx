import React, { useState } from 'react';
import { Target, Check, TrendingUp } from 'lucide-react';
import { Modal } from '../../Modal';
import { BrutalButton } from '../../BrutalButton';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { logger } from '../../../utils/Logger';
import { useBrutalTheme } from '../../../hooks/useBrutalTheme';

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
    const { accent, colors, classes } = useBrutalTheme();

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
                    <label className={`block text-xs font-mono ${colors.textMuted} uppercase tracking-wider mb-2`}>
                        Meta de Faturamento Mensal
                    </label>
                    <div className="relative">
                        <span className={`absolute left-4 top-1/2 -translate-y-1/2 ${colors.textSecondary} font-mono`}>
                            R$
                        </span>
                        <input
                            type="number"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            className={`w-full ${colors.inputBg} border-2 ${accent.border} pl-12 pr-4 py-4 text-2xl font-mono ${colors.text} focus:outline-none focus:ring-2 ${accent.ring} rounded-xl`}
                            placeholder="0.00"
                        />
                    </div>
                    <p className={`mt-3 text-xs ${colors.textMuted} leading-relaxed`}>
                        Defina uma meta realista para motivar seu crescimento. Este valor será usado para calcular sua barra de progresso no dashboard deste mês.
                    </p>
                </div>

                <div className={`p-4 ${colors.card} ${colors.border} rounded-xl flex items-center gap-4`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${classes.badgeSuccess.replace(/px-2 py-0\.5 text-xs font-bold uppercase /, '')}`}>
                        <TrendingUp className={`w-5 h-5 ${classes.badgeSuccess.split(' ').find(c => c.startsWith('text-'))}`} />
                    </div>
                    <div>
                        <p className={`text-sm ${colors.text} font-heading`}>Foco em Crescimento</p>
                        <p className={`text-xs ${colors.textMuted} font-mono uppercase`}>Mantenha o histórico real de cada mês</p>
                    </div>
                </div>
            </div>
        </Modal>
    );
};
