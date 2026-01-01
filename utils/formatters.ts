/**
 * Utilitários de formatação para garantir consistência em todo o projeto
 * 
 * Suporta:
 * - Formatação de moeda (BRL e EUR)
 * - Formatação de telefone (Brasil e Portugal)
 * - Formatação de números
 * - Formatação de datas
 */

export type Region = 'BR' | 'PT';

// ===========================================
// FORMATAÇÃO DE MOEDA
// ===========================================

/**
 * Formata um valor numérico como moeda
 * @param value - Valor numérico a ser formatado
 * @param region - Região ('BR' ou 'PT')
 * @param showSymbol - Se deve mostrar o símbolo da moeda (default: true)
 */
export const formatCurrency = (
    value: number | undefined | null,
    region: Region = 'BR',
    showSymbol: boolean = true
): string => {
    if (value === undefined || value === null || isNaN(value)) {
        return showSymbol ? (region === 'PT' ? '€ 0,00' : 'R$ 0,00') : '0,00';
    }

    const locale = region === 'PT' ? 'pt-PT' : 'pt-BR';
    const currency = region === 'PT' ? 'EUR' : 'BRL';

    if (showSymbol) {
        // Formata com símbolo de moeda
        const formatted = new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);

        // Padroniza o formato: "R$ 1.234,56" ou "€ 1.234,56"
        return formatted.replace(/\s+/g, ' ');
    } else {
        // Formata apenas o número
        return new Intl.NumberFormat(locale, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    }
};

/**
 * Retorna apenas o símbolo da moeda
 */
export const getCurrencySymbol = (region: Region = 'BR'): string => {
    return region === 'PT' ? '€' : 'R$';
};

/**
 * Formata valor compacto para exibição em cards (ex: 1.5K, 10M)
 */
export const formatCompactCurrency = (value: number, region: Region = 'BR'): string => {
    const symbol = getCurrencySymbol(region);

    if (value >= 1000000) {
        return `${symbol} ${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
        return `${symbol} ${(value / 1000).toFixed(1)}K`;
    }
    return formatCurrency(value, region);
};

// ===========================================
// FORMATAÇÃO DE TELEFONE
// ===========================================

/**
 * Formata número de telefone de acordo com a região
 * Brasil: (XX) 9XXXX-XXXX ou (XX) XXXX-XXXX
 * Portugal: +351 9XX XXX XXX
 */
export const formatPhone = (phone: string, region: Region = 'BR'): string => {
    // Remove tudo que não for número
    const numbers = phone.replace(/\D/g, '');

    if (region === 'PT') {
        // Portugal: +351 9XX XXX XXX
        if (numbers.length <= 3) return numbers;
        if (numbers.length <= 6) return `${numbers.slice(0, 3)} ${numbers.slice(3)}`;
        if (numbers.length <= 9) return `${numbers.slice(0, 3)} ${numbers.slice(3, 6)} ${numbers.slice(6)}`;
        return `+351 ${numbers.slice(0, 3)} ${numbers.slice(3, 6)} ${numbers.slice(6, 9)}`;
    } else {
        // Brasil: (XX) 9XXXX-XXXX
        if (numbers.length <= 2) return `(${numbers}`;
        if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
        if (numbers.length <= 11) {
            const ddd = numbers.slice(0, 2);
            const firstPart = numbers.slice(2, numbers.length - 4);
            const lastPart = numbers.slice(-4);
            return `(${ddd}) ${firstPart}-${lastPart}`;
        }
        return phone; // Retorna original se muito longo
    }
};

// ===========================================
// FORMATAÇÃO DE NÚMEROS
// ===========================================

/**
 * Formata número com separadores de milhar
 */
export const formatNumber = (value: number, region: Region = 'BR'): string => {
    const locale = region === 'PT' ? 'pt-PT' : 'pt-BR';
    return new Intl.NumberFormat(locale).format(value);
};

/**
 * Formata porcentagem
 */
export const formatPercentage = (value: number, decimals: number = 0): string => {
    return `${value.toFixed(decimals)}%`;
};

/**
 * Formata duração em minutos para exibição legível
 */
export const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
        return `${minutes}min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) {
        return `${hours}h`;
    }
    return `${hours}h ${mins}min`;
};

// ===========================================
// FORMATAÇÃO DE DATAS
// ===========================================

/**
 * Formata data no formato brasileiro/português
 */
export const formatDate = (date: Date | string, region: Region = 'BR'): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const locale = region === 'PT' ? 'pt-PT' : 'pt-BR';

    return d.toLocaleDateString(locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

/**
 * Formata data com mês por extenso
 */
export const formatDateLong = (date: Date | string, region: Region = 'BR'): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const locale = region === 'PT' ? 'pt-PT' : 'pt-BR';

    return d.toLocaleDateString(locale, {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
};

/**
 * Formata hora
 */
export const formatTime = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
    });
};

/**
 * Formata data e hora juntos
 */
export const formatDateTime = (date: Date | string, region: Region = 'BR'): string => {
    return `${formatDate(date, region)} às ${formatTime(date)}`;
};

/**
 * Retorna data relativa (hoje, ontem, etc.)
 */
export const formatRelativeDate = (date: Date | string, region: Region = 'BR'): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = d.toDateString() === today.toDateString();
    const isYesterday = d.toDateString() === yesterday.toDateString();

    if (isToday) return 'Hoje';
    if (isYesterday) return 'Ontem';

    return formatDate(date, region);
};
