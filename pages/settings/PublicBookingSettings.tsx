import React, { useState, useEffect } from 'react';
import { SettingsLayout } from '../../components/SettingsLayout';
import { Save, HelpCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { PublicLinkCard } from '../../components/PublicLinkCard';
import { BrutalCard } from '../../components/BrutalCard';
import { BrutalButton } from '../../components/BrutalButton';

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

    if (loading) return (
        <SettingsLayout>
            <div className="p-8 text-center text-neutral-400">Carregando agendamento...</div>
        </SettingsLayout>
    );

    return (
        <SettingsLayout>
            <div className="max-w-4xl space-y-8 pb-20 md:pb-0">
                {/* Cabeçalho redundante removido (gerenciado pelo SettingsLayout) */}

                <PublicLinkCard businessSlug={businessSlug} publicBookingEnabled={publicBookingEnabled} />

                <BrutalCard noPadding>
                    <div className="p-6 md:p-8 flex items-start justify-between gap-6">
                        <div className="flex-1">
                            <h3 className="font-bold text-lg md:text-xl mb-2 text-white">
                                Ativar Reservas Online
                            </h3>
                            <p className="text-neutral-400 text-sm leading-relaxed">
                                Seus clientes podem marcar horário através do seu link de reserva personalizado.
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-1">
                            <input
                                type="checkbox"
                                checked={publicBookingEnabled}
                                onChange={(e) => setPublicBookingEnabled(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className={`
                                w-12 h-6 md:w-14 md:h-7 bg-white/5 border border-white/10 peer-focus:outline-none rounded-full peer 
                                peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] 
                                after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full 
                                after:h-4 after:w-4 md:after:h-5 md:after:w-5 after:transition-all 
                                peer-checked:bg-gradient-to-r ${isBeauty ? 'from-pink-500 to-purple-600' : 'from-accent-gold to-yellow-600'}
                                shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]
                            `}></div>
                        </label>
                    </div>
                </BrutalCard>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <BrutalCard
                        title={
                            <div className="flex items-center gap-2">
                                <span className="text-sm">Upsells Inteligentes</span>
                                <HelpCircle className="w-4 h-4 text-neutral-500" />
                            </div>
                        }
                    >
                        <div className="space-y-4">
                            <p className="text-neutral-400 text-xs leading-relaxed">
                                Sugere serviços complementares para aumentar o ticket médio automaticamente.
                            </p>
                            <div className={`inline-flex items-center px-3 py-1.5 rounded-xl bg-${accentColor}/5 border border-${accentColor}/10 text-${accentColor} text-[10px] font-bold uppercase tracking-wider`}>
                                💰 +R$ 1.200/mês méd.
                            </div>
                            <div className="flex justify-end pt-2">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={enableUpsells}
                                        onChange={(e) => setEnableUpsells(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className={`w-11 h-6 bg-white/5 border border-white/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-${accentColor}`}></div>
                                </label>
                            </div>
                        </div>
                    </BrutalCard>

                    <BrutalCard
                        title={
                            <div className="flex items-center gap-2">
                                <span className="text-sm">Profissionais</span>
                                <HelpCircle className="w-4 h-4 text-neutral-500" />
                            </div>
                        }
                    >
                        <div className="space-y-4">
                            <p className="text-neutral-400 text-xs leading-relaxed">
                                Permite que os clientes escolham com quem desejam realizar o procedimento.
                            </p>
                            <div className={`inline-flex items-center px-3 py-1.5 rounded-xl bg-green-500/5 border border-green-500/10 text-green-400 text-[10px] font-bold uppercase tracking-wider`}>
                                📈 +114% Retenção
                            </div>
                            <div className="flex justify-end pt-2">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={enableProfessionalSelection}
                                        onChange={(e) => setEnableProfessionalSelection(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className={`w-11 h-6 bg-white/5 border border-white/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-${accentColor}`}></div>
                                </label>
                            </div>
                        </div>
                    </BrutalCard>
                </div>

                <BrutalCard title="Automação e Lembretes">
                    <div className="space-y-8 py-2">
                        <div className="flex items-center justify-between gap-6">
                            <div>
                                <h4 className="text-white text-sm font-bold mb-1">Lembretes por E-mail</h4>
                                <p className="text-neutral-500 text-xs">Aviso automático 24h antes do serviço.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={enableEmailReminders}
                                    onChange={(e) => setEnableEmailReminders(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className={`w-11 h-6 bg-white/5 border border-white/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-${accentColor}`}></div>
                            </label>
                        </div>

                        <div className="flex items-center justify-between gap-6">
                            <div>
                                <h4 className="text-white text-sm font-bold mb-1">Reagendamento Autônomo</h4>
                                <p className="text-neutral-500 text-xs">Cliente reagenda sozinho via link de e-mail.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={enableSelfRescheduling}
                                    onChange={(e) => setEnableSelfRescheduling(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className={`w-11 h-6 bg-white/5 border border-white/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-${accentColor}`}></div>
                            </label>
                        </div>
                    </div>
                </BrutalCard>

                <div className="flex justify-end pt-4">
                    <BrutalButton
                        onClick={handleSave}
                        className="w-full md:w-auto min-w-[200px]"
                    >
                        <Save className="w-5 h-5 mr-2" />
                        Salvar Alterações
                    </BrutalButton>
                </div>
            </div>
        </SettingsLayout >
    );
};
