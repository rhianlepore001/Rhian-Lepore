import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { BusinessHoursEditor } from '../BusinessHoursEditor';

interface StepBusinessHoursProps {
    onNext: () => void;
    onBack: () => void;
    accentColor: string;
}

export const StepBusinessHours: React.FC<StepBusinessHoursProps> = ({ onNext, onBack, accentColor }) => {
    const { user, userType } = useAuth();
    const [loading, setLoading] = useState(false);
    const [businessHours, setBusinessHours] = useState<any>({
        mon: { isOpen: true, blocks: [{ start: '09:00', end: '18:00' }] },
        tue: { isOpen: true, blocks: [{ start: '09:00', end: '18:00' }] },
        wed: { isOpen: true, blocks: [{ start: '09:00', end: '18:00' }] },
        thu: { isOpen: true, blocks: [{ start: '09:00', end: '18:00' }] },
        fri: { isOpen: true, blocks: [{ start: '09:00', end: '18:00' }] },
        sat: { isOpen: true, blocks: [{ start: '09:00', end: '14:00' }] },
        sun: { isOpen: false, blocks: [] },
    });

    const handleSubmit = async () => {
        if (!user) return;
        setLoading(true);

        try {
            await supabase.from('business_settings').upsert({
                user_id: user.id,
                business_hours: businessHours
            });

            await supabase.rpc('update_onboarding_step', {
                p_user_id: user.id,
                p_step: 3
            });

            onNext();
        } catch (error) {
            console.error('Error saving hours:', error);
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
                    className={`flex-1 py-4 bg-${accentColor} text-black font-bold rounded-lg hover:bg-${accentColor}/90 transition-colors flex items-center justify-center gap-2`}
                >
                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Continuar'}
                </button>
            </div>
        </div>
    );
};
