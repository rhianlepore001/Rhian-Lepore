import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Package, ArrowRight, ArrowLeft, Lightbulb } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useBrutalTheme, ThemeVariant } from '../../hooks/useBrutalTheme';
import { ServiceModal } from '../ServiceModal';
import { ensureCallerProfile } from '@/services/onboarding';
import { useToast } from '../ui/Toast';
import { mapError, formatUserFacingError } from '../../utils/mapError';

interface StepServicesProps {
    onNext: () => void;
    onBack: () => void;
    accentColor: string;
}

export const StepServices: React.FC<StepServicesProps> = ({ onNext, onBack, accentColor }) => {
    const { user, companyId, region } = useAuth();
    const { showToast } = useToast();
    const [tenantId, setTenantId] = useState<string | null>(companyId ?? user?.id ?? null);
    const [services, setServices] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const currencySymbol = region === 'BR' ? 'R$' : '€';

    const themeVariant: ThemeVariant = accentColor === 'beauty-neon' ? 'beauty' : 'barber';
    const { accent, classes } = useBrutalTheme({ override: themeVariant });

    const fetchData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            // Garante profiles.id antes de qualquer insert (FK services_user_id_fkey).
            const ensuredTenantId = await ensureCallerProfile();
            const effectiveTenantId = companyId || ensuredTenantId || user.id;
            setTenantId(effectiveTenantId);

            const { data: cats, error: catsError } = await supabase
                .from('service_categories')
                .select('*')
                .eq('user_id', effectiveTenantId);
            if (catsError) throw catsError;

            if (!cats || cats.length === 0) {
                const { data: newCat, error: insertCatError } = await supabase
                    .from('service_categories')
                    .insert({
                        user_id: effectiveTenantId,
                        name: 'Geral',
                        display_order: 0,
                    })
                    .select();
                if (insertCatError) throw insertCatError;
                setCategories(newCat || []);
            } else {
                setCategories(cats);
            }

            const { data: servs, error: servsError } = await supabase
                .from('services')
                .select('*')
                .eq('user_id', effectiveTenantId);
            if (servsError) throw servsError;
            setServices(servs || []);
        } catch (error: unknown) {
            const ui = mapError(error, 'Não foi possível carregar os serviços. Tente de novo.');
            showToast(formatUserFacingError(ui), 'error');
            setServices([]);
        } finally {
            setLoading(false);
        }
    }, [user, companyId, showToast]);

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    const hasServices = services.length > 0;

    return (
        <div className="space-y-6">
            <p className="text-muted-foreground text-sm leading-relaxed">
                Cadastre seus principais serviços. Você poderá adicionar mais e organizar em categorias posteriormente.
            </p>

            {loading ? (
                <div className="text-center py-10 text-muted-foreground animate-pulse">Carregando serviços...</div>
            ) : !hasServices ? (
                <div className="text-center py-10 md:py-12 border-2 border-dashed border-border rounded-xl bg-muted/20">
                    <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 ${accent.bgDim}`}>
                        <Package className={`w-7 h-7 ${accent.text}`} />
                    </div>
                    <p className="text-foreground font-semibold mb-1">Nenhum serviço cadastrado</p>
                    <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">
                        Adicione pelo menos um serviço para ativar sua agenda online.
                    </p>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        id="wizard-add-service"
                        className={`inline-flex items-center justify-center gap-2 px-6 py-3 font-semibold text-sm rounded-xl hover:opacity-90 transition-opacity shadow-sm ${classes.buttonPrimary}`}
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
                        className="w-full py-3.5 border-2 border-dashed border-border text-muted-foreground font-semibold text-sm rounded-xl hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2 mt-2 bg-transparent"
                    >
                        <Plus className="w-4 h-4" />
                        Adicionar Novo Serviço
                    </button>
                </div>
            )}

            {/* Hint quando não tem serviços */}
            {!hasServices && !loading && (
                <div className="flex items-start gap-2.5">
                    <Lightbulb className="w-4 h-4 text-muted-foreground/70 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        Cadastre pelo menos um serviço para continuar. Exemplos: Corte, Barba, Hidratação.
                    </p>
                </div>
            )}

            <div className="flex gap-3 pt-2">
                <button
                    onClick={onBack}
                    className="px-6 py-3.5 text-sm font-semibold text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted rounded-xl transition-colors flex items-center gap-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Voltar
                </button>
                <button
                    onClick={onNext}
                    disabled={!hasServices}
                    className={`flex-1 py-3.5 text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] ${classes.buttonPrimary}`}
                >
                    Continuar
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>

            {isModalOpen && tenantId && (
                <ServiceModal
                    companyId={tenantId}
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
