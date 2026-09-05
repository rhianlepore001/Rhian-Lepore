import { describe, expect, it } from 'vitest';
import { validateMbwayPhone } from './mbway';

describe('validateMbwayPhone', () => {
    it('normaliza telemóvel PT de 9 dígitos', () => {
        expect(validateMbwayPhone('912 345 678')).toBe('+351912345678');
        expect(validateMbwayPhone('+351912345678')).toBe('+351912345678');
        expect(validateMbwayPhone('351912345678')).toBe('+351912345678');
    });

    it('rejeita número inválido', () => {
        expect(validateMbwayPhone('812345678')).toBeNull();
        expect(validateMbwayPhone('91234567')).toBeNull();
        expect(validateMbwayPhone('')).toBeNull();
    });
});
