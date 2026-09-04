import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { applyPublicAuthTheme, PUBLIC_AUTH_MODE, PUBLIC_AUTH_THEME } from '@/utils/publicAuthTheme';

describe('applyPublicAuthTheme', () => {
  beforeEach(() => {
    document.documentElement.setAttribute('data-theme', 'beauty');
    document.documentElement.setAttribute('data-mode', 'light');
    localStorage.setItem('agendix_color_mode', 'light');
  });

  afterEach(() => {
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-mode');
    localStorage.removeItem('agendix_color_mode');
  });

  it('resets html to barber dark without clearing the saved color mode', () => {
    applyPublicAuthTheme();

    expect(document.documentElement.getAttribute('data-theme')).toBe(PUBLIC_AUTH_THEME);
    expect(document.documentElement.getAttribute('data-mode')).toBe(PUBLIC_AUTH_MODE);
    expect(localStorage.getItem('agendix_color_mode')).toBe('light');
  });
});
