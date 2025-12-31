import React, { useState, useRef } from 'react';
import { X, Upload, User, Loader2, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { BrutalButton } from './BrutalButton';

interface TeamMemberFormProps {
    member?: any;
    onClose: () => void;
    onSave: () => void;
    accentColor: string;
}

export const TeamMemberForm: React.FC<TeamMemberFormProps> = ({
    member,
    onClose,
    onSave,
    accentColor
}) => {
    const { user, fullName, avatarUrl } = useAuth();
    const [name, setName] = useState(member?.name || '');
    const [role, setRole] = useState(member?.role || '');
    const [slug, setSlug] = useState(member?.slug || '');
    const [bio, setBio] = useState(member?.bio || '');
    const [commissionRate, setCommissionRate] = useState(member?.commission_rate || 0);
    const [isOwner, setIsOwner] = useState(member?.is_owner || false);
    const [active, setActive] = useState(member?.active ?? true);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(member?.photo_url || null);
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
        setName(fullName || '');
        setRole('Dono / Profissional');
        setPhotoPreview(avatarUrl || null);
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
                commission_rate: commissionRate,
                is_owner: isOwner
            };

            if (member?.id) {
                const { error: updateError } = await supabase
                    .from('team_members')
                    .update(teamMemberData)
                    .eq('id', member.id);
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

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
                <div className="flex items-center justify-between p-4 border-b border-neutral-800">
                    <h3 className="text-white font-bold text-lg">
                        {member ? 'Editar Profissional' : 'Novo Profissional'}
                    </h3>
                    <button onClick={onClose} className="text-neutral-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                    {!member && (
                        <button
                            type="button"
                            onClick={handleFillWithOwner}
                            className={`w-full py-2 px-4 mb-4 border border-dashed rounded-lg transition-all text-xs font-mono uppercase
                                ${accentColor === 'beauty-neon'
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
                            className={`relative w-24 h-24 rounded-full bg-neutral-800 border-2 border-dashed ${photoPreview ? 'border-transparent' : 'border-neutral-700'} flex items-center justify-center cursor-pointer hover:border-current overflow-hidden group transition-colors ${accentColor === 'beauty-neon' ? 'hover:text-beauty-neon' : 'hover:text-accent-gold'}`}
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
                                className={`rounded bg-neutral-800 border-neutral-700 text-current focus:ring-0 ${accentColor === 'beauty-neon' ? 'text-beauty-neon' : 'text-accent-gold'}`}
                            />
                            <label htmlFor="isOwner" className="text-white text-xs cursor-pointer font-mono uppercase">
                                É o Dono
                            </label>
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="active"
                                checked={active}
                                onChange={e => setActive(e.target.checked)}
                                className={`rounded bg-neutral-800 border-neutral-700 text-current focus:ring-0 ${accentColor === 'beauty-neon' ? 'text-beauty-neon' : 'text-accent-gold'}`}
                            />
                            <label htmlFor="active" className="text-white text-xs cursor-pointer font-mono uppercase">
                                Ativo
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className="text-white font-mono text-xs mb-1 block">Nome</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className={`w-full p-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-current ${accentColor === 'beauty-neon' ? 'focus:border-beauty-neon' : 'focus:border-accent-gold'}`}
                            placeholder={accentColor === 'beauty-neon' ? "Ex: Maria Souza" : "Ex: João Silva"}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-white font-mono text-xs mb-1 block">Cargo</label>
                            <input
                                type="text"
                                required
                                value={role}
                                onChange={e => setRole(e.target.value)}
                                className={`w-full p-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-current ${accentColor === 'beauty-neon' ? 'focus:border-beauty-neon' : 'focus:border-accent-gold'}`}
                                placeholder="Ex: Barbeiro"
                            />
                        </div>
                        <div>
                            <label className="text-white font-mono text-xs mb-1 block">Comissão (%)</label>
                            <input
                                type="number"
                                required
                                min="0"
                                max="100"
                                value={commissionRate}
                                onChange={e => setCommissionRate(Number(e.target.value))}
                                className={`w-full p-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-current ${accentColor === 'beauty-neon' ? 'focus:border-beauty-neon' : 'focus:border-accent-gold'}`}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-white font-mono text-xs mb-1 block">Link Personalizado (Slug)</label>
                        <div className="flex items-center gap-2">
                            <span className="text-neutral-500 text-xs">.../pro/</span>
                            <input
                                type="text"
                                value={slug}
                                onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                                className={`flex-1 p-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-current ${accentColor === 'beauty-neon' ? 'focus:border-beauty-neon' : 'focus:border-accent-gold'}`}
                                placeholder="joao-silva"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-white font-mono text-xs mb-1 block">Bio (Opcional)</label>
                        <textarea
                            value={bio}
                            onChange={e => setBio(e.target.value)}
                            rows={3}
                            className={`w-full p-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-current resize-none ${accentColor === 'beauty-neon' ? 'focus:border-beauty-neon' : 'focus:border-accent-gold'}`}
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