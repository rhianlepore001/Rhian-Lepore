import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui';
import { SettingsLayout } from '../../components/SettingsLayout';
import { Save, HelpCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import { useBusinessSettings, useUpdateBusinessSettings, useProfileFields, useUpdateProfileFields } from '../../hooks/useSettings';
import { PublicLinkCard } from '../../components/PublicLinkCard';
import { SettingsSection } from '../../components/SettingsSection';
import { SettingsSwitch } from '../../components/SettingsSwitch';

export const PublicBookingSettings: React.FC = () => {
    const { user } = useAuth();
    const { accent, colors } = useBrutalTheme();
    const { data: settings } = useBusinessSettings();
    const { data: profile } = useProfileFields();
    const updateSettingsMutation = useUpdateBusinessSettings();
    const updateProfileMutation = useUpdateProfileFields();

    const [enableUpsells, setEnableUpsells] = useState(false);
    const [enableProfessionalSelection, setEnableProfessionalSelection] = useState(false);
    const [publicBookingEnabled, setPublicBookingEnabled] = useState(true);
    const [leadTimeHours, setLeadTimeHours] = useState(2);
    const [maxBookingsPerDay, setMaxBookingsPerDay] = useState<number | null>(null);
    const [enableEmailReminders, setEnableEmailReminders] = useState(true);
    const [enableSelfRescheduling, setEnableSelfRescheduling] = useState(true);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

    const businessSlug = profile?.business_slug ?? null;

    useEffect(() => {
        if (settings) {
            setEnableSelfRescheduling(settings.enable_self_rescheduling ?? true);
        }
    }, [settings]);

    useEffect(() => {
        if (profile) {
            setPublicBookingEnabled(profile.public_booking_enabled ?? true);
            setLeadTimeHours(profile.booking_lead_time_hours ?? 2);
            setMaxBookingsPerDay(profile.max_bookings_per_day ?? null);
        }
    }, [profile]);

    const handleSave = async () => {
        if (!user) return;
        setSaveStatus('saving');
        try {
            await updateSettingsMutation.mutateAsync({
                enable_self_rescheduling: enableSelfRescheduling,
            });

            await updateProfileMutation.mutateAsync({
                public_booking_enabled: publicBookingEnabled,
                booking_lead_time_hours: leadTimeHours,
                max_bookings_per_day: maxBookingsPerDay,
            });

            window.dispatchEvent(new CustomEvent('setup-step-completed', { detail: { stepId: 'booking' } }));
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Erro ao salvar configurações.');
            setSaveStatus('idle');
        }
    };

    const ToggleRow = ({
        title,
        description,
        checked,
        onChange,
        badge,
    }: {
        title: string;
        description: string;
        checked: boolean;
        onChange: (v: boolean) => void;
        badge?: React.ReactNode;
    }) => (
        <div className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
            <div className="flex-1 min-w-0">
                <h4 className={`${colors.text} text-sm font-bold mb-0.5`}>{title}</h4>
                <p className={`${colors.textMuted} text-xs leading-relaxed`}>{description}</p>
                {badge && <div className="mt-2">{badge}</div>}
            </div>
            <SettingsSwitch checked={checked} onChange={onChange} />
        </div>
    );

    if (!settings && !profile) return (
        <SettingsLayout>
            <div className={`p-8 text-center ${colors.textMuted}`}>Carregando agendamento...</div>
        </SettingsLayout>
    );

    return (
        <SettingsLayout>
            <div className="max-w-4xl space-y-6 pb-20 md:pb-0">
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <SettingsSection
                        title={
                            <div className="flex items-center gap-2">
                                <span className="text-sm">Upsells Inteligentes</span>
                                <HelpCircle className={`w-4 h-4 ${colors.textMuted}`} />
                            </div>
                        }
                    >
                        <div className="space-y-4">
                            <p className={`${colors.textMuted} text-xs leading-relaxed`}>
                                Sugere serviços extras para o cliente gastar mais por visita, automaticamente.
                            </p>
                            <div className={`inline-flex items-center px-3 py-1.5 rounded-xl ${accent.bgDim} ${accent.borderDim} ${accent.text} text-xs font-bold uppercase tracking-wider`}>
                                +R$ 1.200/mês méd.
                            </div>
                            <div className="flex justify-end pt-2">
                                <SettingsSwitch checked={enableUpsells} onChange={setEnableUpsells} />
                            </div>
                        </div>
                    </SettingsSection>

                    <SettingsSection
                        title={
                            <div className="flex items-center gap-2">
                                <span className="text-sm">Profissionais</span>
                                <HelpCircle className={`w-4 h-4 ${colors.textMuted}`} />
                            </div>
                        }
                    >
                        <div className="space-y-4">
                            <p className={`${colors.textMuted} text-xs leading-relaxed`}>
                                Permite que os clientes escolham com quem desejam realizar o procedimento.
                            </p>
                            <div className="inline-flex items-center px-3 py-1.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                                +114% Retenção
                            </div>
                            <div className="flex justify-end pt-2">
                                <SettingsSwitch checked={enableProfessionalSelection} onChange={setEnableProfessionalSelection} />
                            </div>
                        </div>
                    </SettingsSection>
                </div>

                <SettingsSection title="Automação e Lembretes">
                    <div className="space-y-2 divide-y divide-white/5">
                        <ToggleRow
                            title="Lembretes por E-mail"
                            description="Aviso automático 24h antes do serviço."
                            checked={enableEmailReminders}
                            onChange={setEnableEmailReminders}
                        />
                        <ToggleRow
                            title="Reagendamento Autônomo"
                            description="Cliente reagenda sozinho via link de e-mail."
                            checked={enableSelfRescheduling}
                            onChange={setEnableSelfRescheduling}
                        />
                    </div>
                </SettingsSection>

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