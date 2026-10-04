import React, { useState, useEffect } from 'react';
import { Button, useToast } from '../../components/ui';
import { SettingsLayout } from '../../components/SettingsLayout';
import { Save, HelpCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import { useBusinessSettings, useUpdateBusinessSettings, useProfileFields, useUpdateProfileFields } from '../../hooks/useSettings';
import { PublicLinkCard } from '../../components/PublicLinkCard';
import { SettingsSection } from '../../components/SettingsSection';
import { SettingsSwitch } from '../../components/SettingsSwitch';
import { SettingsRow } from '../../components/ui/SettingsRow';
import { LEAD_TIME_PRESETS, clampLeadTimeHours, isLeadTimePreset, leadTimePresetLabel, parseCustomLeadTimeHours, LEAD_TIME_CUSTOM_EMPTY_ERROR, LEAD_TIME_CUSTOM_RANGE_HINT } from '../../utils/bookingLeadTime';
import {
    CANCELLATION_POLICY_NOTES_HINT,
    cancellationPolicyNotesForDisplay,
    generatedCancellationPolicyText,
} from '../../utils/cancellationPolicyCopy';
import {
    CLIENT_CANCEL_CUTOFF_PRESETS,
    DEFAULT_CLIENT_CANCEL_CUTOFF_HOURS,
    MAX_CLIENT_CANCEL_NOTE_LENGTH,
    cancelCutoffPresetLabel,
    clampClientCancelCutoffHours,
} from '../../utils/clientCancelCutoff';

export const PublicBookingSettings: React.FC = () => {
    const { user } = useAuth();
    const { accent, colors, classes } = useBrutalTheme();
    const { data: settings } = useBusinessSettings();
    const { data: profile } = useProfileFields();
    const updateSettingsMutation = useUpdateBusinessSettings();
    const updateProfileMutation = useUpdateProfileFields();
    const { showToast } = useToast();

    const [publicProductsEnabled, setPublicProductsEnabled] = useState(false);
    const [publicBookingEnabled, setPublicBookingEnabled] = useState(true);
    const [leadTimeHours, setLeadTimeHours] = useState(2);
    const [leadTimeCustom, setLeadTimeCustom] = useState(false);
    const [leadTimeCustomDraft, setLeadTimeCustomDraft] = useState('');
    const [leadTimeCustomError, setLeadTimeCustomError] = useState<string | null>(null);
    const [maxBookingsPerDay, setMaxBookingsPerDay] = useState<number | null>(null);
    const [enableSelfRescheduling, setEnableSelfRescheduling] = useState(true);
    const [cancelCutoffHours, setCancelCutoffHours] = useState(DEFAULT_CLIENT_CANCEL_CUTOFF_HOURS);
    const [cancelNote, setCancelNote] = useState('');
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

    const businessSlug = profile?.business_slug ?? null;

    useEffect(() => {
        if (settings) {
            setEnableSelfRescheduling(settings.enable_self_rescheduling ?? true);
            setPublicProductsEnabled(settings.public_products_enabled ?? false);
            setCancelCutoffHours(clampClientCancelCutoffHours(settings.client_cancel_cutoff_hours ?? DEFAULT_CLIENT_CANCEL_CUTOFF_HOURS));
            setCancelNote(cancellationPolicyNotesForDisplay(
                settings.client_cancel_note,
                settings.cancellation_policy,
            ));
        }
    }, [settings]);

    useEffect(() => {
        if (profile) {
            setPublicBookingEnabled(profile.public_booking_enabled ?? true);
            setLeadTimeHours(profile.booking_lead_time_hours ?? 2);
            const custom = !isLeadTimePreset(profile.booking_lead_time_hours ?? 2);
            setLeadTimeCustom(custom);
            setLeadTimeCustomDraft(custom ? String(profile.booking_lead_time_hours ?? '') : '');
            setLeadTimeCustomError(null);
            setMaxBookingsPerDay(profile.max_bookings_per_day ?? null);
        }
    }, [profile]);

    const handleSave = async () => {
        if (!user) return;
        if (leadTimeCustom) {
            const parsed = parseCustomLeadTimeHours(leadTimeCustomDraft);
            if (parsed === null) {
                setLeadTimeCustomError(LEAD_TIME_CUSTOM_EMPTY_ERROR);
                return;
            }
            setLeadTimeHours(parsed);
            setLeadTimeCustomError(null);
        }
        setSaveStatus('saving');
        try {
            await updateSettingsMutation.mutateAsync({
                enable_self_rescheduling: enableSelfRescheduling,
                public_products_enabled: publicProductsEnabled,
                client_cancel_cutoff_hours: cancelCutoffHours,
                client_cancel_note: cancelNote.trim() === '' ? '' : cancelNote.trim().slice(0, MAX_CLIENT_CANCEL_NOTE_LENGTH),
            });

            const hoursToSave = leadTimeCustom
                ? parseCustomLeadTimeHours(leadTimeCustomDraft) ?? clampLeadTimeHours(leadTimeHours)
                : leadTimeHours;

            await updateProfileMutation.mutateAsync({
                public_booking_enabled: publicBookingEnabled,
                booking_lead_time_hours: hoursToSave,
                max_bookings_per_day: maxBookingsPerDay,
            });

            window.dispatchEvent(new CustomEvent('setup-step-completed', { detail: { stepId: 'booking' } }));
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (error) {
            console.error('Error saving settings:', error);
            showToast('Erro ao salvar configurações.', 'error');
            setSaveStatus('idle');
        }
    };

    const ToggleRow = ({
        title,
        description,
        checked,
        onChange,
    }: {
        title: string;
        description: string;
        checked: boolean;
        onChange: (v: boolean) => void;
    }) => (
        <SettingsRow label={title} help={description}>
            <SettingsSwitch checked={checked} onChange={onChange} />
        </SettingsRow>
    );

    if (!settings && !profile) return (
        <SettingsLayout>
            <div className={`p-8 text-center ${colors.textMuted}`}>Carregando agendamento...</div>
        </SettingsLayout>
    );

    return (
        <SettingsLayout>
            <div className="w-full space-y-6 pb-20 md:pb-0">
                <PublicLinkCard businessSlug={businessSlug} publicBookingEnabled={publicBookingEnabled} />

                <SettingsSection
                    title="Reservas Online"
                    description="Controle se seus clientes podem agendar através do link público."
                >
                    <ToggleRow
                        title="Ativar Reservas Online"
                        description="Seus clientes podem marcar horário através do seu link de reserva personalizado."
                        checked={publicBookingEnabled}
                        onChange={setPublicBookingEnabled}
                    />
                </SettingsSection>

                <div data-testid="lead-time-section" className="scroll-mt-[14rem] md:scroll-mt-8">
                <SettingsSection title="Antecedência mínima">
                    <div className="space-y-4">
                        <p className={`${colors.textMuted} text-xs leading-relaxed`}>
                            O cliente só marca pelo link com essa antecedência (padrão 2h). Quem marca pela Agenda — você e a equipe — não é afetado.
                        </p>
                        <div className="grid grid-cols-3 gap-2 md:flex md:flex-wrap md:max-w-xl" role="group" aria-label="Antecedência mínima">
                            {LEAD_TIME_PRESETS.map((hours) => {
                                const pressed = !leadTimeCustom && leadTimeHours === hours;
                                return (
                                    <button
                                        key={hours}
                                        type="button"
                                        data-testid={`lead-time-preset-${hours}`}
                                        aria-pressed={pressed}
                                        onClick={() => {
                                            setLeadTimeCustom(false);
                                            setLeadTimeHours(hours);
                                            setLeadTimeCustomDraft('');
                                            setLeadTimeCustomError(null);
                                        }}
                                        className={`min-h-[44px] px-2 sm:px-3 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all border w-full md:w-auto whitespace-nowrap ${
                                            pressed
                                                ? `${accent.bgDim} ${accent.border} ${accent.text}`
                                                : `${colors.inputBg} ${colors.border} ${colors.textMuted}`
                                        }`}
                                    >
                                        {leadTimePresetLabel(hours)}
                                    </button>
                                );
                            })}
                            <button
                                type="button"
                                data-testid="lead-time-preset-custom"
                                aria-pressed={leadTimeCustom}
                                onClick={() => {
                                    setLeadTimeCustom(true);
                                    setLeadTimeCustomDraft(isLeadTimePreset(leadTimeHours) ? '' : String(leadTimeHours));
                                    setLeadTimeCustomError(null);
                                }}
                                className={`min-h-[44px] px-2 sm:px-3 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all border w-full md:w-auto whitespace-nowrap ${
                                    leadTimeCustom
                                        ? `${accent.bgDim} ${accent.border} ${accent.text}`
                                        : `${colors.inputBg} ${colors.border} ${colors.textMuted}`
                                }`}
                            >
                                Outro
                            </button>
                        </div>
                        {leadTimeCustom && (
                            <label className="block max-w-xs">
                                <span className={classes.label}>Horas de antecedência</span>
                                <div className="relative mt-1">
                                    <input
                                        id="booking-lead-time-custom"
                                        data-testid="booking-lead-time-custom"
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        value={leadTimeCustomDraft}
                                        aria-invalid={Boolean(leadTimeCustomError)}
                                        aria-describedby="lead-time-custom-hint"
                                        onChange={(e) => {
                                            setLeadTimeCustomDraft(e.target.value.replace(/[^\d]/g, ''));
                                            if (leadTimeCustomError) setLeadTimeCustomError(null);
                                        }}
                                        className={`${classes.input} pr-9 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                                    />
                                    <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-sm ${colors.textMuted}`} aria-hidden="true">h</span>
                                </div>
                                <p id="lead-time-custom-hint" data-testid="lead-time-custom-hint" className={`mt-1 text-xs ${colors.textMuted}`}>
                                    {LEAD_TIME_CUSTOM_RANGE_HINT}
                                </p>
                                {leadTimeCustomError && (
                                    <p id="lead-time-custom-error" data-testid="lead-time-custom-error" role="alert" className="mt-2 text-sm text-[var(--color-danger)]">
                                        {leadTimeCustomError}
                                    </p>
                                )}
                            </label>
                        )}
                    </div>
                </SettingsSection>
                </div>

                <div data-testid="cancel-cutoff-section" className="scroll-mt-[14rem] md:scroll-mt-8">
                <SettingsSection title="Cliente pode cancelar até">
                    <div className="space-y-4">
                        <p className={`${colors.textMuted} text-xs leading-relaxed`}>
                            Prazo em relação ao horário marcado (padrão 2h). Pedido ainda em Aguardando pode cancelar até o horário.
                        </p>
                        <div className="grid grid-cols-3 gap-2 md:flex md:flex-wrap md:max-w-xl" role="group" aria-label="Cliente pode cancelar até">
                            {CLIENT_CANCEL_CUTOFF_PRESETS.map((hours) => {
                                const pressed = cancelCutoffHours === hours;
                                return (
                                    <button
                                        key={hours}
                                        type="button"
                                        data-testid={`cancel-cutoff-preset-${hours}`}
                                        aria-pressed={pressed}
                                        onClick={() => setCancelCutoffHours(hours)}
                                        className={`min-h-[44px] px-2 sm:px-3 py-2.5 text-xs sm:text-sm font-semibold rounded-xl transition-all border w-full md:w-auto ${
                                            hours === 0 ? 'whitespace-normal col-span-3 md:col-span-1' : 'whitespace-nowrap'
                                        } ${
                                            pressed
                                                ? `${accent.bgDim} ${accent.border} ${accent.text}`
                                                : `${colors.inputBg} ${colors.border} ${colors.textMuted}`
                                        }`}
                                    >
                                        {cancelCutoffPresetLabel(hours)}
                                    </button>
                                );
                            })}
                        </div>
                        <div
                            className="rounded-2xl border border-theme-border bg-theme-surface px-4 py-3.5 space-y-1.5"
                            data-testid="cancel-cutoff-generated"
                        >
                            <p className={`${colors.textMuted} text-xs font-semibold uppercase tracking-[0.14em]`}>
                                O que o cliente lê
                            </p>
                            <p className={`${colors.text} text-sm leading-relaxed`}>
                                {generatedCancellationPolicyText(cancelCutoffHours, profile?.business_name)}
                            </p>
                        </div>
                        <label className={`${classes.label} block`} htmlFor="client-cancel-note">
                            Observações (opcional)
                        </label>
                        <textarea
                            id="client-cancel-note"
                            data-testid="client-cancel-note"
                            value={cancelNote}
                            maxLength={MAX_CLIENT_CANCEL_NOTE_LENGTH}
                            onChange={(e) => setCancelNote(e.target.value.slice(0, MAX_CLIENT_CANCEL_NOTE_LENGTH))}
                            rows={3}
                            placeholder="Ex.: avisar pelo WhatsApp se for atrasar."
                            className={classes.input}
                        />
                        <p className={`${colors.textMuted} text-xs leading-relaxed`} data-testid="client-cancel-note-hint">
                            {CANCELLATION_POLICY_NOTES_HINT}
                        </p>
                    </div>
                </SettingsSection>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <SettingsSection
                        title={
                            <div className="flex items-center gap-2">
                                <span className="text-sm">Produtos no link público</span>
                                <HelpCircle className="w-4 h-4 text-[var(--color-text-muted)]" />
                            </div>
                        }
                    >
                        <div className="space-y-4">
                            <p className={`${colors.textMuted} text-xs leading-relaxed`}>
                                Exibe a seção Produtos no agendamento online. O estoque só baixa quando o atendimento for cobrado.
                            </p>
                            <div className="flex justify-end pt-2">
                                <SettingsSwitch
                                    checked={publicProductsEnabled}
                                    onChange={setPublicProductsEnabled}
                                />
                            </div>
                        </div>
                    </SettingsSection>

                    <SettingsSection
                        title={
                            <div className="flex items-center gap-2">
                                <span className="text-sm">Profissionais</span>
                                <HelpCircle className="w-4 h-4 text-[var(--color-text-muted)]" />
                            </div>
                        }
                    >
                        <div className="space-y-4 opacity-60">
                            <p className={`${colors.textMuted} text-xs leading-relaxed`}>
                                Permite que os clientes escolham com quem desejam realizar o procedimento.
                            </p>
                            <p className={`${colors.textMuted} text-xs`}>
                                Em breve — esta opção ainda não está disponível para salvar.
                            </p>
                            <div className="flex justify-end pt-2 pointer-events-none" aria-disabled="true">
                                <SettingsSwitch checked={false} onChange={() => undefined} />
                            </div>
                        </div>
                    </SettingsSection>
                </div>

                <div data-testid="self-reschedule-section">
                <SettingsSection title="Automação e Lembretes">
                    <div className="space-y-2 divide-y divide-[var(--color-divider)]">
                        <SettingsRow
                            label="Lembretes por E-mail"
                            help="Aviso automático 24h antes do serviço. Em breve — ainda não disponível para salvar."
                        >
                            <div className="opacity-60 pointer-events-none" aria-disabled="true">
                                <SettingsSwitch checked={false} onChange={() => undefined} />
                            </div>
                        </SettingsRow>
                        <SettingsRow
                            label="Cliente pode editar na Minha Área"
                            help="Mostra o botão Editar nos agendamentos futuros da Minha Área."
                            data-testid="self-reschedule-row"
                        >
                                <SettingsSwitch
                                    checked={enableSelfRescheduling}
                                    onChange={setEnableSelfRescheduling}
                                    ariaLabel="Cliente pode editar na Minha Área"
                                />
                            </SettingsRow>
                    </div>
                </SettingsSection>
                </div>

                <div className="flex justify-end pt-4">
                    <Button
                        onClick={handleSave}
                        loading={saveStatus === 'saving'}
                        className="w-full md:w-auto min-w-[200px]"
                    >
                        <Save className="w-5 h-5 mr-2" />
                        {saveStatus === 'saved' ? 'Salvo!' : 'Salvar Alterações'}
                    </Button>
                </div>
            </div>
        </SettingsLayout>
    );
};