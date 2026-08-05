import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { BusinessHoursEditor } from '../BusinessHoursEditor';
import { useToast } from '../ui/Toast';
import { logger } from '../../utils/Logger';

interface StepBusinessHoursProps {
    onNext: () => void;
    onBack: () => void;
    accentColor: string;
}

// Novo padrão de horário: 09:00-21:00 com almoço 12:30-13:30
const defaultHours = {
    isOpen: true,
    blocks: [
        { start: '09:00', end: '12:30' },
        { start: '13:30', end: '21:00' }
    ]
};

export const StepBusinessHours: React.FC<StepBusinessHoursProps> = ({ onNext, onBack }) => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [businessHours, setBusinessHours] = useState<any>({
        mon: defaultHours,
        tue: defaultHours,
        wed: defaultHours,
        thu: defaultHours,
        fri: defaultHours,
        sat: { isOpen: true, blocks: [{ start: '09:00', end: '14:00' }] },
        sun: { isOpen: false, blocks: [] },
    });

    const handleSubmit = async () => {
        if (!user) return;
        setLoading(true);

        try {
            logger.info('Saving business hours', { businessHours });

            const { error: settingsError } = await supabase.from('business_settings').upsert({
                user_id: user.id,
                business_hours: businessHours
            }, { onConflict: 'user_id' });

            if (settingsError) {
                logger.error('Error saving business hours', settingsError);
                showToast('Erro ao salvar horários. Por favor, tente novamente.', 'error');
                setLoading(false);
                return;
            }

            logger.info('Business hours saved successfully');

            const { error: stepError } = await supabase.rpc('update_onboarding_step', {
                p_user_id: user.id,
                p_step: 3
            });

            if (stepError) {
                logger.error('Error updating onboarding step', stepError);
            }

            onNext();
        } catch (error) {
            logger.error('Error saving hours', error);
            showToast('Erro ao salvar horários. Por favor, tente novamente.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <BusinessHoursEditor
                hours={businessHours}
                onChange={setBusinessHours}
            />

            <div className="flex gap-4 pt-4">
                <button
                    onClick={onBack}
                    className="flex-1 py-4 bg-[var(--color-card)] text-theme-text font-bold rounded-lg hover:bg-[var(--color-card-hover)] transition-colors border border-[var(--color-border)]"
                >
                    Voltar
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-1 py-4 bg-theme-accent text-[var(--color-on-accent)] font-bold rounded-lg hover:brightness-110 transition-colors flex items-center justify-center gap-2"
                >
                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Continuar'}
                </button>
            </div>
        </div>
    );
};
