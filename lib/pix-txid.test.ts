import { describe, it, expect } from 'vitest';
import { generatePixTxid } from './pix-txid';

describe('generatePixTxid', () => {
    it('gera 26 caracteres por padrão', () => {
        const txid = generatePixTxid();
        expect(txid).toHaveLength(26);
    });

    it('começa com o prefixo fornecido', () => {
        const txid = generatePixTxid('AGX');
        expect(txid.startsWith('AGX')).toBe(true);
    });

    it('só contém caracteres alfanuméricos maiúsculos', () => {
        const txid = generatePixTxid();
        expect(txid).toMatch(/^[A-Z0-9]+$/);
    });

    it('gera valores diferentes em chamadas consecutivas', () => {
        const a = generatePixTxid();
        const b = generatePixTxid();
        expect(a).not.toBe(b);
    });

    it('aceita prefixo vazio', () => {
        const txid = generatePixTxid('');
        expect(txid).toHaveLength(26);
    });
});
