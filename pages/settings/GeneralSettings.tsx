import React, { useState } from 'react';
import { SettingsLayout } from '../../components/SettingsLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import { useBusinessCopy } from '../../hooks/useBusinessCopy';
import { useBusinessSettings, useUpdateBusinessSettings, useUpdateBusinessTimezone } from '../../hooks/useSettings';
import { useProfileFields, useUpdateProfileFields } from '../../hooks/useSettings';
import { BusinessHoursEditor } from '../../components/BusinessHoursEditor';
import { BrandIdentitySection } from '../../components/BrandIdentitySection';
import { BusinessGalleryManager } from '../../components/BusinessGalleryManager';
import { SaveFooter } from '../../components/SaveFooter';
import { PhoneInput } from '../../components/PhoneInput';
import { SettingsSection } from '../../components/SettingsSection';
import { InfoButton } from '../../components/HelpButtons';
import { getCurrencySymbol, normalizeRegion, type Region } from '../../utils/formatters';
import {
    TIMEZONE_OPTIONS,
    defaultTimezoneForRegion,
    formatTimeInTimeZone,
    getTimeZoneOffsetMinutes,
    resolveBusinessTimezone,
    isSelectableTimeZone,
} from '../../utils/businessTimezone';
import {
    CANCELLATION_POLICY_NOTES_HINT,
    MAX_CLIENT_CANCEL_POLICY_TEXT_LENGTH,
    cancellationPolicyNotesForDisplay,
    generatedCancellationPolicyText,
    normalizeCustomCancellationPolicyText,
} from '../../utils/cancellationPolicyCopy';
import {
    DEFAULT_CLIENT_CANCEL_CUTOFF_HOURS,
    CLIENT_CANCEL_CUTOFF_PRESETS,
    cancelCutoffPresetLabel,
    clampClientCancelCutoffHours,
    MAX_CLIENT_CANCEL_NOTE_LENGTH,
} from '../../utils/clientCancelCutoff';

export const GeneralSettings: React.FC = () => {
    const { user, companyId, region, updateRegion } = useAuth();
    const { showToast } = useToast();
    const { accent, colors, classes, isBeauty } = useBrutalTheme();
    const copy = useBusinessCopy();
    const { data: settings } = useBusinessSettings();
    const { data: profile } = useProfileFields();
    const updateSettingsMutation = useUpdateBusinessSettings();
    const updateProfileMutation = useUpdateProfileFields();
    const updateTimezoneMutation = useUpdateBusinessTimezone();
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [coverPreview, setCoverPreview] = useState<string | null>(null);

    const [cancellationPolicy, setCancellationPolicy] = useState('');
    const [cancelCutoffHours, setCancelCutoffHours] = useState(DEFAULT_CLIENT_CANCEL_CUTOFF_HOURS);
    const [cancelPolicyText, setCancelPolicyText] = useState<string | null>(null);

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
    const [selectedRegion, setSelectedRegion] = useState<Region>(normalizeRegion(region));
    // null = sem escolha nesta sessão (mostra o salvo ou o padrão da região).
    const [timezoneOverride, setTimezoneOverride] = useState<string | null>(null);
    // A coluna business_settings.timezone só existe após a migration
    // 20260925120000. Sem ela a chave não vem no row: mostramos o padrão da
    // região e desabilitamos a troca manual (nada quebra).
    const timezoneColumnMissing = !!settings && !Object.prototype.hasOwnProperty.call(settings, 'timezone');
    const storedTimezone = settings?.timezone ?? null;
    const selectedTimezone = timezoneOverride ?? resolveBusinessTimezone({ timezone: storedTimezone, region: selectedRegion });
    const savedTimezone = resolveBusinessTimezone({ timezone: storedTimezone, region: profile?.region ?? region });
    const timezoneDirty = timezoneOverride !== null && timezoneOverride !== savedTimezone;

    const loading = !settings && !profile;

    const initialValuesRef = React.useRef<{
        businessName: string;
        phone: string;
        address: string;
        instagram: string;
        dailyGoal: string;
        cancellationPolicy: string;
        cancelCutoffHours: number;
        cancelPolicyText: string | null;
        businessHours: typeof businessHours;
        selectedRegion: Region;
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
            setSelectedRegion(normalizeRegion(profile.region ?? region));
        }
    }, [profile]);

    React.useEffect(() => {
        if (settings) {
            setCancelCutoffHours(clampClientCancelCutoffHours(settings.client_cancel_cutoff_hours ?? DEFAULT_CLIENT_CANCEL_CUTOFF_HOURS));
            setCancelPolicyText(normalizeCustomCancellationPolicyText(settings.client_cancel_policy_text));
            setCancellationPolicy(cancellationPolicyNotesForDisplay(
                settings.client_cancel_note,
                settings.cancellation_policy,
            ));
            if (settings.business_hours) setBusinessHours(settings.business_hours as any);
        }
    }, [settings]);

    // Trocar a região leva o fuso para o padrão dela se o atual for de outro país.
    const handleRegionChange = (next: Region) => {
        setSelectedRegion(next);
        const current = TIMEZONE_OPTIONS.find((o) => o.value === selectedTimezone);
        if (!current || current.region !== next) {
            setTimezoneOverride(defaultTimezoneForRegion(next));
        }
    };

    const deviceTimezone = React.useMemo(() => {
        try {
            return Intl.DateTimeFormat().resolvedOptions().timeZone;
        } catch {
            return '';
        }
    }, []);
    const deviceDiffersFromBusiness = !!deviceTimezone
        && getTimeZoneOffsetMinutes(Date.now(), deviceTimezone) !== getTimeZoneOffsetMinutes(Date.now(), selectedTimezone);
    const timezoneChoices = TIMEZONE_OPTIONS.some((o) => o.value === selectedTimezone)
        ? TIMEZONE_OPTIONS
        : [...TIMEZONE_OPTIONS, { value: selectedTimezone, label: selectedTimezone, region: selectedRegion }];

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
                cancelCutoffHours,
                cancelPolicyText,
                businessHours,
                selectedRegion,
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
            cancelCutoffHours !== initial.cancelCutoffHours ||
            cancelPolicyText !== initial.cancelPolicyText ||
            JSON.stringify(businessHours) !== JSON.stringify(initial.businessHours) ||
            selectedRegion !== initial.selectedRegion ||
            timezoneDirty ||
            logoFile !== null ||
            coverFile !== null;
        setHasChanges(dirty);
    }, [businessName, phone, address, instagram, dailyGoal, logoFile, coverFile, cancellationPolicy, cancelCutoffHours, cancelPolicyText, businessHours, selectedRegion, timezoneDirty, loading]);

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
                region: selectedRegion,
            } as any);

            if (companyId) {
                await supabase
                    .from('profiles')
                    .update({ region: selectedRegion })
                    .eq('company_id', companyId);
            }
            updateRegion(selectedRegion);

            await updateSettingsMutation.mutateAsync({
                client_cancel_note: cancellationPolicy.trim() === ''
                    ? ''
                    : cancellationPolicy.trim().slice(0, MAX_CLIENT_CANCEL_NOTE_LENGTH),
                business_hours: businessHours as any,
                client_cancel_cutoff_hours: cancelCutoffHours,
                client_cancel_policy_text: normalizeCustomCancellationPolicyText(cancelPolicyText),
            });

            // Fuso: salvo à parte para tolerar a coluna ainda inexistente.
            // Se nunca foi escolhido e bate com o padrão da região, não grava
            // (continua acompanhando a região).
            const timezoneChanged = storedTimezone
                ? selectedTimezone !== storedTimezone
                : selectedTimezone !== defaultTimezoneForRegion(selectedRegion);
            if (!timezoneColumnMissing && timezoneChanged && !isSelectableTimeZone(selectedTimezone)) {
                showToast('Fuso horário inválido; escolha um da lista.', 'error');
            } else if (!timezoneColumnMissing && timezoneChanged) {
                const tzResult = await updateTimezoneMutation.mutateAsync(selectedTimezone);
                if (tzResult === 'unsupported') {
                    showToast('Fuso horário ainda não pode ser alterado; usando o padrão da região.', 'info');
                }
            }

            const { error: authError } = await supabase.auth.updateUser({
                data: {
                    business_name: businessName,
                    phone: phone,
                }
            });

            if (authError) throw authError;

            setCancelPolicyText(normalizeCustomCancellationPolicyText(cancelPolicyText));
            setSaveStatus('saved');
            setHasChanges(false);
            initialValuesRef.current = {
                businessName,
                phone,
                address,
                instagram,
                dailyGoal,
                cancellationPolicy,
                cancelCutoffHours,
                cancelPolicyText: normalizeCustomCancellationPolicyText(cancelPolicyText),
                businessHours,
                selectedRegion,
            };

            window.dispatchEvent(new CustomEvent('setup-step-completed', { detail: { stepId: 'hours' } }));
            window.dispatchEvent(new CustomEvent('setup-step-completed', { detail: { stepId: 'profile' } }));

        } catch (error) {
            console.error('Error saving settings:', error);
            setSaveStatus('error');
            showToast('Não foi possível salvar as configurações. Tente novamente.', 'error');
        }
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
            <div className="w-full pb-20 md:pb-0 space-y-6">
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
                                placeholder={copy.businessNamePlaceholder}
                                className={classes.input}
                            />
                        </div>

                        <div className="col-span-1 md:col-span-2">
                            <label className={classes.label}>Região e moeda</label>
                            <div className="flex gap-2">
                                {([
                                    { id: 'BR' as const, label: 'Brasil · R$' },
                                    { id: 'PT' as const, label: 'Portugal · €' },
                                ]).map((opt) => (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        aria-pressed={selectedRegion === opt.id}
                                        onClick={() => handleRegionChange(opt.id)}
                                        className={`flex-1 py-3 min-h-[44px] text-xs font-semibold rounded-xl transition-all border ${
                                            selectedRegion === opt.id
                                                ? `${accent.bgDim} ${accent.border} ${accent.text}`
                                                : `${colors.inputBg} ${colors.border} ${colors.textMuted}`
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                            <p className={`${colors.textMuted} text-xs mt-1`}>
                                Define o símbolo de moeda em financeiro, comissões e agenda.
                            </p>
                        </div>

                        <div>
                            <label className={classes.label}>
                                Telefone/WhatsApp
                            </label>
                            <PhoneInput
                                value={phone}
                                onChange={setPhone}
                                defaultRegion={selectedRegion}
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
                                    placeholder={copy.slugPlaceholder}
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
                                {getCurrencySymbol(selectedRegion)}
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
                    <div className="mb-6 max-w-xl">
                        <label htmlFor="business-timezone" className={classes.label}>
                            Fuso horário do estabelecimento
                        </label>
                        <select
                            id="business-timezone"
                            data-testid="business-timezone-select"
                            value={selectedTimezone}
                            onChange={(e) => setTimezoneOverride(isSelectableTimeZone(e.target.value) ? e.target.value : null)}
                            disabled={timezoneColumnMissing}
                            className={`${classes.input} ${timezoneColumnMissing ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                            <optgroup label="Brasil">
                                {timezoneChoices.filter((o) => o.region === 'BR').map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </optgroup>
                            <optgroup label="Portugal">
                                {timezoneChoices.filter((o) => o.region === 'PT').map((o) => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </optgroup>
                        </select>
                        <p className={`${colors.textMuted} text-xs mt-1`} data-testid="business-timezone-help">
                            O agendamento online mostra e reserva horários sempre neste fuso, esteja o cliente onde estiver.
                            Agora são {formatTimeInTimeZone(Date.now(), selectedTimezone)} no estabelecimento.
                        </p>
                        {timezoneColumnMissing && (
                            <p className={`${colors.textMuted} text-xs mt-1`} data-testid="business-timezone-pending">
                                Usando o padrão da região. A troca manual fica disponível após a próxima atualização do sistema.
                            </p>
                        )}
                        {deviceDiffersFromBusiness && (
                            <p className="text-xs mt-1 text-[var(--color-warning)]" data-testid="business-timezone-device-warning">
                                Seu dispositivo está em outro fuso ({deviceTimezone}). A agenda interna usa o relógio do dispositivo.
                            </p>
                        )}
                    </div>
                    <BusinessHoursEditor
                        hours={businessHours}
                        onChange={setBusinessHours}
                    />
                </SettingsSection>

                <div data-testid="cancellation-policy-section">
                <SettingsSection title="Política de Cancelamento">
                    <label className={classes.label} htmlFor="cancel-cutoff">Cliente pode cancelar até</label>
                    <select id="cancel-cutoff" data-testid="cancel-cutoff" value={cancelCutoffHours} onChange={e => setCancelCutoffHours(Number(e.target.value))} className={classes.input}>
                        {CLIENT_CANCEL_CUTOFF_PRESETS.map(hours => <option key={hours} value={hours}>{cancelCutoffPresetLabel(hours)}</option>)}
                    </select>
                    <label className={`${classes.label} mt-4 block`} htmlFor="cancel-policy-text">O que o cliente lê</label>
                    <textarea id="cancel-policy-text" data-testid="cancellation-policy-generated" value={cancelPolicyText ?? generatedCancellationPolicyText(cancelCutoffHours, businessName || profile?.business_name)} maxLength={MAX_CLIENT_CANCEL_POLICY_TEXT_LENGTH} onChange={e => setCancelPolicyText(e.target.value)} rows={3} className={classes.input} />
                    <button type="button" onClick={() => setCancelPolicyText(null)} className={`mt-2 text-sm underline ${accent.text}`}>Restaurar texto padrão</button>
                    <p className={`${colors.textMuted} text-xs mt-2`}>Se alterar o prazo, confira se o texto personalizado corresponde à regra escolhida.</p>
                    <label className={`${classes.label} mt-4 block`} htmlFor="cancellation-policy-notes">
                        Observações (opcional)
                    </label>
                    <textarea
                        id="cancellation-policy-notes"
                        data-testid="cancellation-policy-notes"
                        value={cancellationPolicy}
                        maxLength={MAX_CLIENT_CANCEL_NOTE_LENGTH}
                        onChange={e => setCancellationPolicy(e.target.value.slice(0, MAX_CLIENT_CANCEL_NOTE_LENGTH))}
                        rows={3}
                        placeholder="Ex.: avisar pelo WhatsApp se for atrasar."
                        className={classes.input}
                    />
                    <p className={`${colors.textMuted} text-xs mt-2 leading-relaxed`} data-testid="cancellation-policy-notes-hint">
                        {CANCELLATION_POLICY_NOTES_HINT}
                    </p>
                </SettingsSection>
                </div>

                <SaveFooter
                    onSave={handleSave}
                    saveStatus={saveStatus}
                    hasChanges={hasChanges}
                />
            </div>
        </SettingsLayout>
    );
};
