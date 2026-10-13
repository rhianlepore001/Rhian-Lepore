import React, { useState, useEffect } from 'react';
import { Button, useToast } from '../../components/ui';
import { SettingsLayout } from '../../components/SettingsLayout';
import { Save, HelpCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import { useBusinessSettings, useUpdateBusinessSettings, useProfileFields, useUpdateProfileFields, useUpdateOnlineBookingRequiresApproval, useUpdateBookingLeadTimeMinutes, useUpdateClientCancelPolicyText } from '../../hooks/useSettings';
import { CancellationPolicyText } from '../../components/CancellationPolicyText';
import { PublicLinkCard } from '../../components/PublicLinkCard';
import { SettingsSection } from '../../components/SettingsSection';
import { SettingsSwitch } from '../../components/SettingsSwitch';
import { SettingsRow } from '../../components/ui/SettingsRow';
import {
    LEAD_TIME_PRESETS,
    LEAD_TIME_CUSTOM_MINUTES_RANGE_HINT,
    formatLeadTimeDuration,
    isLeadTimePresetMinutes,
    leadTimeExample,
    leadTimeHoursForMinutes,
    leadTimePresetLabel,
    parseCustomLeadTime,
    resolveLeadTimeMinutes,
    splitLeadTimeMinutes,
} from '../../utils/bookingLeadTime';
import {
    CANCELLATION_POLICY_NOTES_HINT,
    MAX_CLIENT_CANCEL_POLICY_TEXT_LENGTH,
    cancellationPolicyNotesForDisplay,
    generatedCancellationPolicyText,
    normalizeCustomCancellationPolicyText,
} from '../../utils/cancellationPolicyCopy';
import {
    CLIENT_CANCEL_CUTOFF_PRESETS,
    DEFAULT_CLIENT_CANCEL_CUTOFF_HOURS,
    MAX_CLIENT_CANCEL_NOTE_LENGTH,
    cancelCutoffPresetLabel,
    clampClientCancelCutoffHours,
} from '../../utils/clientCancelCutoff';
import {
    SERVICE_ONLY_EDIT_SKIP_HELP,
    SERVICE_ONLY_EDIT_SKIP_LABEL,
} from '../../utils/clientEditRequest';
import {
    ONLINE_BOOKING_APPROVAL_HELP,
    ONLINE_BOOKING_APPROVAL_LABEL,
    ONLINE_BOOKING_APPROVAL_PENDING_NOTE,
    ONLINE_BOOKING_APPROVAL_UNSUPPORTED_NOTE,
    resolveOnlineBookingRequiresApproval,
} from '../../utils/onlineBookingApproval';

export const PublicBookingSettings: React.FC = () => {
    const { user } = useAuth();
    const { accent, colors, classes } = useBrutalTheme();
    const { data: settings } = useBusinessSettings();
    const { data: profile } = useProfileFields();
    const updateSettingsMutation = useUpdateBusinessSettings();
    const updateProfileMutation = useUpdateProfileFields();
    const updateApprovalMutation = useUpdateOnlineBookingRequiresApproval();
    const updateLeadMinutesMutation = useUpdateBookingLeadTimeMinutes();
    const updatePolicyTextMutation = useUpdateClientCancelPolicyText();
    const { showToast } = useToast();

    const [publicProductsEnabled, setPublicProductsEnabled] = useState(false);
    const [publicBookingEnabled, setPublicBookingEnabled] = useState(true);
    /** Antecedência efetiva em minutos (presets = horas cheias). */
    const [leadTimeMinutes, setLeadTimeMinutes] = useState(120);
    const [leadTimeCustom, setLeadTimeCustom] = useState(false);
    const [leadTimeCustomHoursDraft, setLeadTimeCustomHoursDraft] = useState('');
    const [leadTimeCustomMinutesDraft, setLeadTimeCustomMinutesDraft] = useState('');
    const [leadTimeCustomError, setLeadTimeCustomError] = useState<string | null>(null);
    const [maxBookingsPerDay, setMaxBookingsPerDay] = useState<number | null>(null);
    const [enableSelfRescheduling, setEnableSelfRescheduling] = useState(true);
    const [serviceOnlySkip, setServiceOnlySkip] = useState(false);
    const [requiresApproval, setRequiresApproval] = useState(true);
    const savedRequiresApproval = resolveOnlineBookingRequiresApproval(settings);
    const [cancelCutoffHours, setCancelCutoffHours] = useState(DEFAULT_CLIENT_CANCEL_CUTOFF_HOURS);
    const [cancelNote, setCancelNote] = useState('');
    /** null = usar o texto gerado do prazo (padrão). */
    const [cancelPolicyText, setCancelPolicyText] = useState<string | null>(null);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

    const businessSlug = profile?.business_slug ?? null;

    useEffect(() => {
        if (settings) {
            setEnableSelfRescheduling(settings.enable_self_rescheduling ?? true);
            setServiceOnlySkip(settings.service_only_edit_skip_acceptance ?? false);
            setRequiresApproval(resolveOnlineBookingRequiresApproval(settings));
            setPublicProductsEnabled(settings.public_products_enabled ?? false);
            setCancelCutoffHours(clampClientCancelCutoffHours(settings.client_cancel_cutoff_hours ?? DEFAULT_CLIENT_CANCEL_CUTOFF_HOURS));
            setCancelNote(cancellationPolicyNotesForDisplay(
                settings.client_cancel_note,
                settings.cancellation_policy,
            ));
            setCancelPolicyText(normalizeCustomCancellationPolicyText(settings.client_cancel_policy_text));
        }
    }, [settings]);

    useEffect(() => {
        if (profile) {
            setPublicBookingEnabled(profile.public_booking_enabled ?? true);
            const minutes = resolveLeadTimeMinutes(profile);
            setLeadTimeMinutes(minutes);
            const custom = !isLeadTimePresetMinutes(minutes);
            setLeadTimeCustom(custom);
            const split = splitLeadTimeMinutes(minutes);
            setLeadTimeCustomHoursDraft(custom ? String(split.hours) : '');
            setLeadTimeCustomMinutesDraft(custom ? String(split.minutes) : '');
            setLeadTimeCustomError(null);
            setMaxBookingsPerDay(profile.max_bookings_per_day ?? null);
        }
    }, [profile]);

    const handleSave = async () => {
        if (!user) return;
        let minutesToSave = leadTimeMinutes;
        if (leadTimeCustom) {
            const parsed = parseCustomLeadTime(leadTimeCustomHoursDraft, leadTimeCustomMinutesDraft);
            if (parsed.ok === false) {
                setLeadTimeCustomError(parsed.error);
                return;
            }
            minutesToSave = parsed.minutes;
            setLeadTimeMinutes(parsed.minutes);
            setLeadTimeCustomError(null);
        }
        setSaveStatus('saving');
        try {
            await updateSettingsMutation.mutateAsync({
                enable_self_rescheduling: enableSelfRescheduling,
                service_only_edit_skip_acceptance: serviceOnlySkip,
                public_products_enabled: publicProductsEnabled,
                client_cancel_cutoff_hours: cancelCutoffHours,
                client_cancel_note: cancelNote.trim() === '' ? '' : cancelNote.trim().slice(0, MAX_CLIENT_CANCEL_NOTE_LENGTH),
            });

            if (requiresApproval !== savedRequiresApproval) {
                const approvalResult = await updateApprovalMutation.mutateAsync(requiresApproval);
                if (approvalResult === 'unsupported') {
                    setRequiresApproval(true);
                    showToast(ONLINE_BOOKING_APPROVAL_UNSUPPORTED_NOTE, 'info');
                }
            }

            // Horas = teto de minutos/60 (compatível e nunca mais permissivo se a
            // coluna de minutos ainda não existir ou for revertida).
            await updateProfileMutation.mutateAsync({
                public_booking_enabled: publicBookingEnabled,
                booking_lead_time_hours: leadTimeHoursForMinutes(minutesToSave),
                max_bookings_per_day: maxBookingsPerDay,
            });
            const minutesResult = await updateLeadMinutesMutation.mutateAsync(minutesToSave);
            if (minutesResult === 'unsupported' && minutesToSave % 60 !== 0) {
                showToast(`Minutos ainda indisponíveis: a antecedência foi salva como ${formatLeadTimeDuration(leadTimeHoursForMinutes(minutesToSave) * 60)}.`, 'info');
            }

            const policyTextResult = await updatePolicyTextMutation.mutateAsync(
                normalizeCustomCancellationPolicyText(cancelPolicyText),
            );
            if (policyTextResult === 'unsupported' && normalizeCustomCancellationPolicyText(cancelPolicyText)) {
                showToast('Texto personalizado da política ainda indisponível: o cliente vê o texto padrão.', 'info');
            }

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
                    <div className={`mt-4 pt-4 border-t ${colors.divider}`}>
                        <SettingsRow
                            label={ONLINE_BOOKING_APPROVAL_LABEL}
                            help={ONLINE_BOOKING_APPROVAL_HELP}
                            data-testid="online-booking-approval-row"
                        >
                            <SettingsSwitch
                                id="online-booking-requires-approval"
                                ariaLabel={ONLINE_BOOKING_APPROVAL_LABEL}
                                checked={requiresApproval}
                                onChange={setRequiresApproval}
                            />
                        </SettingsRow>
                        {savedRequiresApproval && !requiresApproval && (
                            <p
                                data-testid="online-booking-approval-pending-note"
                                role="status"
                                className={`mt-3 text-xs leading-relaxed rounded-xl border px-3 py-2.5 ${accent.bgDim} ${accent.border} ${colors.textSecondary}`}
                            >
                                {ONLINE_BOOKING_APPROVAL_PENDING_NOTE}
                            </p>
                        )}
                    </div>
                </SettingsSection>

                <div data-testid="lead-time-section" className="scroll-mt-[14rem] md:scroll-mt-8">
                <SettingsSection title="Antecedência mínima para marcar pelo link">
                    <div className="space-y-4">
                        <p className={`${colors.textMuted} text-xs leading-relaxed`} data-testid="lead-time-help">
                            Quanto tempo antes do horário o cliente ainda consegue marcar pelo link de agendamento. Horários mais próximos que isso não aparecem para ele.
                        </p>
                        <div className="grid grid-cols-3 gap-2 md:flex md:flex-wrap md:max-w-xl" role="group" aria-label="Antecedência mínima para marcar pelo link">
                            {LEAD_TIME_PRESETS.map((hours) => {
                                const pressed = !leadTimeCustom && leadTimeMinutes === hours * 60;
                                return (
                                    <button
                                        key={hours}
                                        type="button"
                                        data-testid={`lead-time-preset-${hours}`}
                                        aria-pressed={pressed}
                                        onClick={() => {
                                            setLeadTimeCustom(false);
                                            setLeadTimeMinutes(hours * 60);
                                            setLeadTimeCustomHoursDraft('');
                                            setLeadTimeCustomMinutesDraft('');
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
                                    const split = splitLeadTimeMinutes(leadTimeMinutes);
                                    const keep = !isLeadTimePresetMinutes(leadTimeMinutes);
                                    setLeadTimeCustomHoursDraft(keep ? String(split.hours) : '');
                                    setLeadTimeCustomMinutesDraft(keep ? String(split.minutes) : '');
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
                            <fieldset className="max-w-sm" aria-describedby="lead-time-custom-hint">
                                <legend className={classes.label}>Antecedência personalizada</legend>
                                <div className="mt-1 grid grid-cols-2 gap-3">
                                    {([
                                        { id: 'booking-lead-time-custom', label: 'Horas', unit: 'h', value: leadTimeCustomHoursDraft, set: setLeadTimeCustomHoursDraft, max: 3 },
                                        { id: 'booking-lead-time-custom-minutes', label: 'Minutos', unit: 'min', value: leadTimeCustomMinutesDraft, set: setLeadTimeCustomMinutesDraft, max: 2 },
                                    ] as const).map((field) => (
                                        <label key={field.id} className="block" htmlFor={field.id}>
                                            <span className={`${colors.textMuted} text-xs`}>{field.label}</span>
                                            <div className="relative mt-1">
                                                <input
                                                    id={field.id}
                                                    data-testid={field.id}
                                                    type="text"
                                                    inputMode="numeric"
                                                    pattern="[0-9]*"
                                                    maxLength={field.max}
                                                    placeholder="0"
                                                    value={field.value}
                                                    aria-invalid={Boolean(leadTimeCustomError)}
                                                    onChange={(e) => {
                                                        const next = e.target.value.replace(/[^\d]/g, '').slice(0, field.max);
                                                        field.set(next);
                                                        const parsed = field.id === 'booking-lead-time-custom'
                                                            ? parseCustomLeadTime(next, leadTimeCustomMinutesDraft)
                                                            : parseCustomLeadTime(leadTimeCustomHoursDraft, next);
                                                        if (parsed.ok) {
                                                            setLeadTimeMinutes(parsed.minutes);
                                                            setLeadTimeCustomError(null);
                                                        } else if (leadTimeCustomError) {
                                                            setLeadTimeCustomError(null);
                                                        }
                                                    }}
                                                    className={`${classes.input} pr-12 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                                                />
                                                <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-sm ${colors.textMuted}`} aria-hidden="true">{field.unit}</span>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                                <p id="lead-time-custom-hint" data-testid="lead-time-custom-hint" className={`mt-1.5 text-xs ${colors.textMuted}`}>
                                    {LEAD_TIME_CUSTOM_MINUTES_RANGE_HINT} Ex.: 1h30 ou só 20 min.
                                </p>
                                {leadTimeCustomError && (
                                    <p id="lead-time-custom-error" data-testid="lead-time-custom-error" role="alert" className="mt-2 text-sm text-[var(--color-danger)]">
                                        {leadTimeCustomError}
                                    </p>
                                )}
                            </fieldset>
                        )}
                        <div
                            className="rounded-2xl border border-theme-border bg-theme-surface px-4 py-3.5 space-y-2"
                            data-testid="lead-time-example"
                        >
                            <p className={`${colors.textMuted} text-xs font-semibold uppercase tracking-[0.14em]`}>Na prática</p>
                            <p className={`${colors.text} text-sm leading-relaxed`} data-testid="lead-time-example-text">
                                {leadTimeExample(leadTimeMinutes)}
                            </p>
                        </div>
                        <ul className={`${colors.textMuted} text-xs leading-relaxed space-y-1 list-disc pl-4`} data-testid="lead-time-notes">
                            <li><span className={`font-semibold ${colors.textSecondary}`}>Sem mínimo:</span> qualquer horário livre que ainda não passou pode ser marcado pelo link.</li>
                            <li><span className={`font-semibold ${colors.textSecondary}`}>Outro:</span> escolha horas e minutos (ex.: 1h30 ou 20 min), até 720h.</li>
                            <li><span className={`font-semibold ${colors.textSecondary}`}>Agenda não é afetada:</span> você e a equipe continuam marcando qualquer horário pela Agenda.</li>
                        </ul>
                    </div>
                </SettingsSection>
                </div>

                <div data-testid="cancel-cutoff-section" className="scroll-mt-[14rem] md:scroll-mt-8">
                <SettingsSection title="Política de cancelamento">
                    <div className="space-y-4">
                        <p className={`${colors.textMuted} text-xs leading-relaxed`}>
                            Até quando o cliente pode cancelar sozinho pela Minha Área, em relação ao horário marcado (padrão 2h). Pedido ainda em Aguardando pode cancelar até o horário.
                        </p>
                        <p className={`${classes.label}`} id="cancel-cutoff-label">Cliente pode cancelar até</p>
                        <div className="grid grid-cols-3 gap-2 md:flex md:flex-wrap md:max-w-xl" role="group" aria-labelledby="cancel-cutoff-label">
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
                        <div className="space-y-1.5" data-testid="cancel-cutoff-generated">
                            <div className="flex items-center justify-between gap-3">
                                <label className={`${classes.label}`} htmlFor="client-cancel-policy-text">
                                    O que o cliente lê
                                </label>
                                {cancelPolicyText != null ? (
                                    <button
                                        type="button"
                                        data-testid="cancel-policy-restore-default"
                                        onClick={() => setCancelPolicyText(null)}
                                        className={`text-xs font-semibold underline underline-offset-2 ${accent.text}`}
                                    >
                                        Restaurar padrão
                                    </button>
                                ) : (
                                    <span className={`${colors.textMuted} text-xs`} data-testid="cancel-policy-default-badge">Texto padrão</span>
                                )}
                            </div>
                            <textarea
                                id="client-cancel-policy-text"
                                data-testid="client-cancel-policy-text"
                                value={cancelPolicyText ?? generatedCancellationPolicyText(cancelCutoffHours, profile?.business_name)}
                                maxLength={MAX_CLIENT_CANCEL_POLICY_TEXT_LENGTH}
                                placeholder={generatedCancellationPolicyText(cancelCutoffHours, profile?.business_name)}
                                aria-describedby="client-cancel-policy-text-hint"
                                onChange={(e) => {
                                    const next = e.target.value.slice(0, MAX_CLIENT_CANCEL_POLICY_TEXT_LENGTH);
                                    const generated = generatedCancellationPolicyText(cancelCutoffHours, profile?.business_name);
                                    setCancelPolicyText(next.trim() === generated.trim() ? null : next);
                                }}
                                rows={3}
                                className={classes.input}
                            />
                            <div className="flex items-start justify-between gap-3">
                                <p id="client-cancel-policy-text-hint" className={`${colors.textMuted} text-xs leading-relaxed`} data-testid="client-cancel-policy-text-hint">
                                    {cancelPolicyText != null
                                        ? 'Texto seu. Se mudar o prazo acima, revise o texto para não prometer outra regra. Deixe em branco para voltar ao padrão.'
                                        : 'Gerado a partir do prazo acima. Edite se quiser escrever do seu jeito.'}
                                </p>
                                <span className={`${colors.textMuted} text-xs tabular-nums shrink-0`} data-testid="client-cancel-policy-text-count">
                                    {(cancelPolicyText ?? generatedCancellationPolicyText(cancelCutoffHours, profile?.business_name)).length}/{MAX_CLIENT_CANCEL_POLICY_TEXT_LENGTH}
                                </span>
                            </div>
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
                        <div
                            className="rounded-2xl border border-theme-border bg-theme-surface px-4 py-3.5 space-y-1.5"
                            data-testid="cancel-policy-preview"
                        >
                            <p className={`${colors.textMuted} text-xs font-semibold uppercase tracking-[0.14em]`}>
                                Prévia para o cliente
                            </p>
                            <CancellationPolicyText
                                parts={{
                                    policy: normalizeCustomCancellationPolicyText(cancelPolicyText)
                                        ?? generatedCancellationPolicyText(cancelCutoffHours, profile?.business_name),
                                    notes: cancelNote.trim(),
                                }}
                                className={`${colors.text} text-sm leading-relaxed`}
                            />
                        </div>
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
                        <SettingsRow
                            label={SERVICE_ONLY_EDIT_SKIP_LABEL}
                            help={SERVICE_ONLY_EDIT_SKIP_HELP}
                            data-testid="service-only-edit-skip-row"
                        >
                            <SettingsSwitch
                                checked={serviceOnlySkip}
                                onChange={setServiceOnlySkip}
                                ariaLabel={SERVICE_ONLY_EDIT_SKIP_LABEL}
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