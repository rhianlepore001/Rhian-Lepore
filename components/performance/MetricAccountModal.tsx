import React from 'react';
import { Button, Modal } from '../ui';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import type { MetricAccount } from '../../utils/staffPerformanceAccount';

interface MetricAccountModalProps {
    account: MetricAccount;
    onClose: () => void;
}

export const MetricAccountModal: React.FC<MetricAccountModalProps> = ({ account, onClose }) => {
    const { colors, font } = useBrutalTheme();
    return (
        <Modal
            open
            onClose={onClose}
            title={account.title}
            size="md"
            footer={
                <Button variant="secondary" fullWidth onClick={onClose}>
                    Fechar
                </Button>
            }
        >
            <div data-testid="metric-account" className="space-y-6">
                <dl className="space-y-0">
                    {account.lines.map((line) => (
                        <div
                            key={`${line.label}-${line.value}`}
                            className={`flex items-baseline justify-between gap-4 py-2 ${line.emphasize ? `border-t ${colors.divider} mt-1 pt-3` : ''}`}
                        >
                            <dt className={`text-sm ${line.emphasize ? `font-semibold ${colors.text}` : line.muted ? colors.textMuted : colors.textSecondary}`}>
                                {line.label}
                            </dt>
                            <dd
                                className={`${font.mono} text-sm tabular-nums whitespace-nowrap text-right ${
                                    line.emphasize ? `font-bold ${colors.text}` : line.muted ? colors.textMuted : colors.text
                                }`}
                            >
                                {line.value}
                            </dd>
                        </div>
                    ))}
                </dl>
                <div className="space-y-2">
                    <h3 className={`text-sm font-semibold ${colors.text}`}>O que isso quer dizer</h3>
                    <p className={`text-sm leading-relaxed ${colors.textSecondary}`}>{account.meaning}</p>
                </div>
                {account.comparison && (
                    <p className={`text-sm leading-relaxed ${colors.text}`}>{account.comparison}</p>
                )}
            </div>
        </Modal>
    );
};
