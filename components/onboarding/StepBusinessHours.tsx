import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { BusinessHoursEditor } from '../BusinessHoursEditor';
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

export const StepBusinessHours: React.FC<StepBusinessHoursProps> = ({ onNext, onBack, accentColor }) => {
    const { user, userType } = useAuth();
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
                alert('Erro ao salvar horários. Por favor, tente novamente.');
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
            alert('Erro ao salvar horários. Por favor, tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <BusinessHoursEditor
                hours={businessHours}
                onChange={setBusinessHours}
                isBeauty={userType === 'beauty'}
            />

            <div className="flex gap-4 pt-4">
                <button
                    onClick={onBack}
                    className="flex-1 py-4 bg-neutral-800 text-white font-bold rounded-lg hover:bg-neutral-700 transition-colors"
                >
                    Voltar
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className={accentColor === 'beauty-neon' ? 'flex-1 py-4 bg-beauty-neon text-black font-bold rounded-lg hover:bg-beauty-neon/90 transition-colors flex items-center justify-center gap-2' : 'flex-1 py-4 bg-accent-gold text-black font-bold rounded-lg hover:bg-accent-gold/90 transition-colors flex items-center justify-center gap-2'}
                >
                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Continuar'}
                </button>
            </div>
        </div>
    );
};