import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface StepBusinessInfoProps {
    onNext: () => void;
    accentColor: string;
}

export const StepBusinessInfo: React.FC<StepBusinessInfoProps> = ({ onNext, accentColor }) => {
    const { user } = useAuth();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);

        try {
            await supabase.from('profiles').update({
                business_name: name,
                phone: phone
            }).eq('id', user.id);

            // Update step
            await supabase.rpc('update_onboarding_step', {
                p_user_id: user.id,
                p_step: 2
            });

            onNext();
        } catch (error) {
            console.error('Error saving info:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label className="text-white font-mono text-sm mb-2 block">Nome do Negócio</label>
                <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder={accentColor === 'beauty-neon' ? "Ex: Studio Beauty" : "Ex: Barbearia do Silva"}
                    className={`w-full p-4 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-${accentColor} text-lg`}
                    autoFocus
                />
            </div>

            <div>
                <label className="text-white font-mono text-sm mb-2 block">Telefone / WhatsApp</label>
                <input
                    type="tel"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className={`w-full p-4 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-${accentColor} text-lg`}
                />
            </div>

            <button
                type="submit"
                disabled={loading || !name || !phone}
                className={`w-full py-4 bg-${accentColor} text-black font-bold rounded-lg hover:bg-${accentColor}/90 transition-colors flex items-center justify-center gap-2 text-lg mt-8`}
            >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Continuar'}
            </button>
        </form>
    );
};
