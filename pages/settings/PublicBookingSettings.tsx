import React, { useState, useEffect } from 'react';
import { SettingsLayout } from '../../components/SettingsLayout';
import { Save, HelpCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { PublicLinkCard } from '../../components/PublicLinkCard';

export const PublicBookingSettings: React.FC = () => {
    const { user, userType } = useAuth();
    const [loading, setLoading] = useState(true);
    const [businessSlug, setBusinessSlug] = useState<string | null>(null);
    const [enableUpsells, setEnableUpsells] = useState(false);
    const [enableProfessionalSelection, setEnableProfessionalSelection] = useState(false);
    const [publicBookingEnabled, setPublicBookingEnabled] = useState(true);
    const [leadTimeHours, setLeadTimeHours] = useState(2);
    const [maxBookingsPerDay, setMaxBookingsPerDay] = useState<number | null>(null);
    const [enableEmailReminders, setEnableEmailReminders] = useState(true);
    const [enableSelfRescheduling, setEnableSelfRescheduling] = useState(true);

    useEffect(() => {
        fetchSettings();
    }, [user]);

    const fetchSettings = async () => {
        if (!user) return;
        try {
            const { data: settingsData, error: settingsError } = await supabase
                .from('business_settings')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (settingsError && settingsError.code !== 'PGRST116') { // Ignore no rows found error
                throw settingsError;
            }

            if (settingsData) {
                setEnableUpsells(settingsData.enable_upsells ?? false);
                setEnableProfessionalSelection(settingsData.enable_professional_selection ?? true);
                setPublicBookingEnabled(settingsData.public_booking_enabled ?? true);
                setLeadTimeHours(settingsData.lead_time_hours ?? 2);
                setMaxBookingsPerDay(settingsData.max_bookings_per_day);
                setEnableEmailReminders(settingsData.enable_email_reminders ?? true);
                setEnableSelfRescheduling(settingsData.enable_self_rescheduling ?? true);
            }

            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('business_slug')
                .eq('id', user.id)
                .single();

            if (profileError) throw profileError;
            if (profileData) {
                setBusinessSlug(profileData.business_slug);
            }

        } catch (error) {
            console.error('Error fetching settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!user) return;
        try {
            const { error } = await supabase
                .from('business_settings')
                .upsert({
                    user_id: user.id,
                    enable_upsells: enableUpsells,
                    enable_professional_selection: enableProfessionalSelection,
                    public_booking_enabled: publicBookingEnabled,
                    lead_time_hours: leadTimeHours,
                    max_bookings_per_day: maxBookingsPerDay,
                    enable_email_reminders: enableEmailReminders,
                    enable_self_rescheduling: enableSelfRescheduling
                });

            if (error) throw error;
            alert('Configurações salvas com sucesso!');
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Erro ao salvar configurações.');
        }
    };

    const isBeauty = userType === 'beauty';
    const accentColor = isBeauty ? 'beauty-neon' : 'accent-gold';

    return (
        <SettingsLayout>
            <div className="max-w-4xl">
                <h1 className="text-2xl md:text-3xl font-heading text-white uppercase mb-2">
                    Reservas Online
                </h1>
                <p className="text-sm md:text-base text-neutral-400 mb-4 md:mb-8">
                    Configure como clientes fazem reservas online
                </p>

                <PublicLinkCard businessSlug={businessSlug} publicBookingEnabled={publicBookingEnabled} />

                <div className={`p-4 md:p-6 mb-4 md:mb-6 transition-all ${isBeauty ? 'bg-beauty-dark/30 border border-beauty-neon/20 rounded-xl' : 'bg-neutral-900 border border-neutral-800 rounded-lg'}`}>
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                            <h3 className={`font-bold text-base md:text-lg mb-1 md:mb-2 ${isBeauty ? 'text-white' : 'text-white uppercase'}`}>
                                Ativar Reservas Online
                            </h3>
                            <p className="text-neutral-400 text-xs md:text-sm">
                                Seus clientes podem marcar horário através do seu link de reserva.
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                            <input
                                type="checkbox"
                                checked={publicBookingEnabled}
                                onChange={(e) => setPublicBookingEnabled(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className={`w-11 h-6 md:w-14 md:h-7 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:rounded-full after:h-5 after:w-5 md:after:h-6 md:after:w-6 after:transition-all peer-checked:bg-${accentColor}`}></div>
                        </label>
                    </div>
                </div>

                <div className="space-y-4 md:space-y-6 mb-6 md:mb-8">
                    <div className={`p-4 md:p-6 transition-all ${isBeauty ? 'bg-beauty-dark/30 border border-beauty-neon/20 rounded-xl' : 'bg-neutral-900 border border-neutral-800 rounded-lg'}`}>
                        <div className="flex items-start justify-between gap-4 mb-3 md:mb-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1 md:mb-2">
                                    <h3 className={`font-bold text-base md:text-lg ${isBeauty ? 'text-white' : 'text-white uppercase'}`}>
                                        Upsells Inteligentes
                                    </h3>
                                    <button className="text-neutral-400 hover:text-white">
                                        <HelpCircle className="w-3 h-3 md:w-4 md:h-4" />
                                    </button>
                                </div>
                                <p className="text-neutral-400 text-xs md:text-sm mb-2 md:mb-3">
                                    Sugere serviços complementares para aumentar o ticket médio.
                                </p>
                                <div className={`inline-block px-2 md:px-3 py-1 rounded-full bg-${accentColor}/10 text-${accentColor} text-xs font-bold`}>
                                    💰 +R$ 1.200/mês
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                                <input
                                    type="checkbox"
                                    checked={enableUpsells}
                                    onChange={(e) => setEnableUpsells(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className={`w-11 h-6 md:w-14 md:h-7 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:rounded-full after:h-5 after:w-5 md:after:h-6 md:after:w-6 after:transition-all peer-checked:bg-${accentColor}`}></div>
                            </label>
                        </div>

                        {enableUpsells && (
                            <div className={`mt-3 md:mt-4 p-3 md:p-4 rounded-lg border transition-all ${isBeauty ? 'bg-beauty-dark/50 border-beauty-neon/20 text-beauty-neon/80' : 'bg-neutral-800 border-neutral-700 text-neutral-300'}`}>
                                <p className="text-xs md:text-sm">
                                    ✅ <strong>Ativado!</strong> Configure os upsells na página de Serviços.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className={`p-4 md:p-6 transition-all ${isBeauty ? 'bg-beauty-dark/30 border border-beauty-neon/20 rounded-xl' : 'bg-neutral-900 border border-neutral-800 rounded-lg'}`}>
                        <div className="flex items-start justify-between gap-4 mb-3 md:mb-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1 md:mb-2">
                                    <h3 className={`font-bold text-base md:text-lg ${isBeauty ? 'text-white' : 'text-white uppercase'}`}>
                                        Seleção de Profissional
                                    </h3>
                                    <button className="text-neutral-400 hover:text-white">
                                        <HelpCircle className="w-3 h-3 md:w-4 md:h-4" />
                                    </button>
                                </div>
                                <p className="text-neutral-400 text-xs md:text-sm mb-2 md:mb-3">
                                    Permite que clientes escolham com qual profissional desejam agendar.
                                </p>
                                <div className={`inline-block px-2 md:px-3 py-1 rounded-full bg-${accentColor}/10 text-${accentColor} text-xs font-bold`}>
                                    📈 +114% recorrentes
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                                <input
                                    type="checkbox"
                                    checked={enableProfessionalSelection}
                                    onChange={(e) => setEnableProfessionalSelection(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className={`w-11 h-6 md:w-14 md:h-7 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:rounded-full after:h-5 after:w-5 md:after:h-6 md:after:w-6 after:transition-all peer-checked:bg-${accentColor}`}></div>
                            </label>
                        </div>

                        {enableProfessionalSelection && (
                            <div className={`mt-3 md:mt-4 p-3 md:p-4 rounded-lg border transition-all ${isBeauty ? 'bg-beauty-dark/50 border-beauty-neon/20 text-beauty-neon/80' : 'bg-neutral-800 border-neutral-700 text-neutral-300'}`}>
                                <p className="text-xs md:text-sm">
                                    ✅ <strong>Ativado!</strong> Adicione sua equipe na aba &quot;Equipe&quot;.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className={`p-4 md:p-6 transition-all ${isBeauty ? 'bg-beauty-dark/30 border border-beauty-neon/20 rounded-xl' : 'bg-neutral-900 border border-neutral-800 rounded-lg'}`}>
                        <h3 className={`font-bold text-base md:text-lg mb-4 ${isBeauty ? 'text-white' : 'text-white uppercase'}`}>
                            Automação e Lembretes
                        </h3>

                        <div className="space-y-6">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <h4 className="font-bold text-white text-sm md:text-base mb-1">
                                        Lembretes por E-mail
                                    </h4>
                                    <p className="text-neutral-400 text-xs md:text-sm">
                                        Envia um e-mail automático para o cliente 24h antes do agendamento.
                                    </p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                                    <input
                                        type="checkbox"
                                        checked={enableEmailReminders}
                                        onChange={(e) => setEnableEmailReminders(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className={`w-11 h-6 md:w-14 md:h-7 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:rounded-full after:h-5 after:w-5 md:after:h-6 md:after:w-6 after:transition-all peer-checked:bg-${accentColor}`}></div>
                                </label>
                            </div>

                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <h4 className="font-bold text-white text-sm md:text-base mb-1">
                                        Reagendamento Automático
                                    </h4>
                                    <p className="text-neutral-400 text-xs md:text-sm">
                                        Permite que o cliente reagende o horário sozinho através do link no e-mail.
                                    </p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                                    <input
                                        type="checkbox"
                                        checked={enableSelfRescheduling}
                                        onChange={(e) => setEnableSelfRescheduling(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className={`w-11 h-6 md:w-14 md:h-7 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:rounded-full after:h-5 after:w-5 md:after:h-6 md:after:w-6 after:transition-all peer-checked:bg-${accentColor}`}></div>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    className={`w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 font-bold rounded-lg transition-all
                        ${isBeauty
                            ? 'bg-beauty-neon text-black hover:bg-white hover:shadow-neon'
                            : `bg-${accentColor} hover:bg-${accentColor}/90 text-black`}
                    `}
                >
                    <Save className="w-5 h-5" />
                    Salvar Alterações
                </button>
            </div>
        </SettingsLayout >
    );
};