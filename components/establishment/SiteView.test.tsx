import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SiteView } from './SiteView';
import { defaultConfig, type SiteConfig, type SiteData } from '../../lib/establishment/model';

const baseData: SiteData = {
  id: 'est-1',
  slug: 'corte-fino',
  name: 'Corte Fino',
  kind: 'barber',
  region: 'BR',
  demo: false,
  logo: '/presenca/demo-logo-barber.svg',
  cover: '/presenca/rhian/barber-hero.webp',
  address: 'Rua das Flores, 50 — Centro',
  phone: '11999998888',
  instagram: 'cortefino',
  hours: [
    { day: 'Segunda a sexta', hours: '09h às 20h' },
    { day: 'Sábado', hours: '09h às 18h' },
    { day: 'Domingo', hours: 'Fechado' },
  ],
  services: [
    {
      id: 'srv-1',
      name: 'Corte masculino',
      category: 'Cabelo',
      description: 'Corte com tesoura e máquina.',
      includes: ['Consulta', 'Lavagem'],
      duration: 45,
      price: 65,
      image: '/demo/barbearia/servico-corte-masculino.webp',
    },
    {
      id: 'srv-2',
      name: 'Barba completa',
      category: 'Barba',
      description: 'Toalha quente e navalha.',
      includes: ['Toalha quente'],
      duration: 30,
      price: 45,
    },
  ],
  clubPlans: [
    {
      id: 'plan-1',
      name: 'Clube Corte em Dia',
      description: 'Cortes semanais com horário reservado.',
      priceCents: 13900,
      usageLimitPerMonth: 4,
    },
  ],
  team: [
    { id: 'pro-1', name: 'Rafael Costa', bio: 'Degradê', image: '/presenca/rhian/barber-portrait.webp' },
    { id: 'pro-2', name: 'Lucas Mendes', bio: 'Tesoura', image: '/presenca/rhian/barber-fade.webp' },
  ],
  gallery: [
    { src: '/presenca/rhian/barber-hero.webp', alt: 'Bancada iluminada' },
    { src: '/presenca/rhian/barber-fade.webp', alt: 'Acabamento na navalha' },
  ],
  reviews: [{ id: 'rev-1', name: 'Bruno M.', rating: 5, comment: 'Pontual e ótimo acabamento.' }],
  rating: 4.9,
  reviewCount: 42,
};

afterEach(() => {
  window.location.hash = '';
});

describe('SiteView public site', () => {
  it('não exibe nenhuma menção ao AgendiX nem inventa cidade fora do endereço', () => {
    const config: SiteConfig = {
      ...defaultConfig(baseData),
      headline: 'Barbearia no Centro com hora marcada',
    };
    const { container } = render(<SiteView data={baseData} config={config} />);

    expect(container.textContent?.toLowerCase()).not.toContain('agendix');
    const kicker = container.querySelector('.es-hero .es-kicker');
    expect(kicker).toHaveTextContent('Centro');
    expect(kicker?.textContent).not.toContain('Barbearia');
    expect(kicker?.textContent).not.toContain('São Paulo');

    expect(screen.queryByRole('link', { name: 'Privacidade' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Termos' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Privacidade' }));
    expect(screen.getByText('Política de Privacidade')).toBeInTheDocument();
    expect(container.textContent?.toLowerCase()).not.toContain('agendix');
    fireEvent.click(screen.getByRole('button', { name: 'Fechar aviso' }));
    fireEvent.click(screen.getByRole('button', { name: 'Termos' }));
    expect(screen.getByText('Termos de Uso')).toBeInTheDocument();
    expect(container.textContent?.toLowerCase()).not.toContain('agendix');
    fireEvent.click(screen.getByRole('button', { name: 'Entendi' }));
    expect(screen.getByText('Agendamento online com confirmação rápida')).toBeInTheDocument();
  });

  it('renderiza logo nos modos both e logo, com fallback quando a imagem falha', () => {
    const { container, rerender } = render(
      <SiteView data={baseData} config={{ ...defaultConfig(baseData), logoDisplay: 'both' }} />,
    );
    const wordmark = container.querySelector('.es-wordmark')!;
    expect(wordmark).toHaveAttribute('data-logo-mode', 'both');
    expect(wordmark.querySelector('img.es-brand-logo')).toHaveAttribute('src', '/presenca/demo-logo-barber.svg');
    expect(wordmark.querySelector('.es-wordmark-text b')).toHaveTextContent('Corte Fino');

    rerender(<SiteView data={baseData} config={{ ...defaultConfig(baseData), logoDisplay: 'logo' }} />);
    expect(wordmark).toHaveAttribute('data-logo-mode', 'logo');
    expect(wordmark.querySelector('span.es-sr')).toHaveTextContent('Corte Fino');

    const img = wordmark.querySelector('img.es-brand-logo')!;
    fireEvent.error(img);
    expect(wordmark.querySelector('img.es-brand-logo')).toBeNull();
    expect(wordmark.querySelector('.es-wordmark-text b')).toHaveTextContent('Corte Fino');
  });

  it('respeita presets independentes do kind, coverRemoved, ctaLabel e oferta com validade', () => {
    const config: SiteConfig = {
      ...defaultConfig(baseData),
      preset: 'salon',
      style: 'light',
      coverRemoved: true,
      ctaLabel: 'Reservar meu horário',
      offer: {
        enabled: true,
        kind: 'combo',
        title: 'Combo corte + barba',
        condition: 'Para reservas às quartas-feiras.',
        expires: '2099-12-31',
      },
    };
    const { container } = render(<SiteView data={baseData} config={config} />);

    expect(container.querySelector('.establishment')).toHaveAttribute('data-preset', 'salon');
    expect(container.querySelector('.es-hero')).toHaveClass('es-no-cover');
    expect(container.querySelector('.es-hero-media')).toBeNull();
    expect(screen.getAllByRole('button', { name: 'Reservar meu horário' }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Combo especial')).toBeInTheDocument();
    expect(screen.getByText('Válido até 31/12/2099')).toBeInTheDocument();
  });

  it('filtra serviços por categoria quando há 2 ou mais categorias', async () => {
    const user = userEvent.setup();
    render(<SiteView data={baseData} config={defaultConfig(baseData)} />);

    expect(screen.getByRole('button', { name: 'Todos' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Corte masculino')).toBeInTheDocument();
    expect(screen.getByText('Barba completa')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Barba' }));
    expect(screen.getByRole('button', { name: 'Barba' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('Corte masculino')).not.toBeInTheDocument();
    expect(screen.getByText('Barba completa')).toBeInTheDocument();
  });

  it('abre lightbox acessível na galeria com navegação entre fotos', async () => {
    const user = userEvent.setup();
    render(<SiteView data={baseData} config={defaultConfig(baseData)} />);

    await user.click(screen.getByRole('button', { name: 'Ampliar foto: Bancada iluminada' }));
    const lightbox = document.querySelector('dialog.es-lightbox')!;
    expect(lightbox).toHaveAttribute('open');
    expect(within(lightbox as HTMLElement).getByText('1 / 2')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Próxima foto' }));
    expect(within(lightbox as HTMLElement).getByText('2 / 2')).toBeInTheDocument();
    expect(within(lightbox as HTMLElement).getByText('Acabamento na navalha')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Fechar imagem' }));
    expect(lightbox).not.toHaveAttribute('open');
  });

  it('exibe clube, avaliações verificadas e ponto de referência na localização', () => {
    const config: SiteConfig = {
      ...defaultConfig(baseData),
      contact: { addressNote: 'Ao lado do metrô Centro' },
    };
    const { container } = render(<SiteView data={baseData} config={config} />);

    expect(screen.getByRole('heading', { name: 'Clube e planos mensais' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Quero assinar' })).toHaveAttribute('href', '/#/clube/corte-fino');
    expect(screen.getByText('Avaliações verificadas')).toBeInTheDocument();
    expect(screen.queryByText('Avaliações do Google')).not.toBeInTheDocument();
    expect(screen.getByText(/Ao lado do metrô Centro/)).toBeInTheDocument();
    expect(container.querySelector('.es-hours-today')).not.toBeNull();
  });

  it('exibe página de serviço com antes/depois, WhatsApp e barra fixa com preço', () => {
    const config: SiteConfig = {
      ...defaultConfig(baseData),
      beforeAfter: [
        {
          before: '/presenca/rhian/barber-hero.webp',
          after: '/presenca/rhian/barber-fade.webp',
          caption: 'Corte e acabamento',
        },
      ],
    };
    const { container } = render(<SiteView data={baseData} config={config} serviceId="srv-1" />);

    expect(screen.getByRole('heading', { name: 'Antes e depois' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Tirar dúvida no WhatsApp' }).length).toBeGreaterThanOrEqual(1);
    const sticky = container.querySelector('.es-sticky')!;
    expect(sticky).toHaveAttribute('data-has-price', 'true');
    expect(sticky).toHaveTextContent('R$ 65');
    expect(within(sticky as HTMLElement).getByRole('button', { name: 'Agendar este serviço' })).toBeInTheDocument();
  });

  it('repassa origem válida e mostra saída para WhatsApp no diálogo de agendamento', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/site/corte-fino?origem=instagram';
    render(<SiteView data={baseData} config={defaultConfig(baseData)} />);

    const cta = document.querySelector('.es-sticky .es-button') as HTMLButtonElement;
    await user.click(cta);

    const dialog = document.querySelector('dialog.es-booking-dialog')!;
    expect(dialog).toHaveAttribute('open');
    expect(within(dialog as HTMLElement).getByRole('link', { name: 'Prefere falar no WhatsApp?' })).toBeInTheDocument();
    const iframe = screen.getByTitle('Agendamento do estabelecimento');
    expect(iframe).toHaveAttribute('src', expect.stringContaining('origem=instagram'));
  });
});
