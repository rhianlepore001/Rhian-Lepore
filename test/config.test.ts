import { describe, it, expect } from 'vitest';

describe('Vitest Configuration', () => {
    it('should run a basic test', () => {
        expect(1 + 1).toBe(2);
    });

    it('should have access to globals', () => {
        expect(describe).toBeDefined();
        expect(it).toBeDefined();
        expect(expect).toBeDefined();
    });

    it('should have jsdom environment', () => {
        expect(document).toBeDefined();
        expect(window).toBeDefined();
    });
});
