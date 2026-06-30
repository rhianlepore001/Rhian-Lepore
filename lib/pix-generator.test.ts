import { describe, it, expect } from 'vitest';
import { validatePixKey, generatePixPayload } from './pix-generator';

describe('validatePixKey', () => {
    it('valida CPF correto', () => {
        // CPF válido para teste (gerado pelo algoritmo oficial, não é de pessoa real)
        const valid = validatePixKey('529.982.247-25', 'cpf');
        expect(valid).toBe('52998224725');
    });

    it('rejeita CPF inválido', () => {
        expect(validatePixKey('111.111.111-11', 'cpf')).toBeNull();
        expect(validatePixKey('12345678900', 'cpf')).toBeNull();
    });

    it('rejeita CPF com tamanho errado', () => {
        expect(validatePixKey('123', 'cpf')).toBeNull();
    });

    it('valida CNPJ correto', () => {
        const valid = validatePixKey('11.444.777/0001-61', 'cnpj');
        expect(valid).toBe('11444777000161');
    });

    it('rejeita CNPJ inválido', () => {
        expect(validatePixKey('11.111.111/0001-11', 'cnpj')).toBeNull();
    });

    it('valida celular BR com 11 dígitos', () => {
        const valid = validatePixKey('(11) 98765-4321', 'phone');
        expect(valid).toBe('+5511987654321');
    });

    it('valida celular BR com 10 dígitos', () => {
        const valid = validatePixKey('1133334444', 'phone');
        expect(valid).toBe('+551133334444');
    });

    it('valida email', () => {
        expect(validatePixKey('joao@email.com', 'email')).toBe('joao@email.com');
        expect(validatePixKey('invalido', 'email')).toBeNull();
        expect(validatePixKey('a@b', 'email')).toBeNull();
    });

    it('valida chave aleatória UUID', () => {
        const uuid = '123e4567-e89b-12d3-a456-426614174000';
        expect(validatePixKey(uuid, 'random')).toBe(uuid);
    });

    it('valida chave aleatória hex 32 chars', () => {
        const hex = '123e4567e89b12d3a456426614174000';
        const result = validatePixKey(hex, 'random');
        expect(result).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('rejeita chave aleatória inválida', () => {
        expect(validatePixKey('nao-eh-chave', 'random')).toBeNull();
    });

    it('rejeita valor vazio', () => {
        expect(validatePixKey('', 'cpf')).toBeNull();
        expect(validatePixKey('   ', 'email')).toBeNull();
    });
});

describe('generatePixPayload', () => {
    const baseInput = {
        pixKey: '52998224725',
        pixKeyType: 'cpf' as const,
        merchantName: 'Barbearia Silva',
        merchantCity: 'São Paulo',
        amountCents: 9000,
        txid: 'CLUBE001',
    };

    it('gera payload com CRC16 válido', () => {
        const payload = generatePixPayload(baseInput);
        expect(payload).toMatch(/^000201/);
        // CRC deve ser os últimos 4 chars hex em maiúsculas
        const crc = payload.slice(-4);
        expect(crc).toMatch(/^[0-9A-F]{4}$/);
    });

    it('inclui valor formatado com 2 casas decimais', () => {
        const payload = generatePixPayload(baseInput);
        expect(payload).toContain('540590.00');
    });

    it('omite campo valor se amountCents = 0', () => {
        const payload = generatePixPayload({ ...baseInput, amountCents: 0 });
        expect(payload).not.toContain('54');
    });

    it('omite campo valor se amountCents undefined', () => {
        const { amountCents, ...rest } = baseInput;
        const payload = generatePixPayload(rest);
        expect(payload).not.toContain('54');
    });

    it('remove acentos do nome do recebedor', () => {
        const payload = generatePixPayload({ ...baseInput, merchantName: 'José da Silva' });
        expect(payload).toContain('JOSE DA SILVA');
        expect(payload).not.toContain('é');
    });

    it('limita nome a 25 caracteres', () => {
        const longName = 'A'.repeat(50);
        const payload = generatePixPayload({ ...baseInput, merchantName: longName });
        const nameMatch = payload.match(/59(\d{2})([A-Z ]{1,25})/);
        expect(nameMatch).not.toBeNull();
        expect(nameMatch![2].length).toBeLessThanOrEqual(25);
    });

    it('limita cidade a 15 caracteres', () => {
        const payload = generatePixPayload({ ...baseInput, merchantCity: 'Cidademuitolongaquecabenao' });
        const cityMatch = payload.match(/60(\d{2})([A-Z ]{1,15})/);
        expect(cityMatch).not.toBeNull();
        expect(cityMatch![2].length).toBeLessThanOrEqual(15);
    });

    it('lança erro se chave Pix inválida', () => {
        expect(() => generatePixPayload({ ...baseInput, pixKey: 'invalida' })).toThrow();
    });

    it('usa cidade padrão SAO PAULO se vazia', () => {
        const payload = generatePixPayload({ ...baseInput, merchantCity: '' });
        expect(payload).toContain('SAO PAULO');
    });
});
