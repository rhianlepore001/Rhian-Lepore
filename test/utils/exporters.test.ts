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

    it('neutraliza textos que o Excel poderia executar como fórmula', () => {
        expect(escapeCsv('=SOMA(A1:A2)')).toBe("'=SOMA(A1:A2)");
        expect(escapeCsv('+55 11 99999-0000')).toBe("'+55 11 99999-0000");
        expect(escapeCsv('-cmd')).toBe("'-cmd");
        expect(escapeCsv('@usuario')).toBe("'@usuario");
        expect(escapeCsv('\tabc')).toBe("'\tabc");
        expect(escapeCsv('=1,2')).toBe('"\'=1,2"');
    });

    it('não altera números nem textos que apenas parecem números', () => {
        expect(escapeCsv(-12.5)).toBe('-12.5');
        expect(escapeCsv('-12,50')).toBe('"-12,50"');
        expect(escapeCsv('-12.50')).toBe('-12.50');
        expect(escapeCsv('a=b')).toBe('a=b');
    });
});
