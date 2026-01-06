export const parseDate = (dateString: string | null | undefined): Date | null => {
    if (!dateString) return null;

    // Se já for um objeto Date (as vezes o Supabase retorna assim dependendo da config)
    if (Object.prototype.toString.call(dateString) === '[object Date]') {
        return dateString as unknown as Date;
    }

    try {
        // Tenta parsing nativo primeiro
        let date = new Date(dateString);

        // Verifica se é válido
        if (!isNaN(date.getTime())) {
            return date;
        }

        // Fix para formato SQL/Postgres no Safari (YYYY-MM-DD HH:MM:SS)
        // Safari exige T no lugar do espaço ou formato ISO completo
        if (typeof dateString === 'string') {
            // Substitui espaço por T
            const isoString = dateString.replace(' ', 'T');
            date = new Date(isoString);
            if (!isNaN(date.getTime())) {
                return date;
            }

            // Fallback: Parsing manual simples
            // Formato esperado: YYYY-MM-DD...
            const parts = dateString.split(/[- :]/); // split por traço, espaço ou dois pontos
            if (parts.length >= 3) {
                const year = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1; // Meses são 0-indexados
                const day = parseInt(parts[2], 10);
                const hour = parts.length > 3 ? parseInt(parts[3], 10) : 0;
                const minute = parts.length > 4 ? parseInt(parts[4], 10) : 0;
                const second = parts.length > 5 ? parseInt(parts[5], 10) : 0;

                date = new Date(year, month, day, hour, minute, second);
                if (!isNaN(date.getTime())) {
                    return date;
                }
            }
        }

        console.warn('parseDate: Falha ao converter data', dateString);
        return null;
    } catch (error) {
        console.error('parseDate: Erro crítico', error);
        return null;
    }
};

/**
 * Formata com segurança uma data para uso em input type="date" (YYYY-MM-DD)
 * Retorna string vazia se data inválida, evitando crash.
 */
export const formatDateForInput = (date: Date | string | null | undefined): string => {
    if (!date) return '';
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        return d.toISOString().split('T')[0];
    } catch (e) {
        console.error('formatDateForInput error', e);
        return '';
    }
};
