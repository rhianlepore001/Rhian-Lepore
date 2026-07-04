import React, { useState, useRef } from 'react';
import { Upload, User, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { useBrutalTheme, type ThemeVariant } from '../hooks/useBrutalTheme';

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
    const isBeauty = accentColor === 'beauty-neon';
    const { colors, accent, font } = useBrutalTheme({ override: isBeauty ? 'beauty' as ThemeVariant : 'barber' as ThemeVariant });

    const [name, setName] = useState(initialData?.name || (isOwnerForm ? (fullName || businessName || '') : ''));
    const [role, setRole] = useState(initialData?.role || (isOwnerForm ? 'Dono / Profissional' : ''));
    const [slug, setSlug] = useState(initialData?.slug || '');
    const [bio, setBio] = useState(initialData?.bio || '');
    const [commissionRate, setCommissionRate] = useState<string | number>(initialData?.commission_rate?.toString() || (isOwnerForm ? '100' : '0'));
    const [isOwner, setIsOwner] = useState(initialData?.is_owner || (isOwnerForm ? true : false));
    const [active, setActive] = useState(initialData?.active ?? true);
    const [specialties, setSpecialties] = useState(
        Array.isArray(initialData?.specialties)
            ? initialData.specialties.join(', ')
            : (initialData?.specialties || '')
    );
    const [cpf, setCpf] = useState(initialData?.cpf || '');
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(initialData?.photo_url || null);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];

            if (file.size > 10 * 1024 * 1024) {
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
                commission_rate: (isOwner || commissionRate === '') ? 0 : Number(commissionRate),
                is_owner: isOwner,
                specialties: specialties.split(',').map(s => s.trim()).filter(Boolean),
                cpf: cpf.trim() || null
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

            window.dispatchEvent(new CustomEvent('setup-step-completed', { detail: { stepId: 'team' } }));

            onSave();
            onClose();
        } catch (error: any) {
            console.error('Error saving team member:', error);
            alert(`Erro ao salvar membro da equipe: ${error.message || JSON.stringify(error)}`);
        } finally {
            setLoading(false);
        }
    };

    const inputClass = `w-full p-3 rounded-lg ${colors.text} transition-all outline-none ${colors.inputBg} ${colors.inputBorder} border focus:border-[var(--color-input-focus)]`;
    const labelClass = `text-xs mb-1 block ${colors.textSecondary} ${font.label}`;

    return (
        <Modal
            open
            onClose={onClose}
            title={initialData ? 'Editar Profissional' : 'Novo Profissional'}
            size="md"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {!initialData && (
                    <button
                        type="button"
                        onClick={handleFillWithOwner}
                        className={`w-full py-2 px-4 mb-4 border border-dashed rounded-lg transition-all text-xs ${font.mono} uppercase ${accent.borderDim} ${accent.text} hover:bg-[var(--color-accent-dim)]`}
                    >
                        Sou eu quem atende (Usar meu perfil)
                    </button>
                )}

                <div className="flex justify-center mb-6">
                    <div
                        className={`relative w-24 h-24 rounded-full border-2 border-dashed ${photoPreview ? 'border-transparent' : colors.border} flex items-center justify-center cursor-pointer hover:border-current overflow-hidden group transition-colors ${accent.text} ${colors.surface}`}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        {photoPreview ? (
                            <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                            <User className={`w-8 h-8 ${colors.textMuted}`} />
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
                            className={`rounded ${colors.inputBg} ${colors.inputBorder} border focus:ring-0 ${accent.text}`}
                        />
                        <label htmlFor="isOwner" className={`text-xs cursor-pointer ${colors.text} ${font.label}`}>
                            É o Dono
                        </label>
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="active"
                            checked={active}
                            onChange={e => setActive(e.target.checked)}
                            className={`rounded ${colors.inputBg} ${colors.inputBorder} border focus:ring-0 ${accent.text}`}
                        />
                        <label htmlFor="active" className={`text-xs cursor-pointer ${colors.text} ${font.label}`}>
                            Ativo
                        </label>
                    </div>
                </div>

                <div>
                    <label className={labelClass}>Nome</label>
                    <input
                        type="text"
                        required
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className={inputClass}
                        placeholder="Ex: João Silva"
                    />
                </div>

                <div className={`grid ${isOwner ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
                    <div>
                        <label className={labelClass}>Cargo</label>
                        <input
                            type="text"
                            required
                            value={role}
                            onChange={e => setRole(e.target.value)}
                            className={inputClass}
                            placeholder="Ex: Barbeiro"
                        />
                    </div>

                    {!isOwner && (
                        <div>
                            <label className={labelClass}>Comissão (%)</label>
                            <input
                                type="number"
                                required
                                min="0"
                                max="100"
                                value={commissionRate}
                                onChange={e => setCommissionRate(e.target.value)}
                                className={inputClass}
                            />
                        </div>
                    )}
                </div>

                <div>
                    <label className={labelClass}>Link Personalizado (Slug)</label>
                    <div className="flex items-center gap-2">
                        <span className={`${colors.textMuted} text-xs`}>.../pro/</span>
                        <input
                            type="text"
                            value={slug}
                            onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                            className={`flex-1 ${inputClass}`}
                            placeholder="joao-silva"
                        />
                    </div>
                </div>

                <div>
                    <label className={labelClass}>CPF (Opcional)</label>
                    <input
                        type="text"
                        value={cpf}
                        onChange={e => setCpf(e.target.value)}
                        className={inputClass}
                        placeholder="000.000.000-00"
                        maxLength={14}
                    />
                </div>

                <div>
                    <label className={labelClass}>Bio (Opcional)</label>
                    <textarea
                        value={bio}
                        onChange={e => setBio(e.target.value)}
                        rows={3}
                        className={`${inputClass} resize-none`}
                        placeholder="Breve descrição..."
                    />
                </div>

                <div>
                    <label className={labelClass}>Especialidades (Separadas por vírgula)</label>
                    <input
                        type="text"
                        value={specialties}
                        onChange={e => setSpecialties(e.target.value)}
                        className={inputClass}
                        placeholder="Ex: Corte, Barba, Coloração"
                    />
                </div>

                <Button
                    type="submit"
                    disabled={loading}
                    variant="primary"
                    fullWidth
                    className="mt-4"
                    loading={loading}
                    icon={!loading ? <Check className="w-5 h-5" /> : undefined}
                >
                    {loading ? 'Salvando...' : 'Salvar Profissional'}
                </Button>
            </form>
        </Modal>
    );
};
