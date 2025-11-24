import React from 'react';
import { Copy, Plus, X } from 'lucide-react';

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
    isBeauty: boolean;
}

const DAYS = [
    { key: 'mon', label: 'Segunda', short: 'Seg' },
    { key: 'tue', label: 'Terça', short: 'Ter' },
    { key: 'wed', label: 'Quarta', short: 'Qua' },
    { key: 'thu', label: 'Quinta', short: 'Qui' },
    { key: 'fri', label: 'Sexta', short: 'Sex' },
    { key: 'sat', label: 'Sábado', short: 'Sáb' },
    { key: 'sun', label: 'Domingo', short: 'Dom' },
];

export const BusinessHoursEditor: React.FC<BusinessHoursEditorProps> = ({
    hours,
    onChange,
    isBeauty
}) => {
    const accentColor = isBeauty ? 'beauty-neon' : 'accent-gold';

    // Helper to safely get day data, providing a default if it's missing.
    const getDay = (dayKey: string): DayHours => {
        return hours[dayKey] || { isOpen: false, blocks: [] };
    };

    const toggleDay = (dayKey: string) => {
        const currentDay = getDay(dayKey);
        const newIsOpen = !currentDay.isOpen;

        // If opening a day for the first time, add a default time block
        const newBlocks = newIsOpen && currentDay.blocks.length === 0
            ? [{ start: '09:00', end: '18:00' }]
            : currentDay.blocks;

        onChange({
            ...hours,
            [dayKey]: {
                ...currentDay,
                isOpen: newIsOpen,
                blocks: newBlocks,
            }
        });
    };

    const updateBlock = (dayKey: string, blockIndex: number, field: 'start' | 'end', value: string) => {
        const currentDay = getDay(dayKey);
        const newBlocks = [...currentDay.blocks];
        newBlocks[blockIndex] = { ...newBlocks[blockIndex], [field]: value };

        onChange({
            ...hours,
            [dayKey]: {
                ...currentDay,
                blocks: newBlocks,
            }
        });
    };

    const addBlock = (dayKey: string) => {
        const currentDay = getDay(dayKey);
        onChange({
            ...hours,
            [dayKey]: {
                ...currentDay,
                blocks: [...currentDay.blocks, { start: '13:00', end: '18:00' }],
            }
        });
    };

    const removeBlock = (dayKey: string, blockIndex: number) => {
        const currentDay = getDay(dayKey);
        const newBlocks = currentDay.blocks.filter((_, i) => i !== blockIndex);
        onChange({
            ...hours,
            [dayKey]: {
                ...currentDay,
                blocks: newBlocks,
            }
        });
    };

    const copyFromPreviousDay = (dayKey: string) => {
        const dayIndex = DAYS.findIndex(d => d.key === dayKey);
        if (dayIndex === 0) return;

        const previousDayKey = DAYS[dayIndex - 1].key;
        const previousDay = getDay(previousDayKey);
        onChange({
            ...hours,
            [dayKey]: { ...previousDay }
        });
    };

    const applyPreset = (preset: 'weekday' | 'weekend') => {
        const presetHours = preset === 'weekday'
            ? { isOpen: true, blocks: [{ start: '09:00', end: '18:00' }] }
            : { isOpen: true, blocks: [{ start: '09:00', end: '14:00' }] };

        const days = preset === 'weekday' ? ['mon', 'tue', 'wed', 'thu', 'fri'] : ['sat'];

        const newHours = { ...hours };
        days.forEach(day => {
            newHours[day] = { ...presetHours };
        });

        onChange(newHours);
    };

    return (
        <div className="space-y-4">
            {/* Quick Presets */}
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={() => applyPreset('weekday')}
                    className="px-3 py-1.5 text-xs md:text-sm bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg border border-neutral-700 transition-colors"
                >
                    ⚡ Seg-Sex 9-18h
                </button>
                <button
                    onClick={() => applyPreset('weekend')}
                    className="px-3 py-1.5 text-xs md:text-sm bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg border border-neutral-700 transition-colors"
                >
                    ⚡ Sáb 9-14h
                </button>
            </div>

            {/* Days */}
            <div className="space-y-3">
                {DAYS.map((day, index) => {
                    const dayData = getDay(day.key);
                    return (
                        <div key={day.key} className="bg-neutral-800 rounded-lg p-3 md:p-4">
                            {/* Day Header */}
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <span className="text-white font-medium text-sm md:text-base w-16 md:w-24">
                                        {day.short}
                                    </span>

                                    {/* Open/Closed Toggle */}
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={dayData.isOpen}
                                            onChange={() => toggleDay(day.key)}
                                            className="sr-only peer"
                                        />
                                        <div className={`w-11 h-6 md:w-14 md:h-7 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:rounded-full after:h-5 after:w-5 md:after:h-6 md:after:w-6 after:transition-all peer-checked:bg-${accentColor}`}></div>
                                        <span className="ml-2 text-xs md:text-sm text-neutral-400">
                                            {dayData.isOpen ? 'Aberto' : 'Fechado'}
                                        </span>
                                    </label>
                                </div>

                                {/* Copy Button */}
                                {index > 0 && (
                                    <button
                                        onClick={() => copyFromPreviousDay(day.key)}
                                        className="flex items-center gap-1 px-2 py-1 text-xs text-neutral-400 hover:text-white bg-neutral-700 hover:bg-neutral-600 rounded transition-colors"
                                        title={`Copiar de ${DAYS[index - 1].short}`}
                                    >
                                        <Copy className="w-3 h-3" />
                                        <span className="hidden md:inline">Repetir</span>
                                    </button>
                                )}
                            </div>

                            {/* Time Blocks */}
                            {dayData.isOpen && (
                                <div className="space-y-2">
                                    {dayData.blocks.map((block, blockIndex) => (
                                        <div key={blockIndex} className="flex items-center gap-2">
                                            <input
                                                type="time"
                                                value={block.start}
                                                onChange={(e) => updateBlock(day.key, blockIndex, 'start', e.target.value)}
                                                className={`flex-1 p-2 text-sm bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:outline-none focus:border-${accentColor}`}
                                            />
                                            <span className="text-neutral-400 text-xs md:text-sm">até</span>
                                            <input
                                                type="time"
                                                value={block.end}
                                                onChange={(e) => updateBlock(day.key, blockIndex, 'end', e.target.value)}
                                                className={`flex-1 p-2 text-sm bg-neutral-700 border border-neutral-600 rounded-lg text-white focus:outline-none focus:border-${accentColor}`}
                                            />

                                            {dayData.blocks.length > 1 && (
                                                <button
                                                    onClick={() => removeBlock(day.key, blockIndex)}
                                                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}

                                    {/* Add Lunch Break */}
                                    {dayData.blocks.length < 2 && (
                                        <button
                                            onClick={() => addBlock(day.key)}
                                            className="flex items-center gap-1 px-3 py-1.5 text-xs text-neutral-400 hover:text-white bg-neutral-700 hover:bg-neutral-600 rounded transition-colors w-full justify-center"
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