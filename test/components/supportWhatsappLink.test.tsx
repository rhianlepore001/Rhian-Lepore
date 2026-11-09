import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../../hooks/useBrutalTheme', () => ({
  useBrutalTheme: () => ({
    classes: { buttonGhost: '', card: '' },
    colors: {},
    accent: { text: '', bg: '', border: '' },
    radius: { button: '', card: '' },
  }),
}));
vi.mock('../../contexts/UIContext', () => ({ useUI: () => ({ setModalOpen: vi.fn() }) }));
vi.mock('../../lib/bugReport', () => ({ capturePageForBugReport: vi.fn() }));

import { BugReportButton } from '../../components/BugReportButton';
import { SUPPORT_WHATSAPP_URL } from '../../lib/support';

describe('link de suporte por WhatsApp', () => {
  afterEach(() => vi.restoreAllMocks());

  it('aponta para o WhatsApp do suporte, não para o placeholder "#"', () => {
    expect(SUPPORT_WHATSAPP_URL).not.toBe('#');
    const url = new URL(SUPPORT_WHATSAPP_URL);
    expect(url.origin + url.pathname).toBe('https://wa.me/351927688674');
    expect(url.searchParams.get('text')).toBe('Olá, preciso de ajuda com o AgendiX');
  });

  it('"Falar com suporte" abre o wa.me em nova aba com noopener', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(<BugReportButton />);
    fireEvent.click(screen.getByRole('button', { name: 'Ajuda e reportar problema' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Falar com suporte/ }));
    expect(open).toHaveBeenCalledTimes(1);
    const [href, target, features] = open.mock.calls[0];
    expect(href).toBe(SUPPORT_WHATSAPP_URL);
    expect(target).toBe('_blank');
    expect(String(features)).toContain('noopener');
  });
});
