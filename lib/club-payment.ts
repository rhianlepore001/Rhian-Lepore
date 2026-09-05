import { Region } from '../utils/formatters';

export type ClubDigitalMethod = 'pix' | 'mbway';
export type ClubCheckoutMethod = ClubDigitalMethod | 'in_person';

export function clubDigitalMethod(region: Region): ClubDigitalMethod {
    return region === 'PT' ? 'mbway' : 'pix';
}

export function clubPaymentLabel(method: ClubCheckoutMethod): string {
    if (method === 'pix') return 'Pix';
    if (method === 'mbway') return 'MB WAY';
    return 'No balcão';
}

export function minClientPhoneDigits(region: Region): number {
    return region === 'PT' ? 9 : 10;
}

export function firstRpcRow<T>(data: T | T[] | null | undefined): T | undefined {
    if (data == null) return undefined;
    return Array.isArray(data) ? data[0] : data;
}
