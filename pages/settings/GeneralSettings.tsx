import React, { useState, useEffect } from 'react';
import { SettingsLayout } from '../../components/SettingsLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { BusinessHoursEditor } from '../../components/BusinessHoursEditor';
import { BrandIdentitySection } from '../../components/BrandIdentitySection';
import { BusinessGalleryManager } from '../../components/BusinessGalleryManager';
import { SaveFooter } from '../../components/SaveFooter';
import { PhoneInput } from '../../components/PhoneInput';
import { BrutalCard } from '../../components/BrutalCard';
import { InfoButton } from '../../components/HelpButtons';

export const GeneralSettings: React.FC = () => {
    const { user, userType, region } = useAuth();
    const [businessName, setBusinessName] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [instagram, setInstagram] = useState('');

    // Image State
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [coverPreview, setCoverPreview] = useState<string | null>(null);

    const [cancellationPolicy, setCancellationPolicy] = useState('');
    const [policyTemplate, setPolicyTemplate] = useState('flexible');

    const [businessHours, setBusinessHours] = useState<any>({
        mon: { isOpen: true, blocks: [{ start: '09:00', end: '18:00' }] },
        tue: { isOpen: true, blocks: [{ start: '09:00', end: '18:00' }] },
        wed: { isOpen: true, blocks: [{ start: '09:00', end: '18:00' }] },
        thu: { isOpen: true, blocks: [{ start: '09:00', end: '18:00' }] },
        fri: { isOpen: true, blocks: [{ start: '09:00', end: '18:00' }] },
        sat: { isOpen: true, blocks: [{ start: '09:00', end: '14:00' }] },
        sun: { isOpen: false, blocks: [] },
    });

    const [loading, setLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [hasChanges, setHasChanges] = useState(false);

    const isBeauty = userType === 'beauty';
    const accentColor = isBeauty ? 'beauty-neon' : 'accent-gold';
    const currencySymbol = region === 'PT' ? '€' : 'R$';

    const policyTemplates: Record<string, string> = {
        flexible: 'Cancelamentos podem ser feitos com até 24h de antecedência sem custo. Cancelamentos com menos de 24h terão cobrança de 50% do valor.',
        moderate: 'Cancelamentos devem ser feitos com 48h de antecedência. Cancelamentos tardios terão cobrança integral.',
        strict: 'Cancelamentos com menos de 72h de antecedência não terão reembolso. Reagendamentos são permitidos uma vez.'
    };

    useEffect(() => {
        fetchSettings();
    }, [user]);

    useEffect(() => {
        if (!loading) {
            setHasChanges(true);
        }
    }, [businessName, phone, address, instagram, logoFile, coverFile, cancellationPolicy, businessHours]);

    const fetchSettings = async () => {
        if (!user) return;
        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('business_name, phone, address_street, instagram_handle, logo_url, cover_photo_url')
                .eq('id', user.id)
                .single();

            if (profile) {
                setBusinessName(profile.business_name || '');
                setPhone(profile.phone || '');
                setAddress(profile.address_street || '');
                setInstagram(profile.instagram_handle || '');
                setLogoPreview(profile.logo_url || null);
                setCoverPreview(profile.cover_photo_url || null);
            }

            const { data: settings } = await supabase
                .from('business_settings')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (settings) {
                setCancellationPolicy(settings.cancellation_policy || policyTemplates.flexible);
                if (settings.business_hours) setBusinessHours(settings.business_hours);
            }

            setHasChanges(false);
        } catch (error) {
            console.error('Error fetching settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogoChange = (file: File) => {
        if (file.size > 10 * 1024 * 1024) {
            alert('A imagem deve ter no máximo 10MB.');
            return;
        }
        setLogoFile(file);
        setLogoPreview(URL.createObjectURL(file));
    };

    const handleCoverChange = (file: File) => {
        if (file.size > 10 * 1024 * 1024) {
            alert('A imagem deve ter no máximo 10MB.');
            return;
        }
        setCoverFile(file);
        setCoverPreview(URL.createObjectURL(file));
    };

    const uploadFile = async (file: File, bucket: string, userId: string) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${Date.now()}.${fileExt}`;
        const { error } = await supabase.storage.from(bucket).upload(fileName, file);
        if (error) throw error;
        const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
        return data?.publicUrl;
    };

    const handleSave = async () => {
        if (!user) return;
        setSaveStatus('saving');

        try {
            let logoUrl = logoPreview;
            let coverUrl = coverPreview;

            if (logoFile) logoUrl = await uploadFile(logoFile, 'logos', user.id);
            if (coverFile) coverUrl = await uploadFile(coverFile, 'covers', user.id);

            const { error: profileError } = await supabase.from('profiles').update({
                business_name: businessName,
                phone,
                address_street: address,
                instagram_handle: instagram,
                logo_url: logoUrl,
                cover_photo_url: coverUrl,
            }).eq('id', user.id);

            if (profileError) throw profileError;

            const { error: settingsError } = await supabase.from('business_settings').upsert({
                user_id: user.id,
                cancellation_policy: cancellationPolicy,
                business_hours: businessHours,
            }, { onConflict: 'user_id' });

            if (settingsError) throw settingsError;

            const { error: authError } = await supabase.auth.updateUser({
                data: {
                    business_name: businessName,
                    phone: phone,
                }
            });

            if (authError) throw authError;

            setSaveStatus('saved');
            setHasChanges(false);

            setTimeout(() => {
                window.location.reload();
            }, 1000);

        } catch (error) {
            console.error('Error saving settings:', error);
            setSaveStatus('error');
        }
    };

    const handlePolicyTemplateChange = (type: string) => {
        setPolicyTemplate(type);
        setCancellationPolicy(policyTemplates[type]);
    };

    if (loading) {
        return (
            <SettingsLayout>
                <div className="text-white p-8">Carregando...</div>
            </SettingsLayout>
        );
    }

    return (
        <SettingsLayout>
            <div className="max-w-4xl pb-20 md:pb-0">
                {/* Header dinâmico no SettingsLayout */}

                <BrandIdentitySection
                    logoPreview={logoPreview}
                    coverPreview={coverPreview}
                    onLogoChange={handleLogoChange}
                    onCoverChange={handleCoverChange}
                    onLogoRemove={() => { setLogoFile(null); setLogoPreview(null); }}
                    onCoverRemove={() => { setCoverFile(null); setCoverPreview(null); }}
                    accentColor={accentColor}
                />

                <BusinessGalleryManager accentColor={accentColor} />

                <BrutalCard
                    title={
                        <div className="flex items-center gap-2">
                            <span>Informações do Negócio</span>
                            <InfoButton text="Dados básicos que aparecem no seu perfil público." />
                        </div>
                    }
                    className="mb-4 md:mb-6"
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        <div className="col-span-1 md:col-span-2">
                            <label className="text-white font-mono text-xs md:text-sm mb-2 block">
                                Nome do Negócio
                            </label>
                            <input
                                type="text"
                                value={businessName}
                                onChange={e => setBusinessName(e.target.value)}
                                placeholder="Barbearia Premium"
                                className={`w-full p-3 rounded-lg text-white outline-none transition-all
                                    ${isBeauty
                                        ? 'bg-white/5 border border-white/10 focus:border-beauty-neon placeholder-white/20'
                                        : 'bg-white/5 border border-white/10 focus:border-accent-gold'}
                                `}
                            />
                        </div>

                        <div>
                            <label className="text-white font-mono text-xs md:text-sm mb-2 block">
                                Telefone/WhatsApp
                            </label>
                            <PhoneInput
                                value={phone}
                                onChange={setPhone}
                                defaultRegion={region}
                                placeholder="Telefone"
                            />
                        </div>

                        <div>
                            <label className="text-white font-mono text-xs md:text-sm mb-2 block">
                                Instagram
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-3 text-neutral-500">@</span>
                                <input
                                    type="text"
                                    value={instagram}
                                    onChange={e => setInstagram(e.target.value)}
                                    placeholder="suabarbearia"
                                    className={`w-full p-3 pl-8 rounded-lg text-white outline-none transition-all
                                        ${isBeauty
                                            ? 'bg-white/5 border border-white/10 focus:border-beauty-neon placeholder-white/20'
                                            : 'bg-white/5 border border-white/10 focus:border-accent-gold'}
                                    `}
                                />
                            </div>
                        </div>

                        <div className="col-span-1 md:col-span-2">
                            <label className="text-white font-mono text-xs md:text-sm mb-2 block">
                                Endereço Completo
                            </label>
                            <input
                                type="text"
                                value={address}
                                onChange={e => setAddress(e.target.value)}
                                placeholder="Rua Exemplo, 123 - Bairro, Cidade - SP"
                                className={`w-full p-3 rounded-lg text-white outline-none transition-all
                                    ${isBeauty
                                        ? 'bg-white/5 border border-white/10 focus:border-beauty-neon placeholder-white/20'
                                        : 'bg-white/5 border border-white/10 focus:border-accent-gold'}
                                `}
                            />
                            <p className="text-neutral-500 text-xs mt-1">
                                Este endereço será usado para gerar o link do Google Maps para seus clientes.
                            </p>
                        </div>
                    </div>
                </BrutalCard>

                <BrutalCard
                    title="Horário de Funcionamento"
                    className="mb-4 md:mb-6"
                >
                    <BusinessHoursEditor
                        hours={businessHours}
                        onChange={setBusinessHours}
                        isBeauty={isBeauty}
                    />
                </BrutalCard>

                <BrutalCard
                    title="Política de Cancelamento"
                    className="mb-6 md:mb-8"
                >
                    <div className="flex flex-wrap gap-2 mb-4">
                        {[
                            { id: 'flexible', label: '😊 Flexível', desc: '24h' },
                            { id: 'moderate', label: '⚖️ Moderada', desc: '48h' },
                            { id: 'strict', label: '🔒 Rígida', desc: '72h' }
                        ].map(template => (
                            <button
                                key={template.id}
                                onClick={() => handlePolicyTemplateChange(template.id)}
                                className={`px-3 py-2 rounded-xl text-sm border transition-all active:animate-haptic-click ${policyTemplate === template.id
                                    ? isBeauty ? 'bg-beauty-neon/20 border-beauty-neon text-white shadow-neon' : `bg-${accentColor}/10 border-${accentColor} text-white shadow-gold`
                                    : isBeauty ? 'bg-white/5 border-white/10 text-neutral-400 hover:text-white' : 'bg-white/5 border-white/10 text-neutral-400 hover:bg-neutral-800'
                                    }`}
                            >
                                <span className="block font-bold">{template.label}</span>
                                <span className="text-xs opacity-70">{template.desc}</span>
                            </button>
                        ))}
                    </div>

                    <textarea
                        value={cancellationPolicy}
                        onChange={e => setCancellationPolicy(e.target.value)}
                        rows={4}
                        placeholder="Descreva sua política de cancelamento..."
                        className={`w-full p-4 rounded-xl text-white outline-none resize-none transition-all
                            ${isBeauty
                                ? 'bg-white/5 border border-white/10 focus:border-beauty-neon placeholder-white/20'
                                : 'bg-white/5 border border-white/10 focus:border-accent-gold'}
                        `}
                    />
                    <p className="text-neutral-500 text-[10px] mt-2 italic px-1">
                        💡 Você pode editar o texto acima para personalizar sua política.
                    </p>
                </BrutalCard>

                <SaveFooter
                    onSave={handleSave}
                    saveStatus={saveStatus}
                    hasChanges={hasChanges}
                    accentColor={accentColor}
                />
            </div>
        </SettingsLayout>
    );
};