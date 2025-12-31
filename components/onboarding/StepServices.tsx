import React, { useState, useEffect } from 'react';
import { Loader2, Plus, Package } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ServiceModal } from '../ServiceModal';

interface StepServicesProps {
    onNext: () => void;
    onBack: () => void;
    accentColor: string;
}

export const StepServices: React.FC<StepServicesProps> = ({ onNext, onBack, accentColor }) => {
    const { user, region } = useAuth();
    const [services, setServices] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const currencySymbol = region === 'BR' ? 'R$' : '€';

    useEffect(() => {
        fetchData();
    }, [user]);

    const fetchData = async () => {
        if (!user) return;

        // Ensure at least one category exists
        const { data: cats } = await supabase.from('service_categories').select('*').eq('user_id', user.id);

        if (!cats || cats.length === 0) {
            const { data: newCat } = await supabase.from('service_categories').insert({
                user_id: user.id,
                name: 'Geral',
                display_order: 0
            }).select();
            setCategories(newCat || []);
        } else {
            setCategories(cats);
        }

        const { data: servs } = await supabase.from('services').select('*').eq('user_id', user.id);
        setServices(servs || []);
        setLoading(false);
    };

    const handleContinue = async () => {
        if (!user) return;
        setSubmitting(true);
        try {
            await supabase.rpc('update_onboarding_step', {
                p_user_id: user.id,
                p_step: 5,
                p_completed: true
            });
            onNext();
        } catch (error) {
            console.error('Error updating step:', error);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-neutral-800/50 rounded-lg p-4 border border-neutral-800">
                <p className="text-neutral-400 text-sm mb-4">
                    Cadastre seus principais serviços. Você pode adicionar mais e organizar categorias depois.
                </p>

                {loading ? (
                    <div className="text-center py-4 text-neutral-500">Carregando...</div>
                ) : services.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-neutral-700 rounded-lg">
                        <Package className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
                        <p className="text-neutral-500 mb-4">Nenhum serviço cadastrado</p>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className={accentColor === 'beauty-neon' ? 'w-full py-4 bg-beauty-neon text-black font-bold rounded-lg hover:bg-beauty-neon/90 transition-colors' : 'w-full py-4 bg-accent-gold text-black font-bold rounded-lg hover:bg-accent-gold/90 transition-colors'}
                        >
                            Adicionar Serviço
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {services.map(service => (
                            <div key={service.id} className="bg-neutral-900 p-3 rounded-lg border border-neutral-800 flex justify-between items-center">
                                <div>
                                    <h4 className="text-white font-bold">{service.name}</h4>
                                    <p className="text-xs text-neutral-400">{currencySymbol} {service.price} • {service.duration_minutes} min</p>
                                </div>
                            </div>
                        ))}
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className={accentColor === 'beauty-neon' ? 'w-full py-3 border border-beauty-neon text-beauty-neon font-bold rounded-lg hover:bg-beauty-neon/10 transition-colors flex items-center justify-center gap-2' : 'w-full py-3 border border-accent-gold text-accent-gold font-bold rounded-lg hover:bg-accent-gold/10 transition-colors flex items-center justify-center gap-2'}
                        >
                            <Plus className="w-4 h-4" />
                            Adicionar Outro
                        </button>
                    </div>
                )}
            </div>

            <div className="flex gap-4 pt-4">
                <button
                    onClick={onBack}
                    className="flex-1 py-4 bg-neutral-800 text-white font-bold rounded-lg hover:bg-neutral-700 transition-colors"
                >
                    Voltar
                </button>
                <button
                    onClick={handleContinue}
                    disabled={submitting || services.length === 0}
                    className={accentColor === 'beauty-neon' ? 'flex-1 py-4 bg-beauty-neon text-black font-bold rounded-lg hover:bg-beauty-neon/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed' : 'flex-1 py-4 bg-accent-gold text-black font-bold rounded-lg hover:bg-accent-gold/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'}
                >
                    {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Finalizar Setup'}
                </button>
            </div>

            {isModalOpen && (
                <ServiceModal
                    categories={categories}
                    allServices={services}
                    onClose={() => setIsModalOpen(false)}
                    onSave={fetchData}
                    accentColor={accentColor}
                />
            )}
        </div>
    );
};
