import React, { useState, useEffect } from 'react';
import { Plus, Package } from 'lucide-react';
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

    return (
        <div className="space-y-6">
            <div className="bg-card rounded-xl p-5 border border-border shadow-sm">
                <p className="text-muted-foreground text-sm mb-5 leading-relaxed">
                    Cadastre seus principais serviços. Você poderá adicionar mais e organizar em categorias posteriormente.
                </p>

                {loading ? (
                    <div className="text-center py-8 text-muted-foreground animate-pulse">Carregando serviços...</div>
                ) : services.length === 0 ? (
                    <div className="text-center py-10 border-2 border-dashed border-border rounded-xl bg-muted/30">
                        <Package className="w-10 h-10 text-muted-foreground/60 mx-auto mb-3" />
                        <p className="text-muted-foreground mb-6 font-medium">Nenhum serviço cadastrado</p>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            id="wizard-add-service"
                            className="w-full max-w-xs mx-auto py-3 bg-primary text-primary-foreground font-bold rounded-lg hover:opacity-90 transition-opacity shadow-sm flex items-center justify-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Adicionar Serviço
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {services.map(service => (
                            <div key={service.id} className="bg-muted/30 p-4 rounded-xl border border-border flex justify-between items-center transition-colors hover:bg-muted/50">
                                <div>
                                    <h4 className="text-foreground font-semibold">{service.name}</h4>
                                    <p className="text-sm text-muted-foreground mt-0.5">{currencySymbol} {service.price} • {service.duration_minutes} min</p>
                                </div>
                            </div>
                        ))}
                        <button
                            onClick={() => setIsModalOpen(true)}
                            id="wizard-add-service"
                            className="w-full py-4 border-2 border-dashed border-border text-muted-foreground font-bold rounded-xl hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2 mt-4 bg-transparent"
                        >
                            <Plus className="w-5 h-5" />
                            Adicionar Novo Serviço
                        </button>
                    </div>
                )}
            </div>

            <div className="flex gap-4 pt-4">
                <button
                    onClick={onBack}
                    className="px-6 py-4 text-muted-foreground hover:text-foreground hover:bg-muted font-bold rounded-xl transition-colors"
                >
                    Voltar
                </button>
                <button
                    onClick={onNext}
                    disabled={services.length === 0}
                    className="flex-1 py-4 font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed bg-primary text-primary-foreground hover:opacity-90 hover:shadow-md"
                >
                    Continuar
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
