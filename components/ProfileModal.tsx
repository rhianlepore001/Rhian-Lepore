import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { BrutalButton } from './BrutalButton';

interface ProfileModalProps {
    onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ onClose }) => {
    const { user, businessName, fullName, userType, region } = useAuth();
    const [newBusinessName, setNewBusinessName] = useState(businessName);
    const [newFullName, setNewFullName] = useState(fullName);
    const [loading, setLoading] = useState(false);

    // Theme
    const isBeauty = userType === 'beauty';
    const accentText = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';
    const buttonClass = isBeauty ? 'bg-beauty-neon hover:bg-beauty-neonHover text-black' : 'bg-accent-gold hover:bg-accent-goldHover text-black';

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({
                data: {
                    business_name: newBusinessName,
                    full_name: newFullName,
                }
            });

            if (error) throw error;

            // Also update the public profiles table if it exists, but for now auth metadata is what we use in context
            // Ideally we should sync this with the 'profiles' table too.
            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    business_name: newBusinessName,
                    full_name: newFullName
                })
                .eq('id', user?.id);

            if (profileError) console.error("Error updating public profile:", profileError);

            alert('Perfil atualizado com sucesso! Recarregue a página para ver as alterações.');
            onClose();
            window.location.reload(); // Simple way to refresh context for now
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Erro ao atualizar perfil.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className={`w-full max-w-md p-6 relative transition-all
                ${isBeauty
                    ? 'bg-beauty-card/90 backdrop-blur-xl border border-white/10 shadow-soft rounded-2xl'
                    : 'bg-neutral-900 border-2 border-white/20 shadow-heavy'}
            `}>
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors"
                >
                    <span className="sr-only">Fechar</span>
                    X
                </button>
                <h3 className={`text-xl font-heading text-white mb-6 uppercase ${isBeauty ? 'tracking-normal' : 'tracking-wider'}`}>Meu Perfil</h3>

                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className={`block text-xs text-neutral-500 mb-1 ${isBeauty ? 'font-sans font-medium' : 'font-mono'}`}>Nome do Negócio</label>
                        <input
                            type="text"
                            value={newBusinessName}
                            onChange={(e) => setNewBusinessName(e.target.value)}
                            className={`w-full p-3 text-white outline-none transition-all
                                ${isBeauty
                                    ? 'bg-white/5 border border-white/10 rounded-xl focus:border-beauty-neon/50 focus:bg-white/10'
                                    : 'bg-black border border-neutral-700 focus:border-white'}
                            `}
                            placeholder="Ex: Studio Glow"
                            required
                        />
                    </div>

                    <div>
                        <label className={`block text-xs text-neutral-500 mb-1 ${isBeauty ? 'font-sans font-medium' : 'font-mono'}`}>Seu Nome Completo</label>
                        <input
                            type="text"
                            value={newFullName}
                            onChange={(e) => setNewFullName(e.target.value)}
                            className={`w-full p-3 text-white outline-none transition-all
                                ${isBeauty
                                    ? 'bg-white/5 border border-white/10 rounded-xl focus:border-beauty-neon/50 focus:bg-white/10'
                                    : 'bg-black border border-neutral-700 focus:border-white'}
                            `}
                            placeholder="Ex: Leticia Luiza"
                            required
                        />
                    </div>

                    <div className={`p-4 border rounded ${isBeauty ? 'bg-white/5 border-white/5 rounded-xl' : 'bg-black/50 border-neutral-800'}`}>
                        <p className={`text-xs text-neutral-500 mb-2 ${isBeauty ? 'font-sans' : 'font-mono'}`}>Informações da Conta</p>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm text-white">Tipo</span>
                            <span className={`text-xs font-bold uppercase ${accentText}`}>{userType}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-white">Região</span>
                            <span className="text-xs font-bold text-white">{region}</span>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3 font-bold uppercase tracking-wider mt-4 disabled:opacity-50 transition-all
                            ${isBeauty
                                ? 'bg-beauty-neon text-white hover:bg-beauty-neonHover rounded-xl shadow-soft'
                                : 'bg-accent-gold hover:bg-accent-goldHover text-black'}
                        `}
                    >
                        {loading ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                </form>
            </div>
        </div>
    );
};
