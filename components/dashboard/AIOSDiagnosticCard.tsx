import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Sparkles, TrendingUp, Users, ArrowRight } from 'lucide-react';
import { useAIOSDiagnostic } from '../../hooks/useAIOSDiagnostic';
import { useAuth } from '../../contexts/AuthContext';
import { useBrutalTheme, type ThemeVariant } from '../../hooks/useBrutalTheme';
import { formatCurrency } from '../../utils/formatters';

interface AIOSDiagnosticCardProps {
    isBeauty?: boolean;
}

export const AIOSDiagnosticCard: React.FC<AIOSDiagnosticCardProps> = ({ isBeauty }) => {
    const { aiosEnabled, region } = useAuth();
    const { diagnostic, loading } = useAIOSDiagnostic();
    const { colors, accent, font } = useBrutalTheme({ override: isBeauty ? 'beauty' as ThemeVariant : 'barber' as ThemeVariant });

    if (!aiosEnabled || loading || !diagnostic || diagnostic.recoverable_revenue <= 0) {
        return null;
    }

    return (
        <div className="animate-in fade-in zoom-in duration-500 mb-6">
            <Card
                variant="elevated"
                id="aios-diagnostic-alert"
                className={`border-2 ${accent.borderDim} ${accent.shadow}`}
                noPadding
            >
                <div className="p-4 md:p-6 flex flex-col md:flex-row items-center gap-6">
                    <div className={`${accent.bg} p-4 rounded-xl text-[var(--color-bg)]`}>
                        <Sparkles className="w-8 h-8" />
                    </div>

                    <div className="flex-1 text-center md:text-left">
                        <h3 className={`text-xl md:text-2xl ${font.heading} ${colors.text} mb-1 flex items-center justify-center md:justify-start gap-2`}>
                            Oportunidades Ativas
                            <span className={`text-[10px] ${font.mono} px-2 py-0.5 ${colors.surface} rounded uppercase tracking-widest opacity-70`}>Inteligência AgendiX</span>
                        </h3>
                        <p className={`${colors.textSecondary} text-sm md:text-base max-w-xl`}>
                            Detectamos <span className={`${accent.text} font-bold`}>{diagnostic.at_risk_clients.length} clientes habituais</span> que não retornam há mais de 30 dias.
                            Você está deixando de ganhar aproximadamente <span className={`${colors.text} font-bold`}>{formatCurrency(diagnostic.recoverable_revenue, region)}</span> este mês.
                        </p>
                    </div>

                    <Button
                        variant="primary"
                        size="lg"
                        iconRight={<ArrowRight className="w-4 h-4" />}
                        fullWidth
                        className="md:w-auto"
                        onClick={() => window.location.href = '/#/clientes'}
                    >
                        Recuperar Agora
                    </Button>
                </div>

                <div className={`${colors.surface} p-3 flex justify-around border-t ${colors.divider}`}>
                    <div className={`flex items-center gap-2 text-[10px] ${font.mono} uppercase tracking-tighter ${colors.textSecondary}`}>
                        <Users className="w-3 h-3" />
                        <span>{diagnostic.at_risk_clients.length} clientes para chamar de volta</span>
                    </div>
                    <div className={`flex items-center gap-2 text-[10px] ${font.mono} uppercase tracking-tighter ${colors.textSecondary}`}>
                        <TrendingUp className="w-3 h-3" />
                        <span>Gasto por visita: {formatCurrency(diagnostic.recoverable_revenue / diagnostic.at_risk_clients.length, region)}</span>
                    </div>
                </div>
            </Card>
        </div>
    );
};
