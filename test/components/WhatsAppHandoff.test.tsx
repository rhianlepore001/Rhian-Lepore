import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../hooks/useBrutalTheme', () => ({
  useBrutalTheme: () => ({ classes: { buttonPrimary: 'primary', buttonGhost: 'ghost' }, radius: { button: 'rounded' } }),
}));
vi.mock('../../components/ui/Modal', () => ({
  Modal: ({ open, title, children, footer }: { open: boolean; title?: string; children: React.ReactNode; footer?: React.ReactNode }) =>
    open ? <div role="dialog" aria-label={title}>{children}{footer}</div> : null,
}));

import { WhatsAppHandoffHost, requestWhatsAppHandoff, clearWhatsAppHandoff } from '../../components/whatsapp/WhatsAppHandoff';

const url = 'https://wa.me/5511900000001?text=Oi%20Jo%C3%A3o';

describe('WhatsAppHandoff (botão "Abrir WhatsApp" depois de salvar)', () => {
  afterEach(() => act(() => clearWhatsAppHandoff()));

  it('mostra um link real para o wa.me, que a pessoa toca (gesto do usuário no iPhone)', () => {
    const open = vi.spyOn(window, 'open');
    render(<WhatsAppHandoffHost />);
    act(() => requestWhatsAppHandoff({ url, title: 'Atendimento criado', description: 'Envie a confirmação para João.', message: 'Oi João\nAté já' }));
    expect(screen.getByRole('dialog', { name: 'Atendimento criado' })).toBeInTheDocument();
    expect(screen.getByTestId('whatsapp-handoff-message').textContent).toBe('Oi João\nAté já');
    expect(screen.getByText('Envie a confirmação para João.')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /Abrir WhatsApp/ });
    expect(link).toHaveAttribute('href', url);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    // Nada abre sozinho: só o toque no link.
    expect(open).not.toHaveBeenCalled();
    open.mockRestore();
  });

  it('fecha ao tocar no link e em "Agora não"', async () => {
    render(<WhatsAppHandoffHost />);
    act(() => requestWhatsAppHandoff({ url, title: 'Atendimento criado', description: 'x' }));
    const link = screen.getByRole('link', { name: /Abrir WhatsApp/ });
    link.addEventListener('click', e => e.preventDefault());
    await userEvent.click(link);
    expect(screen.queryByRole('dialog')).toBeNull();
    act(() => requestWhatsAppHandoff({ url, title: 'Atendimento criado', description: 'x' }));
    await userEvent.click(screen.getByRole('button', { name: 'Agora não' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('ignora URL que não é do WhatsApp', () => {
    render(<WhatsAppHandoffHost />);
    act(() => requestWhatsAppHandoff({ url: 'javascript:alert(1)', title: 'x', description: 'x' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
