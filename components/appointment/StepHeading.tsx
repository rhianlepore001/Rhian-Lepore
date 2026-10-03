import React from 'react';

interface StepHeadingProps {
    title: string;
    hint?: string;
    aside?: React.ReactNode;
    /** 'step' = título do passo (h3); 'section' = seção dentro do passo (h4). */
    level?: 'step' | 'section';
    className?: string;
    compact?: boolean;
}

/**
 * Título padrão dos passos do assistente "Novo Atendimento": instrução curta
 * em pt-BR ("Escolha o cliente", "Selecione a data"…), mesmo estilo em todos.
 */
export const StepHeading: React.FC<StepHeadingProps> = ({ title, hint, aside, level = 'step', className = '', compact = false }) => {
    const Tag = level === 'step' ? 'h3' : 'h4';
    const gap = compact ? 'mb-1' : level === 'step' ? 'mb-4' : 'mb-2.5';
    const titleSize = compact ? 'text-sm' : level === 'step' ? 'text-lg' : 'text-[15px]';
    return (
        <div className={`flex items-end justify-between gap-3 ${gap} ${className}`}>
            <div className="min-w-0">
                <Tag className={`${titleSize} font-semibold leading-tight text-theme-text`}>
                    {title}
                </Tag>
                {hint && <p className="text-sm text-theme-textSecondary mt-1">{hint}</p>}
            </div>
            {aside && <div className="shrink-0">{aside}</div>}
        </div>
    );
};
