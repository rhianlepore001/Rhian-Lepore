/**
 * Datas comemorativas brasileiras relevantes para salões e barbearias.
 */

interface Holiday {
    date: string; // MM-DD
    name: string;
    relevance: 'alta' | 'media';
}

const FIXED_HOLIDAYS: Holiday[] = [
    { date: '01-01', name: 'Ano Novo', relevance: 'media' },
    { date: '02-14', name: 'Dia dos Namorados (Global)', relevance: 'media' },
    { date: '03-08', name: 'Dia da Mulher', relevance: 'alta' },
    { date: '04-15', name: 'Dia do Desarmamento (Beleza)', relevance: 'media' },
    { date: '05-01', name: 'Dia do Trabalho', relevance: 'media' },
    { date: '05-11', name: 'Dia das Mães', relevance: 'alta' },
    { date: '06-12', name: 'Dia dos Namorados (BR)', relevance: 'alta' },
    { date: '06-15', name: 'Dia do Cabeleireiro', relevance: 'alta' },
    { date: '07-26', name: 'Dia dos Avós', relevance: 'media' },
    { date: '08-10', name: 'Dia dos Pais', relevance: 'alta' },
    { date: '08-15', name: 'Dia do Barbeiro', relevance: 'alta' },
    { date: '09-07', name: 'Independência do Brasil', relevance: 'media' },
    { date: '09-20', name: 'Dia do Barbeiro (Alternativo)', relevance: 'alta' },
    { date: '10-12', name: 'Dia das Crianças', relevance: 'media' },
    { date: '10-31', name: 'Halloween', relevance: 'media' },
    { date: '11-20', name: 'Consciência Negra', relevance: 'media' },
    { date: '11-29', name: 'Black Friday', relevance: 'alta' },
    { date: '12-25', name: 'Natal', relevance: 'alta' },
    { date: '12-31', name: 'Réveillon', relevance: 'alta' },
];

export function getHolidaysForMonth(month: number): { day: number; name: string; relevance: 'alta' | 'media' }[] {
    const monthStr = String(month + 1).padStart(2, '0');
    return FIXED_HOLIDAYS
        .filter(h => h.date.startsWith(monthStr))
        .map(h => ({
            day: parseInt(h.date.split('-')[1]),
            name: h.name,
            relevance: h.relevance,
        }));
}

export function getDaysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
}
