import { useAuth } from '../contexts/AuthContext';
import {
    buildWhatsAppLink,
    formatCurrency,
    formatPhone,
    getCurrencySymbol,
    Region,
} from '../utils/formatters';

export interface TenantLocale {
    region: Region;
    isPT: boolean;
    currencySymbol: string;
    formatMoney: (value: number | undefined | null) => string;
    formatTenantPhone: (phone: string) => string;
    whatsAppLink: (phone: string, message?: string) => string;
}

function buildLocale(region: Region): TenantLocale {
    return {
        region,
        isPT: region === 'PT',
        currencySymbol: getCurrencySymbol(region),
        formatMoney: (value) => formatCurrency(value, region),
        formatTenantPhone: (phone) => formatPhone(phone, region),
        whatsAppLink: (phone, message) => buildWhatsAppLink(phone, region, message),
    };
}

/**
 * Ponto único região → moeda/DDI/formatos do tenant autenticado.
 * Evita o padrão espalhado `region === 'PT' ? '€' : 'R$'`.
 */
export function useTenantLocale(): TenantLocale {
    const { region } = useAuth();
    return buildLocale(region === 'PT' ? 'PT' : 'BR');
}

/**
 * Variante para páginas públicas (sem sessão): recebe a região do
 * perfil público do estabelecimento resolvido pelo slug.
 */
export function usePublicTenantLocale(region: string | null | undefined): TenantLocale {
    return buildLocale(region === 'PT' ? 'PT' : 'BR');
}
