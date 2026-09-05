import { describe, expect, it, vi, afterEach } from 'vitest';
import { copyTextToClipboard } from './clipboard';

afterEach(() => {
    vi.restoreAllMocks();
});

describe('copyTextToClipboard', () => {
    it('usa a Clipboard API quando disponível', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });
        Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: { writeText },
        });

        await expect(copyTextToClipboard('abc')).resolves.toBe(true);
        expect(writeText).toHaveBeenCalledWith('abc');
    });

    it('recusa texto vazio', async () => {
        await expect(copyTextToClipboard('')).resolves.toBe(false);
    });
});
