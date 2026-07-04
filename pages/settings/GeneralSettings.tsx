import React, { useState } from 'react';
import { SettingsLayout } from '../../components/SettingsLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import { useBusinessSettings, useUpdateBusinessSettings } from '../../hooks/useSettings';
import { useProfileFields, useUpdateProfileFields } from '../../hooks/useSettings';
import { BusinessHoursEditor } from '../../components/BusinessHoursEditor';
import { BrandIdentitySection } from '../../components/BrandIdentitySection';
import { BusinessGalleryManager } from '../../components/BusinessGalleryManager';
import { SaveFooter } from '../../components/SaveFooter';
import { PhoneInput } from '../../components/PhoneInput';
import { SettingsSection } from '../../components/SettingsSection';
import { InfoButton } from '../../components/HelpButtons';

export const GeneralSettings: React.FC = () => {
    const { user, companyId, region } = useAuth();
    const { showToast } = useToast();
    const { accent, colors, classes, isBeauty } = useBrutalTheme();
    const { data: settings } = useBusinessSettings();
    const { data: profile } = useProfileFields();
    const updateSettingsMutation = useUpdateBusinessSettings();
    const updateProfileMutation = useUpdateProfileFields();
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [coverPreview, setCoverPreview] = useState<string | null>(null);

    const [cancellationPolicy, setCancellationPolicy] = useState('');
    const [policyTemplate, setPolicyTemplate] = useState('flexible');

    const [businessHours, setBusinessHours] = useState<Record<string, { isOpen: boolean; blocks: { start: string; end: string }[] }>>({
        mon: { isOpen: true, blocks: [{ start: '09:00', end: '18:00' }] },
        tue: { isOpen: true, blocks: [{ start: '09:00', end: '18:00' }] },
        wed: { isOpen: true, blocks: [{ start: '09:00', end: '18:00' }] },
        thu: { isOpen: true, blocks: [{ start: '09:00', end: '18:00' }] },
        fri: { isOpen: true, blocks: [{ start: '09:00', end: '18:00' }] },
        sat: { isOpen: true, blocks: [{ start: '09:00', end: '14:00' }] },
        sun: { isOpen: false, blocks: [] },
    });

    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [hasChanges, setHasChanges] = useState(false);

    const [businessName, setBusinessName] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [instagram, setInstagram] = useState('');
    const [dailyGoal, setDailyGoal] = useState('');

    const policyTemplates: Record<string, string> = {
        flexible: 'Cancelamentos podem ser feitos com até 24h de antecedência sem custo. Cancelamentos com menos de 24h terão cobrança de 50% do valor.',
        moderate: 'Cancelamentos devem ser feitos com 48h de antecedência. Cancelamentos tardios terão cobrança integral.',
        strict: 'Cancelamentos com menos de 72h de antecedência não terão reembolso. Reagendamentos são permitidos uma vez.'
    };

    const loading = !settings && !profile;

    const initialValuesRef = React.useRef<{
        businessName: string;
        phone: string;
        address: string;
        instagram: string;
        dailyGoal: string;
        cancellationPolicy: string;
        businessHours: typeof businessHours;
    } | null>(null);

    React.useEffect(() => {
        if (profile) {
            setBusinessName(profile.business_name ?? '');
            setPhone(profile.phone ?? '');
            setAddress(profile.address_street ?? '');
            setInstagram(profile.instagram_handle ?? '');
            setLogoPreview(profile.logo_url ?? null);
            setCoverPreview(profile.cover_photo_url ?? null);
            setDailyGoal(profile.daily_goal != null ? String(profile.daily_goal) : '');
        }
    }, [profile]);

    React.useEffect(() => {
        if (settings) {
            setCancellationPolicy(settings.cancellation_policy ?? policyTemplates.flexible);
            if (settings.business_hours) setBusinessHours(settings.business_hours as any);
        }
    }, [settings]);

    React.useEffect(() => {
        if (loading) return;
        if (!initialValuesRef.current) {
            initialValuesRef.current = {
                businessName,
                phone,
                address,
                instagram,
                dailyGoal,
                cancellationPolicy,
                businessHours,
            };
            return;
        }
        const initial = initialValuesRef.current;
        const dirty =
            businessName !== initial.businessName ||
            phone !== initial.phone ||
            address !== initial.address ||
            instagram !== initial.instagram ||
            dailyGoal !== initial.dailyGoal ||
            cancellationPolicy !== initial.cancellationPolicy ||
            JSON.stringify(businessHours) !== JSON.stringify(initial.businessHours) ||
            logoFile !== null ||
            coverFile !== null;
        setHasChanges(dirty);
    }, [businessName, phone, address, instagram, dailyGoal, logoFile, coverFile, cancellationPolicy, businessHours, loading]);

    const handleLogoChange = (file: File) => {
        if (file.size > 10 * 1024 * 1024) {
            showToast('A imagem deve ter no máximo 10MB.', 'error');
            return;
        }
        setLogoFile(file);
        setLogoPreview(URL.createObjectURL(file));
    };

    const handleCoverChange = (file: File) => {
        if (file.size > 10 * 1024 * 1024) {
            showToast('A imagem deve ter no máximo 10MB.', 'error');
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

            await updateProfileMutation.mutateAsync({
                business_name: businessName,
                phone,
                address_street: address,
                instagram_handle: instagram,
                logo_url: logoUrl,
                cover_photo_url: coverUrl,
                daily_goal: dailyGoal.trim() === '' ? null : Number(dailyGoal),
            } as any);

            await updateSettingsMutation.mutateAsync({
                cancellation_policy: cancellationPolicy,
                business_hours: businessHours as any,
            });

            const { error: authError } = await supabase.auth.updateUser({
                data: {
                    business_name: businessName,
                    phone: phone,
                }
            });

            if (authError) throw authError;

            setSaveStatus('saved');
            setHasChanges(false);

            window.dispatchEvent(new CustomEvent('setup-step-completed', { detail: { stepId: 'hours' } }));
            window.dispatchEvent(new CustomEvent('setup-step-completed', { detail: { stepId: 'profile' } }));

        } catch (error) {
            console.error('Error saving settings:', error);
            setSaveStatus('error');
            showToast('Não foi possível salvar as configurações. Tente novamente.', 'error');
        }
    };

    const handlePolicyTemplateChange = (type: string) => {
        setPolicyTemplate(type);
        setCancellationPolicy(policyTemplates[type]);
    };

    if (loading) {
        return (
            <SettingsLayout>
                <div className={`${colors.textSecondary} p-8`}>Carregando...</div>
            </SettingsLayout>
        );
    }

    return (
        <SettingsLayout>
            <div className="max-w-4xl pb-20 md:pb-0">
                <SettingsSection
                    title="Identidade Visual"
                    description="Logo e capa que aparecem na sua página pública de agendamento."
                >
                    <BrandIdentitySection
                        logoPreview={logoPreview}
                        coverPreview={coverPreview}
                        onLogoChange={handleLogoChange}
                        onCoverChange={handleCoverChange}
                        onLogoRemove={() => { setLogoFile(null); setLogoPreview(null); }}
                        onCoverRemove={() => { setCoverFile(null); setCoverPreview(null); }}
                    />
                </SettingsSection>

                <BusinessGalleryManager accentColor={isBeauty ? 'beauty-neon' : 'accent-gold'} />

                <SettingsSection
                    title={
                        <div className="flex items-center gap-2">
                            <span>Informações do Negócio</span>
                            <InfoButton text="Dados básicos que aparecem no seu perfil público." />
                        </div>
                    }
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        <div className="col-span-1 md:col-span-2">
                            <label className={classes.label}>
                                Nome do Negócio
                            </label>
                            <input
                                type="text"
                                value={businessName}
                                onChange={e => setBusinessName(e.target.value)}
                                placeholder="Barbearia Premium"
                                className={classes.input}
                            />
                        </div>

                        <div>
                            <label className={classes.label}>
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
                            <label className={classes.label}>
                                Instagram
                            </label>
                            <div className="relative">
                                <span className={`absolute left-3 top-1/2 -translate-y-1/2 ${colors.textMuted}`}>@</span>
                                <input
                                    type="text"
                                    value={instagram}
                                    onChange={e => setInstagram(e.target.value)}
                                    placeholder="suabarbearia"
                                    className={`${classes.input} pl-8`}
                                />
                            </div>
                        </div>

                        <div className="col-span-1 md:col-span-2">
                            <label className={classes.label}>
                                Endereço Completo
                            </label>
                            <input
                                type="text"
                                value={address}
                                onChange={e => setAddress(e.target.value)}
                                placeholder="Rua Exemplo, 123 - Bairro, Cidade - SP"
                                className={classes.input}
                            />
                            <p className={`${colors.textMuted} text-xs mt-1`}>
                                Este endereço será usado para gerar o link do Google Maps para seus clientes.
                            </p>
                        </div>
                    </div>
                </SettingsSection>

                <SettingsSection
                    title={
                        <div className="flex items-center gap-2">
                            <span>Meta do dia</span>
                            <InfoButton text="Valor de faturamento que você quer alcançar por dia. Aparece no seu painel para acompanhar o ritmo ao longo do dia." />
                        </div>
                    }
                >
                    <div className="max-w-xs">
                        <label className={classes.label}>
                            Meta de faturamento diária
                        </label>
                        <div className="relative">
                            <span className={`absolute left-3 top-1/2 -translate-y-1/2 ${colors.textMuted}`}>
                                {region === 'PT' ? '€' : 'R$'}
                            </span>
                            <input
                                type="number"
                                inputMode="decimal"
                                min="0"
                                step="10"
                                value={dailyGoal}
                                onChange={e => setDailyGoal(e.target.value)}
                                placeholder="500"
                                className={`${classes.input} pl-10`}
                            />
                        </div>
                        <p className={`${colors.textMuted} text-xs mt-1`}>
                            Deixe em branco para não exibir a meta do dia no painel.
                        </p>
                    </div>
                </SettingsSection>

                <SettingsSection title="Horário de Funcionamento">
                    <BusinessHoursEditor
                        hours={businessHours}
                        onChange={setBusinessHours}
                    />
                </SettingsSection>

                <SettingsSection title="Política de Cancelamento">
                    <div className="flex flex-wrap gap-2 mb-4">
                        {[
                            { id: 'flexible', label: 'Flexível', desc: '24h' },
                            { id: 'moderate', label: 'Moderada', desc: '48h' },
                            { id: 'strict', label: 'Rígida', desc: '72h' }
                        ].map(template => (
                            <button
                                key={template.id}
                                onClick={() => handlePolicyTemplateChange(template.id)}
                                className={`
                                    px-3 py-2 rounded-xl text-sm border transition-all active:scale-[0.97]
                                    ${policyTemplate === template.id
                                        ? `${accent.bgDim} ${accent.borderDim} ${accent.text} ${accent.shadow}`
                                        : `${colors.inputBg} ${colors.border} ${colors.textMuted} hover:${colors.textSecondary} hover:bg-white/[0.06]`
                                    }
                                `}
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
                        className={classes.input}
                    />
                    <p className={`${colors.textMuted} text-[10px] mt-2 italic px-1`}>
                        Você pode editar o texto acima para personalizar sua política.
                    </p>
                </SettingsSection>

                <SaveFooter
                    onSave={handleSave}
                    saveStatus={saveStatus}
                    hasChanges={hasChanges}
                />
            </div>
        </SettingsLayout>
    );
};
