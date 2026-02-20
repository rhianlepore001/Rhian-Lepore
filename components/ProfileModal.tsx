import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Settings, Upload, User as UserIcon } from 'lucide-react';

interface ProfileModalProps {
    onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ onClose }) => {
    const { user, businessName, fullName, userType, region, avatarUrl } = useAuth();
    const navigate = useNavigate();
    const [newBusinessName, setNewBusinessName] = useState(businessName);
    const [newFullName, setNewFullName] = useState(fullName);
    const [loading, setLoading] = useState(false);

    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(avatarUrl);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Theme
    const isBeauty = userType === 'beauty';
    const accentText = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setPhotoFile(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            let newPhotoUrl = photoPreview;

            if (photoFile && user) {
                const fileExt = photoFile.name.split('.').pop();
                const fileName = `${user.id}/${Date.now()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(fileName, photoFile, { upsert: true });

                if (uploadError) throw uploadError;

                const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
                newPhotoUrl = data.publicUrl;
            }

            const { error } = await supabase.auth.updateUser({
                data: {
                    business_name: newBusinessName,
                    full_name: newFullName,
                    avatar_url: newPhotoUrl,
                }
            });

            if (error) throw error;

            const { error: profileError } = await supabase
                .from('profiles')
                .update({
                    business_name: newBusinessName,
                    full_name: newFullName,
                    photo_url: newPhotoUrl
                })
                .eq('id', user?.id);

            if (profileError) console.error("Error updating public profile:", profileError);

            // Sync with team_members for the owner
            const { error: teamError } = await supabase
                .from('team_members')
                .update({
                    name: newFullName,
                    photo_url: newPhotoUrl
                })
                .eq('user_id', user?.id)
                .eq('is_owner', true); // Assuming the profile being edited belongs to the owner/admin

            if (teamError) console.error("Error syncing team member profile:", teamError);

            alert('Perfil atualizado com sucesso! Recarregue a página para ver as alterações.');
            onClose();
            window.location.reload();
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Erro ao atualizar perfil.');
        } finally {
            setLoading(false);
        }
    };

    // Unified Modal Styles
    const modalStyles = isBeauty
        ? 'bg-gradient-to-br from-beauty-card to-beauty-dark border border-beauty-neon/30 rounded-2xl shadow-neon'
        : 'bg-brutal-card border-4 border-brutal-border shadow-heavy-lg';

    return createPortal(
        <div className="fixed inset-0 bg-black/80 z-[100] md:left-64 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className={`w-full max-w-md p-6 relative transition-all ${modalStyles}`}>
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors"
                >
                    <span className="sr-only">Fechar</span>
                    X
                </button>
                <h3 className={`text-xl font-heading text-white mb-6 uppercase ${isBeauty ? 'tracking-normal' : 'tracking-wider'}`}>Meu Perfil</h3>

                <div className="flex justify-center mb-6">
                    <div
                        className={`relative w-24 h-24 rounded-full bg-neutral-800 border-2 border-dashed ${photoPreview ? 'border-transparent' : 'border-neutral-700'} flex items-center justify-center cursor-pointer hover:border-${accentText.replace('text-', '')} overflow-hidden group transition-colors`}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {photoPreview ? (
                            <img src={photoPreview} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <UserIcon className="w-8 h-8 text-neutral-500" />
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Upload className="w-6 h-6 text-white" />
                        </div>
                    </div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handlePhotoChange}
                    />
                </div>

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
                        className={`w-full py-3 font-bold uppercase tracking-wider mt-4 disabled:opacity-50 transition-all rounded-xl
                            ${isBeauty
                                ? 'bg-beauty-neon text-black hover:bg-beauty-neon/90 shadow-neon'
                                : 'bg-accent-gold hover:bg-accent-gold/90 text-black border-2 border-black shadow-heavy hover:shadow-heavy-lg'}
                        `}
                    >
                        {loading ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                </form>

                <div className="mt-4 pt-4 border-t border-neutral-800">
                    <button
                        type="button"
                        onClick={() => {
                            navigate('/configuracoes/geral');
                            onClose();
                        }}
                        className={`w-full flex items-center justify-center gap-2 text-center py-2 text-xs font-mono uppercase transition-colors
                            ${isBeauty ? 'text-beauty-neon/70 hover:text-beauty-neon' : 'text-accent-gold/70 hover:text-accent-gold'}
                        `}
                    >
                        <Settings className="w-3 h-3" />
                        Configurações Avançadas
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};