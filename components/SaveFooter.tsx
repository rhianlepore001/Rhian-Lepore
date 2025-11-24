import React from 'react';
import { Save, Check, Loader2 } from 'lucide-react';

interface SaveFooterProps {
    onSave: () => void;
    saveStatus: 'idle' | 'saving' | 'saved' | 'error';
    hasChanges: boolean;
    accentColor: string;
}

export const SaveFooter: React.FC<SaveFooterProps> = ({
    onSave,
    saveStatus,
    hasChanges,
    accentColor
}) => {
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

    return (
        <>
            {/* Desktop Floating Action Button */}
            <div className="hidden md:block fixed bottom-8 right-8 z-50">
                <button
                    onClick={onSave}
                    disabled={saveStatus === 'saving' || (!hasChanges && saveStatus !== 'saved')}
                    className={`
                        w-16 h-16 flex items-center justify-center rounded-full font-bold shadow-lg transition-all transform hover:scale-105
                        ${!hasChanges && saveStatus !== 'saved'
                            ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                            : `bg-${accentColor} text-black hover:bg-${accentColor}/90`
                        }
                    `}
                    aria-label="Salvar Alterações"
                >
                    {getDesktopIcon()}
                </button>
            </div>

            {/* Mobile Sticky Footer */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-neutral-900/95 backdrop-blur border-t border-neutral-800 z-50">
                <button
                    onClick={onSave}
                    disabled={saveStatus === 'saving' || (!hasChanges && saveStatus !== 'saved')}
                    className={`
                        w-full flex items-center justify-center gap-2 py-3 rounded-lg font-bold transition-all
                        ${!hasChanges && saveStatus !== 'saved'
                            ? 'bg-neutral-800 text-neutral-500'
                            : `bg-${accentColor} text-black`
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