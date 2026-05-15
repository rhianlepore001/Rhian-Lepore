import React from 'react';
import { Copy, Plus, X } from 'lucide-react';
import { useBrutalTheme } from '../hooks/useBrutalTheme';
import { SettingsSwitch } from './SettingsSwitch';

interface TimeBlock {
    start: string;
    end: string;
}

interface DayHours {
    isOpen: boolean;
    blocks: TimeBlock[];
}

interface BusinessHoursEditorProps {
    hours: Record<string, DayHours>;
    onChange: (hours: Record<string, DayHours>) => void;
}

const DAYS = [
    { key: 'mon', label: 'Segunda-feira', short: 'Seg' },
    { key: 'tue', label: 'Terça-feira', short: 'Ter' },
    { key: 'wed', label: 'Quarta-feira', short: 'Qua' },
    { key: 'thu', label: 'Quinta-feira', short: 'Qui' },
    { key: 'fri', label: 'Sexta-feira', short: 'Sex' },
    { key: 'sat', label: 'Sábado', short: 'Sáb' },
    { key: 'sun', label: 'Domingo', short: 'Dom' },
];

type PresetType = 'weekday_9_18' | 'weekday_9_21_lunch' | 'saturday_9_14' | 'saturday_9_18_lunch';

export const BusinessHoursEditor: React.FC<BusinessHoursEditorProps> = ({
    hours,
    onChange,
}) => {
    const { accent, colors, classes } = useBrutalTheme();

    const getDay = (dayKey: string): DayHours => {
        return hours[dayKey] || { isOpen: false, blocks: [] };
    };

    const toggleDay = (dayKey: string) => {
        const currentDay = getDay(dayKey);
        const newIsOpen = !currentDay.isOpen;
        const newBlocks = newIsOpen && currentDay.blocks.length === 0
            ? [{ start: '09:00', end: '18:00' }]
            : currentDay.blocks;

        onChange({
            ...hours,
            [dayKey]: { ...currentDay, isOpen: newIsOpen, blocks: newBlocks }
        });
    };

    const updateBlock = (dayKey: string, blockIndex: number, field: 'start' | 'end', value: string) => {
        const currentDay = getDay(dayKey);
        const newBlocks = [...currentDay.blocks];
        newBlocks[blockIndex] = { ...newBlocks[blockIndex], [field]: value };
        onChange({ ...hours, [dayKey]: { ...currentDay, blocks: newBlocks } });
    };

    const addBlock = (dayKey: string) => {
        const currentDay = getDay(dayKey);
        onChange({
            ...hours,
            [dayKey]: { ...currentDay, blocks: [...currentDay.blocks, { start: '13:00', end: '18:00' }] }
        });
    };

    const removeBlock = (dayKey: string, blockIndex: number) => {
        const currentDay = getDay(dayKey);
        const newBlocks = currentDay.blocks.filter((_, i) => i !== blockIndex);
        onChange({ ...hours, [dayKey]: { ...currentDay, blocks: newBlocks } });
    };

    const copyFromPreviousDay = (dayKey: string) => {
        const dayIndex = DAYS.findIndex(d => d.key === dayKey);
        if (dayIndex === 0) return;
        const previousDayKey = DAYS[dayIndex - 1].key;
        const previousDay = getDay(previousDayKey);
        onChange({ ...hours, [dayKey]: { ...previousDay } });
    };

    const applyPreset = (presetType: PresetType) => {
        const newHours = { ...hours };
        const daysToApply = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

        daysToApply.forEach(day => {
            newHours[day] = { isOpen: false, blocks: [] };

            if (presetType === 'weekday_9_18' && day !== 'sat' && day !== 'sun') {
                newHours[day] = { isOpen: true, blocks: [{ start: '09:00', end: '18:00' }] };
            } else if (presetType === 'weekday_9_21_lunch' && day !== 'sat' && day !== 'sun') {
                newHours[day] = {
                    isOpen: true,
                    blocks: [
                        { start: '09:00', end: '12:30' },
                        { start: '13:30', end: '21:00' }
                    ]
                };
            } else if (presetType === 'saturday_9_14' && day === 'sat') {
                newHours[day] = { isOpen: true, blocks: [{ start: '09:00', end: '14:00' }] };
            } else if (presetType === 'saturday_9_18_lunch' && day === 'sat') {
                newHours[day] = {
                    isOpen: true,
                    blocks: [
                        { start: '09:00', end: '12:30' },
                        { start: '13:30', end: '18:00' }
                    ]
                };
            }
        });

        onChange(newHours);
    };

    const presets: { id: PresetType; label: string }[] = [
        { id: 'weekday_9_21_lunch', label: 'Seg-Sex 9-21h c/ Almoço' },
        { id: 'weekday_9_18', label: 'Seg-Sex 9-18h (Direto)' },
        { id: 'saturday_9_14', label: 'Sáb 9-14h' },
        { id: 'saturday_9_18_lunch', label: 'Sáb 9-18h c/ Almoço' },
    ];

    return (
        <div className="space-y-5">
            {/* Quick Presets */}
            <div className="flex flex-wrap gap-2">
                {presets.map(preset => (
                    <button
                        key={preset.id}
                        onClick={() => applyPreset(preset.id)}
                        className={`
                            px-3 py-1.5 text-xs md:text-sm rounded-xl border transition-all
                            ${colors.inputBg} ${colors.border} ${colors.textSecondary}
                            hover:${colors.text} hover:bg-white/[0.06]
                            active:scale-[0.97]
                        `}
                    >
                        {preset.label}
                    </button>
                ))}
            </div>

            {/* Days */}
            <div className="space-y-3">
                {DAYS.map((day, index) => {
                    const dayData = getDay(day.key);
                    const isOpen = dayData.isOpen;

                    return (
                        <div
                            key={day.key}
                            className={`
                                rounded-xl border transition-all duration-200
                                ${isOpen ? `${colors.inputBg} ${colors.border}` : `${colors.inputBg} ${colors.border} opacity-70`}
                            `}
                        >
                            {/* Day Header */}
                            <div className="flex items-center justify-between p-3 md:p-4">
                                <div className="flex items-center gap-3 md:gap-4">
                                    <span className={`${colors.text} font-medium text-sm md:text-base w-14 md:w-24`}>
                                        {day.short}
                                    </span>
                                    <SettingsSwitch
                                        checked={dayData.isOpen}
                                        onChange={() => toggleDay(day.key)}
                                        size="md"
                                        ariaLabel={`${day.label} aberto`}
                                    />
                                    <span className={`text-xs md:text-sm ${isOpen ? colors.textSecondary : colors.textMuted}`}>
                                        {isOpen ? 'Aberto' : 'Fechado'}
                                    </span>
                                </div>

                                {index > 0 && (
                                    <button
                                        onClick={() => copyFromPreviousDay(day.key)}
                                        className={`
                                            flex items-center gap-1 px-2 py-1 text-xs rounded-lg transition-all
                                            ${colors.inputBg} ${colors.border} ${colors.textMuted}
                                            hover:${colors.textSecondary} hover:bg-white/[0.06]
                                        `}
                                        title={`Copiar de ${DAYS[index - 1].short}`}
                                    >
                                        <Copy className="w-3 h-3" />
                                        <span className="hidden md:inline">Repetir</span>
                                    </button>
                                )}
                            </div>

                            {/* Time Blocks */}
                            {isOpen && (
                                <div className="px-3 pb-3 md:px-4 md:pb-4 space-y-2">
                                    {dayData.blocks.map((block, blockIndex) => (
                                        <div key={blockIndex} className="flex items-center gap-2">
                                            <input
                                                type="time"
                                                value={block.start}
                                                onChange={(e) => updateBlock(day.key, blockIndex, 'start', e.target.value)}
                                                className={`
                                                    flex-1 p-2.5 text-sm rounded-lg outline-none transition-all
                                                    ${classes.input}
                                                `}
                                            />
                                            <span className={colors.textMuted}>até</span>
                                            <input
                                                type="time"
                                                value={block.end}
                                                onChange={(e) => updateBlock(day.key, blockIndex, 'end', e.target.value)}
                                                className={`
                                                    flex-1 p-2.5 text-sm rounded-lg outline-none transition-all
                                                    ${classes.input}
                                                `}
                                            />

                                            {dayData.blocks.length > 1 && (
                                                <button
                                                    onClick={() => removeBlock(day.key, blockIndex)}
                                                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}

                                    {dayData.blocks.length < 2 && (
                                        <button
                                            onClick={() => addBlock(day.key)}
                                            className={`
                                                flex items-center gap-1 px-3 py-2 text-xs rounded-lg transition-all w-full justify-center
                                                ${colors.inputBg} ${colors.border} ${colors.textMuted}
                                                hover:${colors.textSecondary} hover:bg-white/[0.06]
                                            `}
                                        >
                                            <Plus className="w-3 h-3" />
                                            Adicionar Pausa (Almoço)
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
