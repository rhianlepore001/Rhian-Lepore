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

        expect(result.current.accent.text).toBe('text-theme-accent');
        expect(result.current.accent.bg).toBe('bg-theme-accent');
        expect(result.current.accent.hex).toBe('var(--color-accent)');
        expect(result.current.accent.hexHover).toBe('var(--color-accent-hover)');
    });

    it('returns correct accent colors for beauty dark', () => {
        const { result } = renderHook(() => useBrutalTheme({ override: 'beauty' }));

        expect(result.current.accent.text).toBe('text-theme-accent');
        expect(result.current.accent.bg).toBe('bg-theme-accent');
        expect(result.current.accent.hex).toBe('var(--color-accent)');
        expect(result.current.accent.hexHover).toBe('var(--color-accent-hover)');
    });

    it('returns correct color tokens for barber dark', () => {
        const { result } = renderHook(() => useBrutalTheme());

        expect(result.current.colors.bg).toBe('bg-theme-bg');
        expect(result.current.colors.card).toBe('bg-theme-card');
        expect(result.current.colors.surface).toBe('bg-theme-surface');
        expect(result.current.colors.text).toBe('text-theme-text');
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

    it('returns sharp radius tokens for barber (Decisão A)', () => {
        const { result } = renderHook(() => useBrutalTheme());

        expect(result.current.radius.card).toBe('rounded-lg');
        expect(result.current.radius.input).toBe('rounded-md');
        expect(result.current.radius.button).toBe('rounded-lg');
        expect(result.current.radius.badge).toBe('rounded-md');
    });

    it('returns soft radius tokens for beauty (Decisão A)', () => {
        const { result } = renderHook(() => useBrutalTheme({ override: 'beauty' }));

        expect(result.current.radius.card).toBe('rounded-2xl');
        expect(result.current.radius.input).toBe('rounded-lg');
        expect(result.current.radius.button).toBe('rounded-xl');
        expect(result.current.radius.badge).toBe('rounded-full');
    });

    it('returns density tokens per theme (Decisão B)', () => {
        const barber = renderHook(() => useBrutalTheme());
        expect(barber.result.current.density.cardPadding).toBe('p-4 md:p-5');
        expect(barber.result.current.density.tableRowPy).toBe('py-2.5');
        expect(barber.result.current.density.touchMin).toContain('min-h-[44px]');

        const beauty = renderHook(() => useBrutalTheme({ override: 'beauty' }));
        expect(beauty.result.current.density.cardPadding).toBe('p-5 md:p-8');
        expect(beauty.result.current.density.tableRowPy).toBe('py-3.5');
    });

    it('returns component classes without uppercase labels', () => {
        const { result } = renderHook(() => useBrutalTheme());

        expect(result.current.classes.card).toContain('bg-theme-card');
        expect(result.current.classes.card).toContain('rounded-lg');
        expect(result.current.classes.buttonPrimary).toContain('bg-theme-accent');
        expect(result.current.classes.input).toContain('rounded-md');
        expect(result.current.classes.label).not.toContain('uppercase');
        expect(result.current.classes.badgeAccent).not.toContain('uppercase');
        expect(result.current.classes.error).toContain('text-[var(--color-danger)]');
    });

    it('uses fast ease-out motion on cards and buttons (no duration-500)', () => {
        const { result } = renderHook(() => useBrutalTheme());

        expect(result.current.classes.card).not.toContain('duration-500');
        expect(result.current.classes.card).toContain('duration-200');
        expect(result.current.classes.buttonPrimary).toContain('duration-150');
    });

    it('drops the side-stripe from active sidebar item', () => {
        const { result } = renderHook(() => useBrutalTheme());

        expect(result.current.classes.sidebarItemActive).not.toContain('before:');
    });

    it('returns beauty component classes when theme is beauty', () => {
        const { result } = renderHook(() => useBrutalTheme({ override: 'beauty' }));

        expect(result.current.classes.buttonPrimary).toContain('bg-theme-accent');
        expect(result.current.classes.buttonPrimary).toContain('text-[var(--color-bg)]');
        expect(result.current.classes.error).toContain('text-[var(--color-danger)]');
    });
});

describe('useAccentColor', () => {
    it('returns only accent tokens', () => {
        const { result } = renderHook(() => useAccentColor());

        expect(result.current.text).toBe('text-theme-accent');
        expect(result.current.bg).toBe('bg-theme-accent');
        expect(result.current.hex).toBe('var(--color-accent)');
    });
});

describe('useComponentClasses', () => {
    it('returns only classes tokens', () => {
        const { result } = renderHook(() => useComponentClasses());

        expect(result.current.card).toContain('bg-theme-card');
        expect(result.current.buttonPrimary).toContain('bg-theme-accent');
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

