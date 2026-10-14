import React from 'react';
import { CANCELLATION_POLICY_NOTES_PREFIX, type CancellationPolicyParts } from '../utils/cancellationPolicyCopy';

interface Props {
    parts: Pick<CancellationPolicyParts, 'policy' | 'notes'>;
    /** Classe do texto (cor/tamanho). */
    className?: string;
    /** Classe extra do rótulo "Observações:". */
    labelClassName?: string;
    'data-testid'?: string;
}

/**
 * Política de cancelamento + "Observações: …" para o cliente.
 * Texto puro: tudo entra como filho de texto do React (escapado), nunca como HTML.
 */
export const CancellationPolicyText: React.FC<Props> = ({ parts, className = '', labelClassName = '', 'data-testid': testId }) => (
    <div className="space-y-2" data-testid={testId}>
        <p className={`whitespace-pre-wrap break-words ${className}`} data-testid={testId ? `${testId}-text` : undefined}>
            {parts.policy}
        </p>
        {parts.notes && (
            <p className={`whitespace-pre-wrap break-words ${className}`} data-testid={testId ? `${testId}-notes` : undefined}>
                <span className={`font-semibold ${labelClassName}`}>{CANCELLATION_POLICY_NOTES_PREFIX}</span>{' '}
                {parts.notes}
            </p>
        )}
    </div>
);
