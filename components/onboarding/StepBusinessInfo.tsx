import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { PhoneInput } from '../PhoneInput';

interface StepBusinessInfoProps {
    onNext: () => void;
    accentColor: string;
}

export const StepBusinessInfo: React.FC<StepBusinessInfoProps> = ({ onNext, accentColor }) => {
    const { user } = useAuth();
    const [name, setName] = useState('');
    const [fullName, setFullName] = useState(''); // NEW
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const loadInitialData = async () => {
            if (!user) return;

            // Tenta carregar dados do perfil público (que são populados pelo trigger de signup)
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('full_name, business_name, phone')
                .eq('id', user.id)
                .single();

            if (profile) {
                setName(profile.business_name || '');
                setFullName(profile.full_name || ''); // NEW
                setPhone(profile.phone || '');
            } else if (error && error.code !== 'PGRST116') {
                console.error('Error loading profile data:', error);
            }

            setLoading(false);
        };
        loadInitialData();
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setSubmitting(true);

        try {
            // Atualiza o nome do negócio, nome completo e telefone no perfil público
            await supabase.from('profiles').update({
                business_name: name,
                full_name: fullName, // NEW
                phone: phone
            }).eq('id', user.id);

            // Atualiza o user_metadata do auth para refletir as mudanças imediatamente no AuthContext
            await supabase.auth.updateUser({
                data: {
                    business_name: name,
                    full_name: fullName, // NEW
                    phone: phone,
                }
            });

            // Update step
            await supabase.rpc('update_onboarding_step', {
                p_user_id: user.id,
                p_step: 2
            });

            onNext();
        } catch (error) {
            console.error('Error saving info:', error);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div className="text-center py-8 text-neutral-500">Carregando dados iniciais...</div>;
    }

    const isBeauty = accentColor === 'beauty-neon';

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label className="text-white font-mono text-sm mb-2 block">Nome do Negócio</label>
                <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder={isBeauty ? "Ex: Studio Beauty" : "Ex: Barbearia do Silva"}
                    className={`w-full p-4 bg-neutral-800 border border-neutral-700 text-white focus:outline-none text-lg transition-all
                        ${isBeauty ? 'rounded-xl focus:border-beauty-neon focus:shadow-[0_0_10px_rgba(167,139,250,0.2)]' : 'rounded-lg focus:border-accent-gold'}`}
                    autoFocus
                />
            </div>

            <div>
                <label className="text-white font-mono text-sm mb-2 block">Seu Nome Completo (Dono)</label>
                <input
                    type="text"
                    required
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Ex: João Silva"
                    className={`w-full p-4 bg-neutral-800 border border-neutral-700 text-white focus:outline-none text-lg transition-all
                        ${isBeauty ? 'rounded-xl focus:border-beauty-neon focus:shadow-[0_0_10px_rgba(167,139,250,0.2)]' : 'rounded-lg focus:border-accent-gold'}`}
                />
            </div>

            <div>
                <label className="text-white font-mono text-sm mb-2 block">Telefone / WhatsApp</label>
                <PhoneInput
                    value={phone}
                    onChange={setPhone}
                    placeholder="Telefone"
                    forceTheme={isBeauty ? 'beauty' : 'barber'}
                />
            </div>

            <button
                type="submit"
                disabled={submitting || !name || !phone}
                className={`w-full py-4 text-black font-bold transition-all flex items-center justify-center gap-2 text-lg mt-8
                    ${isBeauty
                        ? 'bg-beauty-neon rounded-xl hover:bg-beauty-neon/90 shadow-neon hover:shadow-neonStrong'
                        : 'bg-accent-gold rounded-lg hover:bg-accent-gold/90 shadow-heavy active:shadow-none active:translate-y-1'}`}
            >
                {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Continuar'}
            </button>
        </form>
    );
};