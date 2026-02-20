import { describe, it, expect } from 'vitest';
import {
    formatCurrency,
    formatCompactCurrency,
    formatPhone,
    formatNumber,
    formatPercentage,
    formatDuration,
    formatDate,
    formatDateLong,
    formatTime,
    formatDateTime,
    formatRelativeDate,
} from '@/utils/formatters';

describe('Formatters Utils', () => {
    describe('formatCurrency', () => {
        it('should format BRL currency correctly', () => {
            expect(formatCurrency(1234.56, 'BR')).toBe('R$ 1.234,56');
            expect(formatCurrency(0, 'BR')).toBe('R$ 0,00');
        });

        it('should format EUR currency correctly', () => {
            // Nota: o espaço entre o símbolo e o valor pode variar dependendo do locale do sistema
            // Vamos verificar se contém o símbolo e o valor formatado
            const result = formatCurrency(1234.56, 'PT');
            expect(result).toContain('€');
            // Formato pode variar dependendo do locale (1.234,56 € ou € 1.234,56)
            // O importante é conter os valores corretos
            expect(result).toContain('€');
            expect(result.replace(/\s/g, '')).toContain('1234,56');
        });

        it('should handle undefined/null values', () => {
            expect(formatCurrency(undefined, 'BR')).toBe('R$ 0,00');
            expect(formatCurrency(null, 'PT')).toBe('€ 0,00');
        });

        it('should format without symbol when requested', () => {
            expect(formatCurrency(1234.56, 'BR', false)).toBe('1.234,56');
        });
    });

    describe('formatCompactCurrency', () => {
        it('should format thousands with K', () => {
            expect(formatCompactCurrency(1500, 'BR')).toBe('R$ 1.5K');
            expect(formatCompactCurrency(1500, 'PT')).toBe('€ 1.5K');
        });

        it('should format millions with M', () => {
            expect(formatCompactCurrency(1500000, 'BR')).toBe('R$ 1.5M');
        });

        it('should return normal formatting for small numbers', () => {
            expect(formatCompactCurrency(500, 'BR')).toBe('R$ 500,00');
        });
    });

    describe('formatPhone', () => {
        it('should format BR phone numbers', () => {
            expect(formatPhone('11999998888', 'BR')).toBe('(11) 99999-8888');
            expect(formatPhone('1144445555', 'BR')).toBe('(11) 4444-5555');
        });

        it('should clean BR phone numbers with extra country code', () => {
            expect(formatPhone('5511999998888', 'BR')).toBe('(11) 99999-8888');
        });

        it('should format PT phone numbers', () => {
            expect(formatPhone('912345678', 'PT')).toBe('+351 912 345 678');
        });

        it('should clean PT phone numbers with extra country code', () => {
            expect(formatPhone('351912345678', 'PT')).toBe('+351 912 345 678');
        });

        it('should handle partial phone numbers', () => {
            expect(formatPhone('11', 'BR')).toBe('(11');
            expect(formatPhone('1199999', 'BR')).toBe('(11) 99999');
        });
    });

    describe('formatNumber', () => {
        it('should format numbers with locale separator', () => {
            expect(formatNumber(1234.56, 'BR')).toBe('1.234,56');
        });
    });

    describe('formatPercentage', () => {
        it('should format percentage', () => {
            expect(formatPercentage(10.5)).toBe('11%'); // Default 0 decimals
            expect(formatPercentage(10.5, 1)).toBe('10.5%');
        });
    });

    describe('formatDuration', () => {
        it('should format minutes', () => {
            expect(formatDuration(30)).toBe('30min');
        });

        it('should format hours', () => {
            expect(formatDuration(60)).toBe('1h');
            expect(formatDuration(120)).toBe('2h');
        });

        it('should format hours and minutes', () => {
            expect(formatDuration(90)).toBe('1h 30min');
        });
    });

    describe('Date Formatters', () => {
        const testDate = new Date('2023-05-15T14:30:00');

        it('formatDate should return formatted date', () => {
            expect(formatDate(testDate, 'BR')).toBe('15/05/2023');
        });

        it('formatDateLong should return long date format', () => {
            // O output exato depende do locale do ambiente, mas deve conter o mês por extenso
            const result = formatDateLong(testDate, 'BR');
            expect(result).toMatch(/15 de maio de 2023/i);
        });

        it('formatTime should return formatted time', () => {
            expect(formatTime(testDate)).toBe('14:30');
        });

        it('formatDateTime should combine date and time', () => {
            expect(formatDateTime(testDate, 'BR')).toBe('15/05/2023 às 14:30');
        });

        it('formatRelativeDate should handle relative days', () => {
            const today = new Date();
            expect(formatRelativeDate(today, 'BR')).toBe('Hoje');

            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            expect(formatRelativeDate(yesterday, 'BR')).toBe('Ontem');

            const otherDay = new Date('2023-01-01');
            expect(formatRelativeDate(otherDay, 'BR')).toBe('01/01/2023');
        });
    });
});
