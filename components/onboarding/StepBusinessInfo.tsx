import React, { useState, useEffect } from 'react';
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
                setPhone(profile.phone || '');
                // O nome completo do responsável não é estritamente necessário aqui, mas podemos usá-lo se o campo for para o nome do responsável.
                // Se o campo 'name' for o nome do negócio, o código atual está correto.
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
            // Atualiza o nome do negócio e telefone no perfil público
            await supabase.from('profiles').update({
                business_name: name,
                phone: phone
            }).eq('id', user.id);

            // Atualiza o user_metadata do auth para refletir as mudanças imediatamente no AuthContext
            await supabase.auth.updateUser({
                data: {
                    business_name: name,
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
                    className={accentColor === 'beauty-neon' ? 'w-full p-4 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-beauty-neon text-lg' : 'w-full p-4 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-accent-gold text-lg'}
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
                    className={accentColor === 'beauty-neon' ? 'w-full p-4 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-beauty-neon text-lg' : 'w-full p-4 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-accent-gold text-lg'}
                />
            </div>

            <button
                type="submit"
                disabled={submitting || !name || !phone}
                className={accentColor === 'beauty-neon' ? 'w-full py-4 bg-beauty-neon text-black font-bold rounded-lg hover:bg-beauty-neon/90 transition-colors flex items-center justify-center gap-2 text-lg mt-8' : 'w-full py-4 bg-accent-gold text-black font-bold rounded-lg hover:bg-accent-gold/90 transition-colors flex items-center justify-center gap-2 text-lg mt-8'}
            >
                {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Continuar'}
            </button>
        </form>
    );
};