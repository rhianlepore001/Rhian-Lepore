import React, { useState } from 'react';
import { SettingsLayout } from '../../components/SettingsLayout';
import { Save, HelpCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useEffect } from 'react';

export const PublicBookingSettings: React.FC = () => {
    const { user, userType } = useAuth();
    const [loading, setLoading] = useState(true);
    const [enableUpsells, setEnableUpsells] = useState(false);
    const [enableProfessionalSelection, setEnableProfessionalSelection] = useState(false);
    const [publicBookingEnabled, setPublicBookingEnabled] = useState(true);
    const [leadTimeHours, setLeadTimeHours] = useState(2);
    const [maxBookingsPerDay, setMaxBookingsPerDay] = useState<number | null>(null);

    useEffect(() => {
        fetchSettings();
    }, [user]);

    const fetchSettings = async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase
                .from('business_settings')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (error) throw error;
            if (data) {
                setEnableUpsells(data.enable_upsells ?? false);
                setEnableProfessionalSelection(data.enable_professional_selection ?? true);
                setPublicBookingEnabled(data.public_booking_enabled ?? true);
                setLeadTimeHours(data.lead_time_hours ?? 2);
                setMaxBookingsPerDay(data.max_bookings_per_day);
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
                .update({
                    enable_upsells: enableUpsells,
                    enable_professional_selection: enableProfessionalSelection,
                    public_booking_enabled: publicBookingEnabled,
                    lead_time_hours: leadTimeHours,
                    max_bookings_per_day: maxBookingsPerDay
                })
                .eq('user_id', user.id);

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
                    Agendamento Público
                </h1>
                <p className="text-sm md:text-base text-neutral-400 mb-4 md:mb-8">
                    Configure como clientes agendam online
                </p>

                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 md:p-6 mb-4 md:mb-6">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                            <h3 className="text-white font-bold text-base md:text-lg mb-1 md:mb-2">
                                Agendamento Público
                            </h3>
                            <p className="text-neutral-400 text-xs md:text-sm">
                                Link público de agendamento
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
                    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 md:p-6">
                        <div className="flex items-start justify-between gap-4 mb-3 md:mb-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1 md:mb-2">
                                    <h3 className="text-white font-bold text-base md:text-lg">
                                        Upsells Inteligentes
                                    </h3>
                                    <button className="text-neutral-400 hover:text-white">
                                        <HelpCircle className="w-3 h-3 md:w-4 md:h-4" />
                                    </button>
                                </div>
                                <p className="text-neutral-400 text-xs md:text-sm mb-2 md:mb-3">
                                    Sugere serviços complementares
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
                            <div className="mt-3 md:mt-4 p-3 md:p-4 bg-neutral-800 rounded-lg border border-neutral-700">
                                <p className="text-xs md:text-sm text-neutral-300">
                                    ✅ <strong>Ativado!</strong> Configure em Serviços.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 md:p-6">
                        <div className="flex items-start justify-between gap-4 mb-3 md:mb-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1 md:mb-2">
                                    <h3 className="text-white font-bold text-base md:text-lg">
                                        Seleção de Profissional
                                    </h3>
                                    <button className="text-neutral-400 hover:text-white">
                                        <HelpCircle className="w-3 h-3 md:w-4 md:h-4" />
                                    </button>
                                </div>
                                <p className="text-neutral-400 text-xs md:text-sm mb-2 md:mb-3">
                                    Clientes escolhem o profissional
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
                            <div className="mt-3 md:mt-4 p-3 md:p-4 bg-neutral-800 rounded-lg border border-neutral-700">
                                <p className="text-xs md:text-sm text-neutral-300">
                                    ✅ <strong>Ativado!</strong> Adicione equipe.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    className={`w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-${accentColor} hover:bg-${accentColor}/90 text-black font-bold rounded-lg transition-all`}
                >
                    <Save className="w-5 h-5" />
                    Salvar
                </button>
            </div>
        </SettingsLayout>
    );
};
