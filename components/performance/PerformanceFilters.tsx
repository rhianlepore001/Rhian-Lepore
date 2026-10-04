import React, { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Button, Modal } from '../ui';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import { PRESETS, type PeriodPreset } from '../../utils/staffPerformanceView';

export interface RosterEntry { id: string; name: string }

interface PerformanceFiltersProps {
    preset: PeriodPreset;
    start: string;
    end: string;
    pro: string | null;
    compare: boolean;
    roster: RosterEntry[];
    tzLabel: string | null;
    showTzOnPage?: boolean;
    onPreset: (preset: Exclude<PeriodPreset, 'personalizado'>) => void;
    onCustom: (start: string, end: string) => void;
    onPro: (pro: string | null) => void;
    onCompare: (compare: boolean) => void;
}

export const PerformanceFilters: React.FC<PerformanceFiltersProps> = (props) => {
    const { colors, font, radius, accent } = useBrutalTheme();
    const [sheetOpen, setSheetOpen] = useState(false);
    const [customOpen, setCustomOpen] = useState(props.preset === 'personalizado');
    const showCustom = customOpen || props.preset === 'personalizado';
    const presetName = props.preset === 'personalizado' ? 'Personalizado' : PRESETS.find((p) => p.id === props.preset)?.label;
    const selectedName = props.pro ? props.roster.find((r) => r.id === props.pro)?.name : null;
    const label = `${font.label} text-xs uppercase tracking-wide ${colors.textMuted}`;
    const field = `min-h-[44px] lg:min-h-[40px] px-3 text-sm ${colors.inputBg} border ${colors.inputBorder} ${radius.input} ${colors.text} focus:outline-none focus:border-[var(--color-input-focus)]`;

    const chip = (id: PeriodPreset, text: string, onClick: () => void) => {
        const active = props.preset === id || (id === 'personalizado' && showCustom && props.preset === 'personalizado');
        return (
            <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={onClick}
                className={`px-3 min-h-[44px] lg:min-h-[36px] text-sm whitespace-nowrap ${radius.button} border transition-colors ${
                    active ? `${accent.border} ${accent.bgDim} ${colors.text} font-semibold` : `border-transparent ${colors.textSecondary} hover:text-theme-text`
                }`}
            >
                {text}
            </button>
        );
    };

    const controls = (stacked: boolean) => (
        <div className={stacked ? 'space-y-5' : 'flex flex-wrap items-end gap-x-5 gap-y-3'}>
            <div className={stacked ? 'space-y-2' : ''}>
                {stacked && <p className={label}>Período</p>}
                <div role="group" aria-label="Período" className={`flex flex-wrap gap-1 ${stacked ? '' : `p-1 ${colors.surface} ${radius.button}`}`}>
                    {PRESETS.map((p) => chip(p.id, p.label, () => { setCustomOpen(false); props.onPreset(p.id); }))}
                    {chip('personalizado', 'Personalizado', () => setCustomOpen(true))}
                </div>
            </div>
            {showCustom && (
                <div className="flex flex-wrap items-end gap-3">
                    <label className="flex flex-col gap-1.5">
                        <span className={label}>De</span>
                        <input type="date" value={props.start} max={props.end} onChange={(e) => e.target.value && props.onCustom(e.target.value, props.end)} className={field} />
                    </label>
                    <label className="flex flex-col gap-1.5">
                        <span className={label}>Até</span>
                        <input type="date" value={props.end} min={props.start} onChange={(e) => e.target.value && props.onCustom(props.start, e.target.value)} className={field} />
                    </label>
                </div>
            )}
            <label className={`flex flex-col gap-1.5 ${stacked ? '' : 'min-w-[200px]'}`}>
                <span className={label}>Colaborador</span>
                <select value={props.pro ?? ''} onChange={(e) => props.onPro(e.target.value || null)} className={field}>
                    <option value="">Toda a equipe</option>
                    {props.roster.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
            </label>
            <label className={`inline-flex items-center gap-2.5 min-h-[44px] lg:min-h-[40px] text-sm ${colors.textSecondary} cursor-pointer select-none`}>
                <input
                    type="checkbox"
                    checked={props.compare}
                    onChange={(e) => props.onCompare(e.target.checked)}
                    className="w-4 h-4 accent-[var(--color-accent)]"
                />
                Comparar com o período anterior
            </label>
        </div>
    );

    return (
        <div>
            <div className="hidden lg:block">{controls(false)}</div>
            <div className="lg:hidden">
                <Button variant="outline" size="sm" fullWidth icon={<SlidersHorizontal className="w-4 h-4" />} className="min-h-[44px] justify-start" onClick={() => setSheetOpen(true)}>
                    {`Filtrar · ${presetName}${selectedName ? ` · ${selectedName}` : ''}`}
                </Button>
            </div>
            {props.showTzOnPage && props.tzLabel && (
                <p className={`hidden lg:block mt-2 text-xs ${colors.textMuted}`}>{props.tzLabel}</p>
            )}
            {sheetOpen && (
                <Modal
                    open
                    onClose={() => setSheetOpen(false)}
                    title="Filtrar"
                    size="md"
                    footer={<Button variant="primary" fullWidth onClick={() => setSheetOpen(false)}>Ver resultados</Button>}
                >
                    {controls(true)}
                    {props.tzLabel && <p className={`mt-5 text-sm ${colors.textMuted}`}>{props.tzLabel}</p>}
                </Modal>
            )}
        </div>
    );
};
