export const parseDate = (dateString: Date | string | null | undefined): Date | null => {
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

                // Validação básica de limites
                if (month < 0 || month > 11 || day < 1 || day > 31) {
                    console.warn('parseDate: Data inválida (componentes fora do limite)', dateString);
                    return null;
                }

                date = new Date(year, month, day, hour, minute, second);

                // Validação de rollover (ex: 31 de abril vira 1 de maio)
                if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
                    console.warn('parseDate: Data inválida (rollover detectado)', dateString);
                    return null;
                }

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
 * Formata uma Date para YYYY-MM-DD usando componentes locais (getFullYear/
 * getMonth/getDate). Diferente de `toISOString().split('T')[0]`, não converte
 * pra UTC — evita rolar 1 dia quando a hora local está entre 21:00 e meia-noite
 * em fusos negativos (BR UTC-3). Bug P0 #2 da auditoria ADM: cliques nos botões
 * da faixa semanal abriam o dia adjacente.
 */
export const formatLocalDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Formata com segurança uma data para uso em input type="date" (YYYY-MM-DD)
 * respeitando o fuso horário local (sem `toISOString().split('T')[0]`, que
 * rola o dia em fusos != UTC quando a hora local está perto de meia-noite).
 * Retorna string vazia se data inválida, evitando crash.
 */
export const formatDateForInput = (date: Date | string | null | undefined): string => {
    if (!date) return '';
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        return formatLocalDateString(d);
    } catch (e) {
        console.error('formatDateForInput error', e);
        return '';
    }
};

/**
 * Cria um objeto Date no fuso horário local combinando uma string de data (YYYY-MM-DD)
 * e uma string de hora (HH:mm). Evita o bug de parsing UTC do construtor Date(string).
 */
export const combineDateAndTime = (dateStr: string, timeStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);
    return new Date(year, month - 1, day, hours, minutes, 0, 0);
};

/**
 * Retorna a data atual no formato YYYY-MM-DD respeitando o fuso local.
 */
export const getTodayDateString = (): string => {
    return formatLocalDateString(new Date());
};