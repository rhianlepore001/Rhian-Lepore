import React, { useState, useRef } from 'react';
import { X, Upload, User, Loader2, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { BrutalButton } from './BrutalButton';

interface TeamMemberFormProps {
    initialData?: any;
    onClose: () => void;
    onSave: () => void;
    accentColor: string;
    isOwnerForm?: boolean;
}

export const TeamMemberForm: React.FC<TeamMemberFormProps> = ({
    initialData,
    onClose,
    onSave,
    accentColor,
    isOwnerForm = false
}) => {
    const { user, fullName, avatarUrl, businessName } = useAuth();
    const [name, setName] = useState(initialData?.name || (isOwnerForm ? (fullName || businessName || '') : ''));
    const [role, setRole] = useState(initialData?.role || (isOwnerForm ? 'Dono / Profissional' : ''));
    const [slug, setSlug] = useState(initialData?.slug || '');
    const [bio, setBio] = useState(initialData?.bio || '');
    const [commissionRate, setCommissionRate] = useState<string | number>(initialData?.commission_rate?.toString() || (isOwnerForm ? '100' : '0'));
    const [isOwner, setIsOwner] = useState(initialData?.is_owner || (isOwnerForm ? true : false));
    const [active, setActive] = useState(initialData?.active ?? true);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(initialData?.photo_url || null);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];

            if (file.size > 10 * 1024 * 1024) { // 10MB limit
                alert('A imagem deve ter no máximo 10MB.');
                return;
            }

            setPhotoFile(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleFillWithOwner = () => {
        setName(fullName || businessName || '');
        setRole('Dono / Profissional');
        setPhotoPreview(avatarUrl || null);
        setCommissionRate('100');
        setIsOwner(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);

        try {
            let photoUrl = photoPreview;

            if (photoFile) {
                const fileExt = photoFile.name.split('.').pop();
                const fileName = `${user.id}/${Date.now()}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('team_photos')
                    .upload(fileName, photoFile, {
                        cacheControl: '3600',
                        upsert: true
                    });

                if (uploadError) {
                    console.error('Upload error:', uploadError);
                    throw new Error('Erro ao fazer upload da foto: ' + uploadError.message);
                }

                const { data } = supabase.storage.from('team_photos').getPublicUrl(fileName);
                if (data) {
                    photoUrl = data.publicUrl;
                }
            }

            const teamMemberData = {
                user_id: user.id,
                name: name.trim(),
                role: role.trim(),
                slug: slug.trim() || name.toLowerCase().trim().replace(/[^a-z0-9]/g, '-'),
                bio: bio.trim(),
                active,
                photo_url: photoUrl,
                commission_rate: commissionRate === '' ? 0 : Number(commissionRate),
                is_owner: isOwner
            };

            if (initialData?.id) {
                const { error: updateError } = await supabase
                    .from('team_members')
                    .update(teamMemberData)
                    .eq('id', initialData.id)
                    .eq('user_id', user.id);
                if (updateError) throw updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('team_members')
                    .insert(teamMemberData);
                if (insertError) throw insertError;
            }

            onSave();
            onClose();
        } catch (error: any) {
            console.error('Error saving team member:', error);
            alert(`Erro ao salvar membro da equipe: ${error.message || JSON.stringify(error)}`);
        } finally {
            setLoading(false);
        }
    };

    const isBeauty = accentColor === 'beauty-neon';

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${isBeauty ? 'bg-beauty-dark/80 backdrop-blur-sm' : 'bg-black/80'}`}>
            <div className={`w-full max-w-md overflow-hidden transition-all shadow-2xl
                ${isBeauty
                    ? 'bg-gradient-to-br from-beauty-card to-beauty-dark border border-beauty-neon/30 rounded-2xl shadow-[0_0_20px_rgba(167,139,250,0.15)]'
                    : 'bg-neutral-900 border-2 border-neutral-800 rounded-xl shadow-[8px_8px_0px_0px_#000000]'}
            `}>
                <div className={`flex items-center justify-between p-4 ${isBeauty ? 'border-b border-beauty-neon/20' : 'border-b border-neutral-800'}`}>
                    <h3 className={`font-bold text-lg ${isBeauty ? 'text-white font-sans' : 'text-white font-heading uppercase'}`}>
                        {initialData ? 'Editar Profissional' : 'Novo Profissional'}
                    </h3>
                    <button onClick={onClose} className={`transition-colors ${isBeauty ? 'text-beauty-neon/60 hover:text-beauty-neon' : 'text-neutral-400 hover:text-white'}`}>
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                    {!initialData && (
                        <button
                            type="button"
                            onClick={handleFillWithOwner}
                            className={`w-full py-2 px-4 mb-4 border border-dashed rounded-lg transition-all text-xs font-mono uppercase
                                ${isBeauty
                                    ? 'border-beauty-neon/50 text-beauty-neon hover:bg-beauty-neon/10'
                                    : 'border-accent-gold/50 text-accent-gold hover:bg-accent-gold/10'}
                            `}
                        >
                            ✨ Sou eu quem atendo (Usar meu perfil)
                        </button>
                    )}

                    {/* Photo Upload */}
                    <div className="flex justify-center mb-6">
                        <div
                            className={`relative w-24 h-24 rounded-full border-2 border-dashed ${photoPreview ? 'border-transparent' : 'border-neutral-700'} flex items-center justify-center cursor-pointer hover:border-current overflow-hidden group transition-colors 
                            ${isBeauty ? 'hover:text-beauty-neon bg-beauty-dark/50' : 'hover:text-accent-gold bg-neutral-800'}`}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {photoPreview ? (
                                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <User className="w-8 h-8 text-neutral-500" />
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

                    <div className="grid grid-cols-2 gap-4 items-center mb-2">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="isOwner"
                                checked={isOwner}
                                onChange={e => setIsOwner(e.target.checked)}
                                className={`rounded bg-neutral-800 border-neutral-700 text-current focus:ring-0 ${isBeauty ? 'text-beauty-neon' : 'text-accent-gold'}`}
                            />
                            <label htmlFor="isOwner" className={`text-xs cursor-pointer ${isBeauty ? 'text-beauty-neon/80 font-medium' : 'text-white font-mono uppercase'}`}>
                                É o Dono
                            </label>
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="active"
                                checked={active}
                                onChange={e => setActive(e.target.checked)}
                                className={`rounded bg-neutral-800 border-neutral-700 text-current focus:ring-0 ${isBeauty ? 'text-beauty-neon' : 'text-accent-gold'}`}
                            />
                            <label htmlFor="active" className={`text-xs cursor-pointer ${isBeauty ? 'text-beauty-neon/80 font-medium' : 'text-white font-mono uppercase'}`}>
                                Ativo
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className={`text-xs mb-1 block ${isBeauty ? 'text-beauty-neon/80 font-sans font-medium' : 'text-white font-mono'}`}>Nome</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className={`w-full p-3 rounded-lg text-white transition-all outline-none
                                ${isBeauty
                                    ? 'bg-beauty-dark/50 border border-beauty-neon/20 focus:border-beauty-neon placeholder-beauty-neon/30'
                                    : 'bg-neutral-800 border border-neutral-700 focus:border-accent-gold'}`}
                            placeholder={isBeauty ? "Ex: Maria Souza" : "Ex: João Silva"}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={`text-xs mb-1 block ${isBeauty ? 'text-beauty-neon/80 font-sans font-medium' : 'text-white font-mono'}`}>Cargo</label>
                            <input
                                type="text"
                                required
                                value={role}
                                onChange={e => setRole(e.target.value)}
                                className={`w-full p-3 rounded-lg text-white transition-all outline-none
                                    ${isBeauty
                                        ? 'bg-beauty-dark/50 border border-beauty-neon/20 focus:border-beauty-neon placeholder-beauty-neon/30'
                                        : 'bg-neutral-800 border border-neutral-700 focus:border-accent-gold'}`}
                                placeholder="Ex: Barbeiro"
                            />
                        </div>
                        <div>
                            <label className={`text-xs mb-1 block ${isBeauty ? 'text-beauty-neon/80 font-sans font-medium' : 'text-white font-mono'}`}>Comissão (%)</label>
                            <input
                                type="number"
                                required
                                min="0"
                                max="100"
                                value={commissionRate}
                                onChange={e => setCommissionRate(e.target.value)}
                                className={`w-full p-3 rounded-lg text-white transition-all outline-none
                                    ${isBeauty
                                        ? 'bg-beauty-dark/50 border border-beauty-neon/20 focus:border-beauty-neon placeholder-beauty-neon/30'
                                        : 'bg-neutral-800 border border-neutral-700 focus:border-accent-gold'}`}
                            />
                        </div>
                    </div>

                    <div>
                        <label className={`text-xs mb-1 block ${isBeauty ? 'text-beauty-neon/80 font-sans font-medium' : 'text-white font-mono'}`}>Link Personalizado (Slug)</label>
                        <div className="flex items-center gap-2">
                            <span className="text-neutral-500 text-xs">.../pro/</span>
                            <input
                                type="text"
                                value={slug}
                                onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                                className={`flex-1 p-3 rounded-lg text-white transition-all outline-none
                                    ${isBeauty
                                        ? 'bg-beauty-dark/50 border border-beauty-neon/20 focus:border-beauty-neon'
                                        : 'bg-neutral-800 border border-neutral-700 focus:border-accent-gold'}`}
                                placeholder="joao-silva"
                            />
                        </div>
                    </div>

                    <div>
                        <label className={`text-xs mb-1 block ${isBeauty ? 'text-beauty-neon/80 font-sans font-medium' : 'text-white font-mono'}`}>Bio (Opcional)</label>
                        <textarea
                            value={bio}
                            onChange={e => setBio(e.target.value)}
                            rows={3}
                            className={`w-full p-3 rounded-lg text-white transition-all outline-none resize-none
                                ${isBeauty
                                    ? 'bg-beauty-dark/50 border border-beauty-neon/20 focus:border-beauty-neon'
                                    : 'bg-neutral-800 border border-neutral-700 focus:border-accent-gold'}`}
                            placeholder="Breve descrição..."
                        />
                    </div>

                    <BrutalButton
                        type="submit"
                        disabled={loading}
                        variant="primary"
                        className="w-full mt-4"
                        icon={loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                    >
                        {loading ? 'Salvando...' : 'Salvar Profissional'}
                    </BrutalButton>
                </form>
            </div>
        </div>
    );
};