import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useBrutalTheme, useAccentColor, useComponentClasses } from '../../hooks/useBrutalTheme';
import { useThemeTokens } from '../../hooks/useThemeTokens';

vi.mock('../../contexts/AuthContext', () => ({
    useAuth: () => ({ userType: 'barber' }),
}));

describe('useBrutalTheme', () => {
    beforeEach(() => {
        document.documentElement.setAttribute('data-theme', 'barber');
        document.documentElement.setAttribute('data-mode', 'dark');
    });

    afterEach(() => {
        document.documentElement.removeAttribute('data-theme');
        document.documentElement.removeAttribute('data-mode');
    });

    it('returns barber dark theme by default', () => {
        const { result } = renderHook(() => useBrutalTheme());

        expect(result.current.theme).toBe('barber');
        expect(result.current.mode).toBe('dark');
        expect(result.current.isBarber).toBe(true);
        expect(result.current.isBeauty).toBe(false);
        expect(result.current.isDark).toBe(true);
        expect(result.current.isLight).toBe(false);
    });

    it('returns beauty theme when override is set', () => {
        const { result } = renderHook(() => useBrutalTheme({ override: 'beauty' }));

        expect(result.current.theme).toBe('beauty');
        expect(result.current.isBeauty).toBe(true);
        expect(result.current.isBarber).toBe(false);
    });

    it('returns light mode when data-mode="light"', () => {
        document.documentElement.setAttribute('data-mode', 'light');
        const { result } = renderHook(() => useBrutalTheme());

        expect(result.current.mode).toBe('light');
        expect(result.current.isLight).toBe(true);
        expect(result.current.isDark).toBe(false);
    });

    it('returns correct accent colors for barber dark', () => {
        const { result } = renderHook(() => useBrutalTheme());

        expect(result.current.accent.text).toBe('text-accent-gold');
        expect(result.current.accent.bg).toBe('bg-accent-gold');
        expect(result.current.accent.hex).toBe('#C29B40');
        expect(result.current.accent.hexHover).toBe('#D4AF50');
    });

    it('returns correct accent colors for beauty dark', () => {
        const { result } = renderHook(() => useBrutalTheme({ override: 'beauty' }));

        expect(result.current.accent.text).toBe('text-beauty-neon');
        expect(result.current.accent.bg).toBe('bg-beauty-neon');
        expect(result.current.accent.hex).toBe('#A78BFA');
        expect(result.current.accent.hexHover).toBe('#C4B5FD');
    });

    it('returns correct color tokens for barber dark', () => {
        const { result } = renderHook(() => useBrutalTheme());

        expect(result.current.colors.bg).toBe('bg-brutal-main');
        expect(result.current.colors.card).toBe('bg-brutal-card');
        expect(result.current.colors.surface).toBe('bg-brutal-surface');
        expect(result.current.colors.text).toBe('text-text-primary');
    });

    it('returns correct font tokens for barber', () => {
        const { result } = renderHook(() => useBrutalTheme());

        expect(result.current.font.heading).toBe('font-heading');
        expect(result.current.font.body).toBe('font-sans');
        expect(result.current.font.label).toBe('font-mono');
        expect(result.current.font.mono).toBe('font-mono');
    });

    it('returns correct font tokens for beauty', () => {
        const { result } = renderHook(() => useBrutalTheme({ override: 'beauty' }));

        expect(result.current.font.label).toBe('font-sans');
        expect(result.current.font.body).toBe('font-sans');
    });

    it('returns radius tokens', () => {
        const { result } = renderHook(() => useBrutalTheme());

        expect(result.current.radius.card).toBe('rounded-2xl');
        expect(result.current.radius.input).toBe('rounded-xl');
        expect(result.current.radius.button).toBe('rounded-2xl');
        expect(result.current.radius.badge).toBe('rounded-full');
    });

    it('returns component classes', () => {
        const { result } = renderHook(() => useBrutalTheme());

        expect(result.current.classes.card).toContain('bg-brutal-card');
        expect(result.current.classes.card).toContain('rounded-2xl');
        expect(result.current.classes.buttonPrimary).toContain('bg-accent-gold');
        expect(result.current.classes.input).toContain('rounded-xl');
        expect(result.current.classes.label).toContain('uppercase');
        expect(result.current.classes.error).toContain('text-red-400');
    });

    it('returns beauty component classes when theme is beauty', () => {
        const { result } = renderHook(() => useBrutalTheme({ override: 'beauty' }));

        expect(result.current.classes.buttonPrimary).toContain('bg-beauty-neon');
        expect(result.current.classes.buttonPrimary).toContain('text-white');
        expect(result.current.classes.error).toContain('text-red-300');
    });
});

describe('useAccentColor', () => {
    it('returns only accent tokens', () => {
        const { result } = renderHook(() => useAccentColor());

        expect(result.current.text).toBe('text-accent-gold');
        expect(result.current.bg).toBe('bg-accent-gold');
        expect(result.current.hex).toBe('#C29B40');
    });
});

describe('useComponentClasses', () => {
    it('returns only classes tokens', () => {
        const { result } = renderHook(() => useComponentClasses());

        expect(result.current.card).toContain('bg-brutal-card');
        expect(result.current.buttonPrimary).toContain('bg-accent-gold');
    });
});

describe('useThemeTokens', () => {
    beforeEach(() => {
        document.documentElement.style.setProperty('--color-bg', '#121212');
        document.documentElement.style.setProperty('--color-card', '#1E1E1E');
        document.documentElement.style.setProperty('--color-accent', '#C29B40');
        document.documentElement.style.setProperty('--color-accent-hover', '#D4AF50');
        document.documentElement.style.setProperty('--color-text', '#EAEAEA');
        document.documentElement.style.setProperty('--color-text-secondary', '#A0A0A0');
        document.documentElement.style.setProperty('--color-text-muted', '#525252');
        document.documentElement.style.setProperty('--color-border', 'rgba(255, 255, 255, 0.05)');
        document.documentElement.style.setProperty('--color-divider', 'rgba(255, 255, 255, 0.08)');
        document.documentElement.style.setProperty('--color-overlay', 'rgba(0, 0, 0, 0.7)');
        document.documentElement.style.setProperty('--color-input-bg', 'rgba(0, 0, 0, 0.3)');
        document.documentElement.style.setProperty('--color-input-border', 'rgba(255, 255, 255, 0.06)');
        document.documentElement.style.setProperty('--color-input-focus', 'rgba(194, 155, 64, 0.6)');
        document.documentElement.style.setProperty('--color-danger', '#EF4444');
        document.documentElement.style.setProperty('--color-success', '#10B981');
        document.documentElement.style.setProperty('--color-warning', '#F59E0B');
    });

    it('reads CSS custom properties from document', () => {
        const { result } = renderHook(() => useThemeTokens());

        expect(result.current.bg).toBe('#121212');
        expect(result.current.card).toBe('#1E1E1E');
        expect(result.current.accent).toBe('#C29B40');
        expect(result.current.accentHover).toBe('#D4AF50');
        expect(result.current.text).toBe('#EAEAEA');
    });

    it('reacts to data-theme changes', async () => {
        const { result, rerender } = renderHook(() => useThemeTokens());

        document.documentElement.style.setProperty('--color-accent', '#A78BFA');
        document.documentElement.setAttribute('data-theme', 'beauty');
        rerender();

        await waitFor(() => {
            expect(result.current.accent).toBe('#A78BFA');
        });
    });
});
