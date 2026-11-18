import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Landing } from '../../pages/Landing';

describe('site oficial', () => {
  it('aponta para os fluxos reais de entrada e cadastro', () => {
    render(<Landing />);
    expect(screen.getByRole('img', { name: 'AgendiX' })).toHaveAttribute('src', '/landing/agendix-logo-header.webp');
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/#/login');
    expect(screen.getAllByRole('link', { name: /Crie sua conta grátis/ })[0]).toHaveAttribute('href', '/#/register');
    expect(screen.getByText('Criar conta para salão')).toHaveAttribute('href', '/#/register?type=beauty');
    expect(screen.getByRole('link', { name: /suporte no WhatsApp/i })).toHaveAttribute('href', expect.stringContaining('wa.me/351927688674'));
  });
  it('preserva Login e Register byte a byte', () => {
    const expected: Record<string, string> = {"pages/Login.tsx": "99da5310c7153d3c36302b4370e3c639ffa75f3b8c38e0bb27bfd490a5e6f52c", "pages/Register.tsx": "542710fca33607ea8081f6a44d02de94507add57db9acc5b624cce18e7ae40a3"};
    for (const [path, sha] of Object.entries(expected)) {
      expect(createHash('sha256').update(readFileSync(path)).digest('hex')).toBe(sha);
    }
  });
  it('libera o zoom na landing e restaura o viewport ao sair', () => {
    const viewport = document.createElement('meta');
    viewport.name = 'viewport';
    viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    document.head.append(viewport);
    const previous = viewport.content;
    const { unmount } = render(<Landing />);
    expect(viewport.content).not.toContain('user-scalable=no');
    expect(viewport.content).not.toContain('maximum-scale=1.0');
    expect(document.documentElement).toHaveAttribute('data-surface', 'marketing');
    unmount();
    expect(viewport.content).toBe(previous);
    expect(document.documentElement).not.toHaveAttribute('data-surface');
    viewport.remove();
  });
  it('mantém o salão escolhido nos convites de cadastro e demonstração', async () => {
    const { container } = render(<Landing />);
    const choices = screen.getByRole('group', { name: 'Negócio da demonstração' });
    await userEvent.click(within(choices).getByRole('button', { name: 'Salão de beleza' }));
    expect(within(choices).getByRole('button', { name: 'Salão de beleza' })).toHaveAttribute('aria-pressed', 'true');
    const demoLinks = container.querySelectorAll<HTMLAnchorElement>('a[href^="/#/demo/"]');
    expect(demoLinks.length).toBeGreaterThan(3);
    for (const link of demoLinks) expect(link.getAttribute('href')).toMatch(/^\/#\/demo\/beauty(?:\/|$)/);
    const signupLinks = container.querySelectorAll<HTMLAnchorElement>('a[href^="/#/register"]');
    expect(signupLinks.length).toBeGreaterThan(1);
    for (const link of signupLinks) expect(link.getAttribute('href')).toContain('type=beauty');
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/#/login');
  });
  it('personaliza a experiência desde o primeiro bloco e preserva o cadastro após a demo', async () => {
    const { container } = render(<Landing />);
    const heroChoices = screen.getByRole('group', { name: 'Seu tipo de negócio' });
    await userEvent.click(within(heroChoices).getByRole('button', { name: 'Salão de beleza' }));
    expect(container.querySelector('.landing-demo-poster img')).toHaveAttribute('src', '/landing/phone-beauty-booking.webp');
    expect(container.querySelector('.landing-demo-conversion .landing-button')).toHaveAttribute('href', '/#/register?type=beauty');
    const views = screen.getByRole('group', { name: 'Tela da demonstração' });
    await userEvent.click(within(views).getByRole('button', { name: 'Financeiro' }));
    expect(container.querySelector('.landing-demo-task')).toHaveTextContent('movimento ilustrativo do período');
    expect(container.querySelector('.landing-demo-poster img')).toHaveAttribute('src', '/landing/phone-beauty-finance.webp');
  });
  it('explica o cadastro sem cartão e mantém o prazo da oferta neutro', () => {
    const { container } = render(<Landing />);
    expect(container).toHaveTextContent(/Sem cartão no cadastro/i);
    expect(container.textContent).not.toMatch(/\d+\s*dias\s*(grátis|de teste|de período)|teste grátis/i);
  });
  it('carrega a simulação apenas sob demanda e respeita a tela escolhida', async () => {
    const { container } = render(<Landing />);
    const business = screen.getByRole('group', { name: 'Negócio da demonstração' });
    const views = screen.getByRole('group', { name: 'Tela da demonstração' });
    await userEvent.click(within(business).getByRole('button', { name: 'Salão de beleza' }));
    await userEvent.click(within(views).getByRole('button', { name: 'Financeiro' }));
    expect(container.querySelector('iframe')).toBeNull();
    expect(screen.getByRole('link', { name: 'Abrir em tela cheia' })).toHaveAttribute('href', '/#/demo/beauty/financeiro');
    await userEvent.click(screen.getByRole('button', { name: 'Explorar a simulação' }));
    expect(screen.getByTitle('Simulação interativa do salão: Financeiro')).toHaveAttribute('src', '/demo-preview#/demo/beauty/financeiro');
    await userEvent.click(within(views).getByRole('button', { name: 'Agendamento online' }));
    expect(screen.getByTitle('Simulação interativa do salão: Agendamento online')).toHaveAttribute('src', '/demo-preview#/demo/beauty/book/simulacao');
    await userEvent.click(screen.getByRole('button', { name: 'Fechar a simulação' }));
    expect(container.querySelector('iframe')).toBeNull();
    expect(container.querySelector('.landing-demo-poster img')).toHaveAttribute('src', '/landing/phone-beauty-booking.webp');
  });
});
