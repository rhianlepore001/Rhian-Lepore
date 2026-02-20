import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '../utils/Logger';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { BrutalButton } from './BrutalButton';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
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
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null });
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
                    <div className="bg-neutral-900 border-4 border-red-600 p-8 max-w-md w-full text-center shadow-[8px_8px_0px_0px_rgba(220,38,38,0.5)]">
                        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-red-500/20">
                            <AlertTriangle className="w-10 h-10 text-red-500" />
                        </div>

                        <h2 className="text-2xl font-bold text-white mb-4 uppercase tracking-wider">
                            Sistema Interrompido
                        </h2>

                        <p className="text-neutral-400 mb-8 font-mono text-sm leading-relaxed">
                            Ocorreu um erro inesperado. Nossa equipe técnica foi notificada automaticamente.
                        </p>

                        {this.state.error && process.env.NODE_ENV === 'development' && (
                            <div className="bg-black/50 p-4 rounded mb-6 text-left overflow-auto max-h-40">
                                <code className="text-red-400 text-xs font-mono">
                                    {this.state.error.toString()}
                                </code>
                            </div>
                        )}

                        <div className="flex justify-center">
                            <button
                                onClick={this.handleReset}
                                className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95 border-2 border-transparent hover:border-black"
                            >
                                <RefreshCcw className="w-4 h-4" />
                                Recarregar Página
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
