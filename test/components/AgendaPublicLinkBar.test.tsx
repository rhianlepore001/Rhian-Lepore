import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  AgendaPublicLinkBar,
  buildPublicBookingLink,
  copyTextToClipboard,
} from '../../components/agenda/AgendaPublicLinkBar';
import { ToastProvider } from '../../components/ui/Toast';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ userType: 'barber', user: { id: 'owner-1' } }),
}));

function renderBar(
  props: React.ComponentProps<typeof AgendaPublicLinkBar>,
  initialPath = '/agenda',
) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <ToastProvider>
        <Routes>
          <Route path="/agenda" element={<AgendaPublicLinkBar {...props} />} />
          <Route path="/configuracoes/agendamento" element={<div>pagina-agendamento</div>} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe('buildPublicBookingLink', () => {
  it('monta o hash /#/book/:slug a partir da origin', () => {
    expect(buildPublicBookingLink('barbearia-silva', 'https://agendixstudio.com')).toBe(
      'https://agendixstudio.com/#/book/barbearia-silva',
    );
  });
});

describe('copyTextToClipboard', () => {
  const originalClipboard = navigator.clipboard;
  const originalSecure = window.isSecureContext;
  const originalExec = document.execCommand;

  afterEach(() => {
    Object.defineProperty(navigator, 'clipboard', { value: originalClipboard, configurable: true });
    Object.defineProperty(window, 'isSecureContext', { value: originalSecure, configurable: true });
    document.execCommand = originalExec;
  });

  it('usa navigator.clipboard em contexto seguro', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });

    await expect(copyTextToClipboard('https://app.test/#/book/x')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('https://app.test/#/book/x');
  });

  it('cai no fallback de textarea quando clipboard indisponível', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    Object.defineProperty(window, 'isSecureContext', { value: false, configurable: true });
    const execSpy = vi.fn(() => true);
    document.execCommand = execSpy;

    await expect(copyTextToClipboard('https://app.test/#/book/x')).resolves.toBe(true);
    expect(execSpy).toHaveBeenCalledWith('copy');
  });
});

describe('AgendaPublicLinkBar', () => {
  const originalClipboard = navigator.clipboard;
  const originalSecure = window.isSecureContext;
  const originalOrigin = window.location.origin;

  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: { ...window.location, origin: 'https://agendixstudio.com' },
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'clipboard', { value: originalClipboard, configurable: true });
    Object.defineProperty(window, 'isSecureContext', { value: originalSecure, configurable: true });
    Object.defineProperty(window, 'location', {
      value: { ...window.location, origin: originalOrigin },
      writable: true,
    });
    localStorage.clear();
  });

  it('mostra o atalho e copia o link público', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });

    renderBar({ businessSlug: 'barbearia-silva', publicBookingEnabled: true, isStaff: false });

    expect(screen.getByTestId('agenda-public-link')).toBeInTheDocument();
    expect(screen.getByText('/#/book/barbearia-silva')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Copiar link de agendamento público/i }));

    expect(writeText).toHaveBeenCalledWith('https://agendixstudio.com/#/book/barbearia-silva');
    expect(await screen.findByRole('button', { name: /Link copiado/i })).toBeInTheDocument();
    expect(screen.getByText(/Link copiado\. Cole no WhatsApp/i)).toBeInTheDocument();
    expect(localStorage.getItem('booking_visited_owner-1')).toBe('true');
  });

  it('dono sem slug vê CTA para configurar o link', async () => {
    renderBar({ businessSlug: null, isStaff: false });
    await userEvent.click(screen.getByRole('button', { name: /Configurar link de agendamento/i }));
    expect(screen.getByText('pagina-agendamento')).toBeInTheDocument();
  });

  it('staff sem slug não vê a barra', () => {
    renderBar({ businessSlug: null, isStaff: true });
    expect(screen.queryByTestId('agenda-public-link')).not.toBeInTheDocument();
  });

  it('dono com reservas desativadas vê CTA para ativar', async () => {
    renderBar({ businessSlug: 'barbearia-silva', publicBookingEnabled: false, isStaff: false });
    expect(screen.getByText(/Agendamento online desativado/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Ativar agendamento online/i }));
    expect(screen.getByText('pagina-agendamento')).toBeInTheDocument();
  });

  it('staff não vê a barra quando o agendamento público está desativado', () => {
    renderBar({ businessSlug: 'barbearia-silva', publicBookingEnabled: false, isStaff: true });
    expect(screen.queryByTestId('agenda-public-link')).not.toBeInTheDocument();
  });
});
