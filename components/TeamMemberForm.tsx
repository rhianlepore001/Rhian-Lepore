import React, { useState, useRef } from 'react';
import { X, Upload, User, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

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
    const { user } = useAuth();
    const [name, setName] = useState(member?.name || '');
    const [role, setRole] = useState(member?.role || '');
    const [slug, setSlug] = useState(member?.slug || '');
    const [bio, setBio] = useState(member?.bio || '');
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);

        try {
            let photoUrl = member?.photo_url;

            if (photoFile) {
                const fileExt = photoFile.name.split('.').pop();
                const fileName = `${user.id}/${Date.now()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('team_photos')
                    .upload(fileName, photoFile);

                if (uploadError) throw uploadError;

                const { data } = supabase.storage.from('team_photos').getPublicUrl(fileName);
                photoUrl = data.publicUrl;
            }

            const data = {
                user_id: user.id,
                name,
                role,
                slug: slug || name.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                bio,
                active,
                photo_url: photoUrl
            };

            if (member?.id) {
                await supabase.from('team_members').update(data).eq('id', member.id);
            } else {
                await supabase.from('team_members').insert(data);
            }

            onSave();
            onClose();
        } catch (error) {
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

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Photo Upload */}
                    <div className="flex justify-center mb-6">
                        <div
                            className={`relative w-24 h-24 rounded-full bg-neutral-800 border-2 border-dashed ${photoPreview ? 'border-transparent' : 'border-neutral-700'} flex items-center justify-center cursor-pointer hover:border-${accentColor} overflow-hidden group transition-colors`}
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

                    <div>
                        <label className="text-white font-mono text-xs mb-1 block">Nome</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className={`w-full p-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-${accentColor}`}
                            placeholder={accentColor === 'beauty-neon' ? "Ex: Maria Souza" : "Ex: João Silva"}
                        />
                    </div>

                    <div>
                        <label className="text-white font-mono text-xs mb-1 block">Cargo</label>
                        <input
                            type="text"
                            required
                            value={role}
                            onChange={e => setRole(e.target.value)}
                            className={`w-full p-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-${accentColor}`}
                            placeholder={accentColor === 'beauty-neon' ? "Ex: Nail Designer" : "Ex: Barbeiro Master"}
                        />
                    </div>

                    <div>
                        <label className="text-white font-mono text-xs mb-1 block">Link Personalizado (Slug)</label>
                        <div className="flex items-center gap-2">
                            <span className="text-neutral-500 text-xs">.../pro/</span>
                            <input
                                type="text"
                                value={slug}
                                onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                                className={`flex-1 p-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-${accentColor}`}
                                placeholder="joao-silva"
                            />
                        </div>
                        <p className="text-neutral-500 text-[10px] mt-1">Deixe em branco para gerar automaticamente.</p>
                    </div>

                    <div>
                        <label className="text-white font-mono text-xs mb-1 block">Bio (Opcional)</label>
                        <textarea
                            value={bio}
                            onChange={e => setBio(e.target.value)}
                            rows={3}
                            className={`w-full p-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-${accentColor} resize-none`}
                            placeholder="Breve descrição..."
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="active"
                            checked={active}
                            onChange={e => setActive(e.target.checked)}
                            className={`rounded bg-neutral-800 border-neutral-700 text-${accentColor} focus:ring-0`}
                        />
                        <label htmlFor="active" className="text-white text-sm cursor-pointer">
                            Profissional Ativo
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3 bg-${accentColor} text-black font-bold rounded-lg hover:bg-${accentColor}/90 transition-colors flex items-center justify-center gap-2 mt-4`}
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar Profissional'}
                    </button>
                </form>
            </div>
        </div>
    );
};