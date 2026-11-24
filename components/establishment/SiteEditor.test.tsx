import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SiteEditor } from './SiteEditor';
import { defaultConfig, type SiteData } from '../../lib/establishment/model';

const data: SiteData = {
  id: 'business', slug: 'navalha-fina', name: 'Navalha Fina', kind: 'barber', region: 'BR', demo: true,
  cover: '/presenca/rhian/barber-hero.jpg', address: 'Rua dos Pinheiros, 100 — Pinheiros, São Paulo',
  hours: [{ day: 'Segunda', hours: '09:00–20:00' }],
  services: [{ id: 'cut', name: 'Corte', includes: [], duration: 30, price: 65 }],
  team: [], gallery: [], reviews: [], reviewCount: 0,
};

describe('SiteEditor panel', () => {
  it('mostra as cores recomendadas em destaque e uma opção personalizada', async () => {
    const user = userEvent.setup();
    render(<SiteEditor data={data} initial={defaultConfig(data)} companyId="business" demo />);
    expect(screen.getByRole('radio', { name: /Urbano preciso, recomendada/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('Recomendada', { selector: '.se-swatch[aria-checked=true] .se-swatch-badge' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Editorial clássico, recomendada/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Salão claro, recomendada/i })).toBeInTheDocument();
    expect(screen.getAllByText('Recomendada').length).toBeGreaterThanOrEqual(3);
    await user.click(screen.getByRole('radio', { name: /Personalizada/i }));
    expect(screen.getByLabelText('Cor personalizada')).toBeInTheDocument();
  });

  it('mantém a prévia ao vivo visível junto dos controles no celular', async () => {
    const user = userEvent.setup();
    render(<SiteEditor data={data} initial={defaultConfig(data)} companyId="business" demo />);
    expect(screen.getByTitle('Prévia ao vivo do meu site')).toBeVisible();
    expect(screen.getByLabelText(/^Frase principal/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Prévia no celular' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Ver em tela cheia' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Prévia no computador' }));
    expect(screen.getByRole('button', { name: 'Prévia no computador' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText(/^Frase principal/)).toBeVisible();
  });

  it('abre a prévia em tela cheia e volta ao editor sem perder os controles', async () => {
    const user = userEvent.setup();
    render(<SiteEditor data={data} initial={defaultConfig(data)} companyId="business" demo />);
    await user.click(screen.getByRole('button', { name: 'Ver em tela cheia' }));
    expect(screen.getByRole('button', { name: 'Voltar ao editor' })).toBeVisible();
    expect(screen.getByTitle('Prévia ao vivo do meu site')).toBeVisible();
    expect(document.querySelector('.se-preview')).toHaveAttribute('data-expanded', 'true');
    await user.click(screen.getByRole('button', { name: 'Voltar ao editor' }));
    expect(screen.queryByRole('button', { name: 'Voltar ao editor' })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/^Frase principal/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Ver em tela cheia' })).toBeVisible();
  });

  it('avisa quando a cor personalizada exige ajuste de contraste', async () => {
    const user = userEvent.setup();
    render(<SiteEditor data={data} initial={defaultConfig(data)} companyId="business" demo />);
    await user.click(screen.getByRole('radio', { name: /Personalizada/i }));
    await userEvent.clear(screen.getByLabelText('Cor personalizada'));
    await user.type(screen.getByLabelText('Cor personalizada'), '#777777');
    expect(await screen.findByRole('status')).toHaveTextContent(/contraste|leitura/i);
  });
});
