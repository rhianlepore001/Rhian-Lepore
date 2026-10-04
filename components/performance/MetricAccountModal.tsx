import React from 'react';
import { Button, Modal } from '../ui';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import type { MetricAccount } from '../../utils/staffPerformanceAccount';

interface MetricAccountModalProps {
    account: MetricAccount;
    onClose: () => void;
}

function sentence(text: string): string {
    const trimmed = text.trim();
    if (!trimmed) return trimmed;
    const capped = trimmed.charAt(0).toLocaleUpperCase('pt-BR') + trimmed.slice(1);
    return /[.!?]$/.test(capped) ? capped : `${capped}.`;
}

export const MetricAccountModal: React.FC<MetricAccountModalProps> = ({ account, onClose }) => {
    const { colors, font } = useBrutalTheme();
    return (
        <Modal
            open
            onClose={onClose}
            title={account.title}
            subtitle={account.period}
            size="md"
            footer={
                <Button variant="secondary" fullWidth onClick={onClose}>
                    Fechar
                </Button>
            }
        >
            <div data-testid="metric-account" className="space-y-6">
                <dl>
                    {account.lines.map((line) => {
                        if (line.kind === 'note') {
                            return (
                                <p key={line.label} className={`pt-3 text-sm leading-snug ${colors.textMuted}`}>
                                    {line.label}
                                </p>
                            );
                        }
                        if (line.kind === 'formula') {
                            return (
                                <div key={`${line.label}-${line.value}`} className={`mt-1 pt-3 border-t ${colors.divider}`}>
                                    <dt className={`text-sm leading-snug ${colors.textSecondary}`}>
                                        <span className="block">{line.numerator}</span>
                                        <span className="block">÷ {line.denominator}</span>
                                    </dt>
                                    <dd className={`mt-2 pt-2 border-t ${colors.divider} flex items-baseline justify-end`}>
                                        <span className={`${font.mono} text-sm tabular-nums font-bold ${colors.text}`}>
                                            = {line.value}
                                        </span>
                                    </dd>
                                </div>
                            );
                        }
                        return (
                            <div
                                key={`${line.label}-${line.value}`}
                                className={`flex items-start justify-between gap-4 py-2 ${line.emphasize ? `border-t ${colors.divider} mt-1 pt-3` : ''}`}
                            >
                                <dt className={`text-sm leading-snug min-w-0 ${line.emphasize ? `font-semibold ${colors.text}` : line.muted ? colors.textMuted : colors.textSecondary}`}>
                                    {line.label}
                                </dt>
                                <dd
                                    className={`shrink-0 ${font.mono} text-sm tabular-nums whitespace-nowrap text-right ${
                                        line.emphasize ? `font-bold ${colors.text}` : line.muted ? colors.textMuted : colors.text
                                    }`}
                                >
                                    {line.value}
                                </dd>
                            </div>
                        );
                    })}
                </dl>
                <div className="space-y-2">
                    <h3 className={`text-sm font-semibold ${colors.text}`}>O que isso quer dizer</h3>
                    <p className={`text-sm leading-relaxed ${colors.textSecondary}`}>{account.meaning}</p>
                </div>
                {account.comparison && (
                    <p className={`text-sm leading-relaxed ${colors.text}`}>
                        {account.comparisonCaption && (
                            <span className={colors.textMuted}>{account.comparisonCaption}: </span>
                        )}
                        <span>{account.comparisonCaption ? account.comparison : sentence(account.comparison)}</span>
                    </p>
                )}
            </div>
        </Modal>
    );
};
