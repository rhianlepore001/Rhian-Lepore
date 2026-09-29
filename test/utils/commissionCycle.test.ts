import { afterEach, describe, expect, it } from 'vitest';
import { formatDayMonth, lastClosedCycle, parseLocalISODate, previousCycle, toLocalISODate } from '../../utils/commissionCycle';

describe('commissionCycle — datas locais, sem toISOString (B5)', () => {
    const originalTz = process.env.TZ;
    afterEach(() => { process.env.TZ = originalTz; });

    it.each(['Europe/Lisbon', 'America/Sao_Paulo', 'UTC', 'Asia/Tokyo'])('acerto dia 5, hoje 29/09/2026 → 06/08 – 05/09 em %s', (tz) => {
        process.env.TZ = tz;
        const c = lastClosedCycle(5, new Date(2026, 8, 29, 10));
        expect(c).toEqual({ start: '2026-08-06', end: '2026-09-05', label: '06/08 – 05/09' });
    });

    it('no próprio dia de acerto o ciclo ainda está aberto: mostra o anterior', () => {
        process.env.TZ = 'Europe/Lisbon';
        expect(lastClosedCycle(5, new Date(2026, 8, 5, 23, 30))).toMatchObject({ start: '2026-07-06', end: '2026-08-05' });
        expect(lastClosedCycle(5, new Date(2026, 8, 6, 0, 5))).toMatchObject({ start: '2026-08-06', end: '2026-09-05' });
    });

    it('virada de ano e dia 31 em mês curto', () => {
        process.env.TZ = 'America/Sao_Paulo';
        expect(lastClosedCycle(10, new Date(2027, 0, 3))).toMatchObject({ start: '2026-11-11', end: '2026-12-10' });
        expect(lastClosedCycle(31, new Date(2026, 2, 2))).toMatchObject({ start: '2026-02-01', end: '2026-02-28' });
        expect(lastClosedCycle(31, new Date(2026, 3, 1))).toMatchObject({ start: '2026-03-01', end: '2026-03-31' });
    });

    it('ciclo anterior', () => {
        const c = lastClosedCycle(5, new Date(2026, 8, 29));
        expect(previousCycle(c, 5)).toMatchObject({ start: '2026-07-06', end: '2026-08-05', label: '06/07 – 05/08' });
    });

    it('parse/format local ida e volta em fuso a oeste de UTC', () => {
        process.env.TZ = 'America/Sao_Paulo';
        expect(toLocalISODate(parseLocalISODate('2026-08-06'))).toBe('2026-08-06');
        expect(formatDayMonth('2026-08-06')).toBe('06/08');
        expect(formatDayMonth('2026-08-06T00:00:00+00:00')).toBe('06/08');
    });

    it('dia de acerto inválido cai no padrão 5', () => {
        expect(lastClosedCycle(0, new Date(2026, 8, 29))).toMatchObject({ end: '2026-09-05' });
    });
});
