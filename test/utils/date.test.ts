import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { parseDate, formatDateForInput } from '@/utils/date.ts';

describe('Date Utils', () => {
    describe('parseDate', () => {
        it('should return null for empty values', () => {
            expect(parseDate(null)).toBeNull();
            expect(parseDate(undefined)).toBeNull();
            expect(parseDate('')).toBeNull();
        });

        it('should return the date if a Date object is passed', () => {
            const date = new Date('2023-01-01');
            expect(parseDate(date)).toEqual(date);
        });

        it('should parse valid ISO date strings', () => {
            const dateStr = '2023-05-15T14:30:00.000Z';
            const result = parseDate(dateStr);
            expect(result).toBeInstanceOf(Date);
            expect(result?.toISOString()).toBe(dateStr);
        });

        it('should parse SQL/Postgres format correctly (YYYY-MM-DD HH:MM:SS)', () => {
            // Simula formato vindo do banco sem T
            const dateStr = '2023-05-15 14:30:00';
            const result = parseDate(dateStr);

            expect(result).toBeInstanceOf(Date);
            expect(result?.getFullYear()).toBe(2023);
            expect(result?.getMonth()).toBe(4); // Maio é 4 (0-indexado)
            expect(result?.getDate()).toBe(15);
            expect(result?.getHours()).toBe(14);
            expect(result?.getMinutes()).toBe(30);
        });

        it('should parse simple date format (YYYY-MM-DD)', () => {
            const dateStr = '2023-05-15';
            const result = parseDate(dateStr);

            expect(result).toBeInstanceOf(Date);
            expect(result?.getFullYear()).toBe(2023);
            expect(result?.getMonth()).toBe(4);
            expect(result?.getDate()).toBe(15);
        });

        it('should fallback to manual parsing if Date constructor fails', () => {
            const simpleDate = '2023-12-25';
            const result = parseDate(simpleDate);
            expect(result).toBeInstanceOf(Date);
            expect(result?.getFullYear()).toBe(2023);
            expect(result?.getMonth()).toBe(11); // Dezembro
            expect(result?.getDate()).toBe(25);
        });

        it('should return null for invalid dates', () => {
            // Silencia console.warn e console.error para este teste
            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            expect(parseDate('invalid-date')).toBeNull();
            expect(parseDate('2023-13-45')).toBeNull(); // Mês/dia inválido

            consoleSpy.mockRestore();
            consoleErrorSpy.mockRestore();
        });
    });

    describe('formatDateForInput', () => {
        it('should format date for input (YYYY-MM-DD)', () => {
            const date = new Date('2023-05-15T14:30:00');
            expect(formatDateForInput(date)).toBe('2023-05-15');
        });

        it('should handle string input', () => {
            expect(formatDateForInput('2023-05-15T14:30:00')).toBe('2023-05-15');
        });

        it('should return empty string for null/undefined', () => {
            expect(formatDateForInput(null)).toBe('');
            expect(formatDateForInput(undefined)).toBe('');
            expect(formatDateForInput('')).toBe('');
        });

        it('should return empty string for invalid dates', () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            expect(formatDateForInput('invalid-date')).toBe('');
            consoleErrorSpy.mockRestore();
        });
    });
});
