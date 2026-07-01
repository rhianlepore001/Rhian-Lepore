import { describe, it, expect } from 'vitest';
import { escapeCsv } from '../../utils/exporters';

describe('escapeCsv', () => {
    it('retorna string vazia para null/undefined', () => {
        expect(escapeCsv(null)).toBe('');
        expect(escapeCsv(undefined)).toBe('');
    });

    it('retorna string simples sem modificação', () => {
        expect(escapeCsv('texto')).toBe('texto');
        expect(escapeCsv(123)).toBe('123');
    });

    it('escapa vírgulas', () => {
        expect(escapeCsv('a, b')).toBe('"a, b"');
    });

    it('escapa aspas duplicando-as', () => {
        expect(escapeCsv('diz "oi"')).toBe('"diz ""oi"""');
    });

    it('escapa quebras de linha', () => {
        expect(escapeCsv('linha1\nlinha2')).toBe('"linha1\nlinha2"');
    });

    it('combina vírgula, aspas e quebra de linha', () => {
        expect(escapeCsv('a, "b"\nc')).toBe('"a, ""b""\nc"');
    });

    it('preserva acentos', () => {
        expect(escapeCsv('Não')).toBe('Não');
        expect(escapeCsv('São Paulo')).toBe('São Paulo');
    });
});
