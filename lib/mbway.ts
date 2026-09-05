/**
 * Telemóvel MB WAY (Portugal): 9 dígitos a começar por 9.
 * Normaliza para E.164 (+351XXXXXXXXX).
 */
export function validateMbwayPhone(value: string): string | null {
    if (!value || typeof value !== 'string') return null;
    let digits = value.trim().replace(/\D/g, '');
    if (!digits) return null;

    while (digits.startsWith('351') && digits.length > 9) {
        digits = digits.slice(3);
    }

    if (digits.length === 9 && digits.startsWith('9')) {
        return `+351${digits}`;
    }
    return null;
}
