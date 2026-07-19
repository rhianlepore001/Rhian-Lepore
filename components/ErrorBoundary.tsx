import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '../utils/Logger';
import { captureRenderError } from '../lib/autoBugCapture';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { Button } from './ui/Button';
import { useBrutalTheme, type ThemeVariant } from '../hooks/useBrutalTheme';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

function ErrorFallback({ error, onReset }: { error: Error | null; onReset: () => void }) {
    const { colors, font, status } = useBrutalTheme({ override: 'barber' as ThemeVariant });

    return (
            <div className={`min-h-screen ${colors.bg} flex items-center justify-center p-4`}>
            <div className={`${colors.card} ${colors.border} border-4 ${status.dangerBorder} p-8 max-w-md w-full text-center shadow-[8px_8px_0px_0px_rgba(220,38,38,0.5)]`}>
                <div className={`w-20 h-20 ${status.dangerBg} rounded-full flex items-center justify-center mx-auto mb-6 border-2 ${status.dangerBorder}`}>
                    <AlertTriangle className={`w-10 h-10 ${status.danger}`} />
                </div>

                <h2 className={`text-2xl font-bold ${colors.text} mb-4 uppercase tracking-wider`}>
                    Sistema Interrompido
                </h2>

                <p className={`${colors.textSecondary} mb-8 ${font.mono} text-sm leading-relaxed`}>
                    Ocorreu um erro inesperado. Nossa equipe técnica foi notificada automaticamente.
                </p>

                {error && process.env.NODE_ENV === 'development' && (
                    <div className="bg-[var(--color-bg)]/50 p-4 rounded mb-6 text-left overflow-auto max-h-40">
                        <code className={`${status.danger} text-xs font-mono`}>
                            {error.toString()}
                        </code>
                    </div>
                )}

                <div className="flex justify-center">
                    <Button
                        variant="danger"
                        size="lg"
                        onClick={onReset}
                        icon={<RefreshCcw className="w-4 h-4" />}
                        className="uppercase tracking-wider"
                    >
                        Recarregar Página
                    </Button>
                </div>
            </div>
        </div>
    );
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        logger.error('Uncaught Error in React Component', error, {
            componentStack: errorInfo.componentStack
        });
        // Registra automaticamente como bug (crash de tela → o agente classifica o nível).
        captureRenderError(error, errorInfo.componentStack);
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null });
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            return <ErrorFallback error={this.state.error} onReset={this.handleReset} />;
        }

        return this.props.children;
    }
}
