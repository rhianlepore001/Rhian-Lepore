/**
 * Gerador de payload Pix (BR Code / EMV) seguindo especificação do BACEN.
 * Sem integração bancária — gera o código copia-e-cola e QR Code a partir
 * de uma chave Pix (CPF, CNPJ, celular, email ou chave aleatória) + valor + cidade.
 *
 * Referência: Manual de Padrões para Iniciação do Pix (BACEN) v1.2 §4
 */

export type PixKeyType = 'cpf' | 'cnpj' | 'phone' | 'email' | 'random';

export interface PixPayloadInput {
    pixKey: string;
    pixKeyType: PixKeyType;
    merchantName: string;
    merchantCity: string;
    amountCents?: number;
    txid?: string;
}

/**
 * Valida a chave Pix conforme o tipo. Retorna a chave normalizada
 * ou null se inválida.
 */
export function validatePixKey(value: string, type: PixKeyType): string | null {
    if (!value || typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;

    switch (type) {
        case 'cpf': {
            const digits = trimmed.replace(/\D/g, '');
            if (digits.length !== 11) return null;
            if (!isValidCpf(digits)) return null;
            return digits;
        }
        case 'cnpj': {
            const digits = trimmed.replace(/\D/g, '');
            if (digits.length !== 14) return null;
            if (!isValidCnpj(digits)) return null;
            return digits;
        }
        case 'phone': {
            const digits = trimmed.replace(/\D/g, '');
            // +55 (DDD) 9XXXX-XXXX = 12 ou 13 dígitos
            if (digits.length === 10 || digits.length === 11) {
                return `+55${digits}`;
            }
            if (digits.length === 12 || digits.length === 13) {
                return `+${digits}`;
            }
            return null;
        }
        case 'email': {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(trimmed) ? trimmed : null;
        }
        case 'random': {
            // Chave aleatória (UUID v4 ou similar) - 36 chars com hífens, ou 32 hex
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (uuidRegex.test(trimmed)) return trimmed.toLowerCase();
            if (/^[0-9a-f]{32}$/i.test(trimmed)) {
                return `${trimmed.slice(0, 8)}-${trimmed.slice(8, 12)}-${trimmed.slice(12, 16)}-${trimmed.slice(16, 20)}-${trimmed.slice(20)}`;
            }
            return null;
        }
        default:
            return null;
    }
}

function isValidCpf(digits: string): boolean {
    if (/^(\d)\1{10}$/.test(digits)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
    let rest = (sum * 10) % 11;
    if (rest === 10) rest = 0;
    if (rest !== parseInt(digits[9])) return false;
    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
    rest = (sum * 10) % 11;
    if (rest === 10) rest = 0;
    return rest === parseInt(digits[10]);
}

function isValidCnpj(digits: string): boolean {
    if (/^(\d)\1{13}$/.test(digits)) return false;
    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < 12; i++) sum += parseInt(digits[i]) * weights1[i];
    let rest = sum % 11;
    const dv1 = rest < 2 ? 0 : 11 - rest;
    if (dv1 !== parseInt(digits[12])) return false;
    sum = 0;
    for (let i = 0; i < 13; i++) sum += parseInt(digits[i]) * weights2[i];
    rest = sum % 11;
    const dv2 = rest < 2 ? 0 : 11 - rest;
    return dv2 === parseInt(digits[13]);
}

/**
 * Formata campo EMV (ID + tamanho 2 dígitos + valor)
 */
function emvField(id: string, value: string): string {
    const length = value.length.toString().padStart(2, '0');
    return `${id}${length}${value}`;
}

/**
 * Calcula CRC16-CCITT (polinômio 0x1021) conforme spec Pix
 */
function crc16(payload: string): string {
    let crc = 0xffff;
    for (let i = 0; i < payload.length; i++) {
        crc ^= payload.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
            if (crc & 0x8000) {
                crc = ((crc << 1) ^ 0x1021) & 0xffff;
            } else {
                crc = (crc << 1) & 0xffff;
            }
        }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Sanitiza nome/cidade para EMV: remove acentos, limita a 25/15 chars,
 * converte para uppercase.
 */
function sanitizeForEmv(text: string, maxLen: number): string {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/[^A-Z0-9 ]/g, ' ')
        .trim()
        .slice(0, maxLen);
}

/**
 * Gera o payload Pix copia-e-cola (string BR Code).
 */
export function generatePixPayload(input: PixPayloadInput): string {
    const normalizedKey = validatePixKey(input.pixKey, input.pixKeyType);
    if (!normalizedKey) {
        throw new Error(`Chave Pix inválida para o tipo ${input.pixKeyType}`);
    }

    const merchantName = sanitizeForEmv(input.merchantName || 'RECEBEDOR', 25);
    const merchantCity = sanitizeForEmv(input.merchantCity || 'SAO PAULO', 15);
    const txid = (input.txid || 'AGENDIX').slice(0, 25).padEnd(1, ' ').slice(0, 25).toUpperCase().replace(/[^A-Z0-9 ]/g, ' ');

    // Construir payload sem CRC primeiro
    const payloadNoCrc =
        emvField('00', '01') + // Payload Format Indicator
        emvField('26', // Merchant Account Information
            emvField('00', 'BR.GOV.BCB.PIX') +
            emvField('01', normalizedKey)
        ) +
        emvField('52', '0000') + // Merchant Category Code
        emvField('53', '986') + // Transaction Currency (BRL=986)
        (input.amountCents && input.amountCents > 0
            ? emvField('54', (input.amountCents / 100).toFixed(2))
            : '') +
        emvField('58', 'BR') + // Country Code
        emvField('59', merchantName) + // Merchant Name
        emvField('60', merchantCity) + // Merchant City
        emvField('62', emvField('05', txid)); // Additional Data Field Template (txid)

    // Adicionar campo ID 63 com CRC
    const payloadWithCrcId = payloadNoCrc + '6304';
    const crc = crc16(payloadWithCrcId);
    return payloadWithCrcId + crc;
}
