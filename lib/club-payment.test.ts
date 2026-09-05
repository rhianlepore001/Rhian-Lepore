import { describe, expect, it } from 'vitest';
import { clubDigitalMethod, clubPaymentLabel, firstRpcRow, minClientPhoneDigits } from './club-payment';

describe('clubDigitalMethod', () => {
    it('usa Pix no Brasil e MB WAY em Portugal', () => {
        expect(clubDigitalMethod('BR')).toBe('pix');
        expect(clubDigitalMethod('PT')).toBe('mbway');
    });
});

describe('clubPaymentLabel', () => {
    it('rotula os métodos do checkout do clube', () => {
        expect(clubPaymentLabel('pix')).toBe('Pix');
        expect(clubPaymentLabel('mbway')).toBe('MB WAY');
        expect(clubPaymentLabel('in_person')).toBe('No balcão');
    });
});

describe('minClientPhoneDigits', () => {
    it('aceita 9 dígitos em Portugal e 10 no Brasil', () => {
        expect(minClientPhoneDigits('PT')).toBe(9);
        expect(minClientPhoneDigits('BR')).toBe(10);
    });
});

describe('firstRpcRow', () => {
    it('lê array, objeto único e vazio', () => {
        expect(firstRpcRow([{ id: 1 }])).toEqual({ id: 1 });
        expect(firstRpcRow({ id: 2 })).toEqual({ id: 2 });
        expect(firstRpcRow([])).toBeUndefined();
        expect(firstRpcRow(null)).toBeUndefined();
    });
});
