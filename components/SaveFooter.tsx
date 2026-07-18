import React from 'react';
import { Save, Check, Loader2 } from 'lucide-react';
import { useBrutalTheme } from '../hooks/useBrutalTheme';

interface SaveFooterProps {
    onSave: () => void;
    saveStatus: 'idle' | 'saving' | 'saved' | 'error';
    hasChanges: boolean;
}

export const SaveFooter: React.FC<SaveFooterProps> = ({
    onSave,
    saveStatus,
    hasChanges,
}) => {
    const { accent, classes } = useBrutalTheme();

    const getDesktopIcon = () => {
        switch (saveStatus) {
            case 'saving':
                return <Loader2 className="w-6 h-6 animate-spin" />;
            case 'saved':
                return <Check className="w-6 h-6" />;
            default:
                return <Save className="w-6 h-6" />;
        }
    };

    const getMobileButtonContent = () => {
        switch (saveStatus) {
            case 'saving':
                return (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Salvando...</span>
                    </>
                );
            case 'saved':
                return (
                    <>
                        <Check className="w-5 h-5" />
                        <span>Salvo!</span>
                    </>
                );
            case 'error':
                return (
                    <>
                        <Save className="w-5 h-5" />
                        <span>Tentar Novamente</span>
                    </>
                );
            default:
                return (
                    <>
                        <Save className="w-5 h-5" />
                        <span>Salvar Alterações</span>
                    </>
                );
        }
    };

    const disabled = saveStatus === 'saving' || (!hasChanges && saveStatus !== 'saved');

    return (
        <>
            {/* Desktop Floating Action Button */}
            <div className="hidden md:block fixed bottom-8 right-8 z-50">
                <button
                    onClick={onSave}
                    disabled={disabled}
                    className={`
                        w-16 h-16 flex items-center justify-center rounded-full font-bold shadow-lg transition-all transform hover:scale-105
                        ${disabled
                            ? 'bg-theme-surface text-[var(--color-text-muted)] cursor-not-allowed'
                            : `${accent.bg} text-[var(--color-bg)] hover:brightness-110`
                        }
                    `}
                    aria-label="Salvar Alterações"
                >
                    {getDesktopIcon()}
                </button>
            </div>

            {/* Mobile Sticky Footer */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-theme-card/95 backdrop-blur border-t border-[var(--color-divider)] z-50">
                <button
                    onClick={onSave}
                    disabled={disabled}
                    className={`
                        w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all
                        ${disabled
                            ? 'bg-theme-surface text-[var(--color-text-muted)]'
                            : `${accent.bg} text-[var(--color-bg)]`
                        }
                    `}
                >
                    {getMobileButtonContent()}
                </button>
            </div>

            {/* Spacer for mobile footer */}
            <div className="h-20 md:hidden" />
        </>
    );
};
