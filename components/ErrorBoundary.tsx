import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '../utils/Logger';
import { captureRenderError } from '../lib/autoBugCapture';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { clearPwaCaches } from '../utils/lazyWithChunkReload';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

function ErrorFallback({ error, onReset }: { error: Error | null; onReset: () => void }) {
    return (
            <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-4">
            <div className="bg-[var(--color-card)] border-4 border-[var(--color-danger-border)] p-8 max-w-md w-full text-center shadow-[8px_8px_0px_0px_rgba(220,38,38,0.5)]">
                <div className="w-20 h-20 bg-[var(--color-danger-bg)] rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-[var(--color-danger-border)]">
                    <AlertTriangle className="w-10 h-10 text-[var(--color-danger)]" />
                </div>

                <h2 className="text-2xl font-bold text-[var(--color-text)] mb-4 uppercase tracking-wider">
                    Sistema Interrompido
                </h2>

                <p className="text-[var(--color-text-muted)] mb-8 font-mono text-sm leading-relaxed">
                    Ocorreu um erro inesperado. Nossa equipe técnica foi notificada automaticamente.
                </p>

                {error && process.env.NODE_ENV === 'development' && (
                    <div className="bg-[var(--color-bg)]/50 p-4 rounded mb-6 text-left overflow-auto max-h-40">
                        <code className="text-[var(--color-danger)] text-xs font-mono">
                            {error.toString()}
                        </code>
                    </div>
                )}

                <div className="flex justify-center">
                    <button
                        type="button"
                        onClick={onReset}
                        className="inline-flex items-center gap-2 uppercase tracking-wider px-6 py-3 min-h-[52px] bg-[var(--color-danger)] text-[var(--color-on-danger)] font-bold rounded-lg"
                    >
                        <RefreshCcw className="w-4 h-4" />
                        Recarregar Página
                    </button>
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
        void (async () => {
            await clearPwaCaches();
            window.location.reload();
        })();
    };

    public render() {
        if (this.state.hasError) {
            return <ErrorFallback error={this.state.error} onReset={this.handleReset} />;
        }

        return this.props.children;
    }
}
