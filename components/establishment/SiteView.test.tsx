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
    expect(container.textContent).not.toContain('São Paulo');
    expect(container.querySelector('.es-hero h1')).toHaveTextContent('Barbearia no Centro com hora marcada');

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

  it('respeita presets independentes do kind, coverRemoved, ctaLabel e oferta em uma linha com validade', () => {
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
    const offerLine = container.querySelector('.es-hero .es-offer-line');
    expect(offerLine).toHaveTextContent('Combo corte + barba');
    expect(offerLine).toHaveTextContent('Válido até 31/12/2099');
  });

  it('exibe cardápio direto sem chips para poucos serviços e agrupa tipograficamente quando há mais de 6 serviços', () => {
    const { container, rerender } = render(<SiteView data={baseData} config={defaultConfig(baseData)} />);

    expect(container.querySelector('.es-category-chip')).toBeNull();
    expect(container.querySelectorAll('.es-menu-item')).toHaveLength(2);
    expect(screen.getByText('Corte masculino')).toBeInTheDocument();
    expect(screen.getByText('Barba completa')).toBeInTheDocument();

    const manyServices: SiteData = {
      ...baseData,
      services: [
        ...baseData.services,
        { id: 'srv-3', name: 'Degradê', category: 'Cabelo', includes: [], duration: 40, price: 60 },
        { id: 'srv-4', name: 'Sobrancelha', category: 'Acabamento', includes: [], duration: 15, price: 25 },
        { id: 'srv-5', name: 'Hidratação', category: 'Cabelo', includes: [], duration: 30, price: 50 },
        { id: 'srv-6', name: 'Barboterapia', category: 'Barba', includes: [], duration: 40, price: 55 },
        { id: 'srv-7', name: 'Pigmentação', category: 'Acabamento', includes: [], duration: 30, price: 45 },
      ],
    };
    rerender(<SiteView data={manyServices} config={defaultConfig(manyServices)} />);
    expect(container.querySelectorAll('.es-menu-group-title')).toHaveLength(3);
    expect(container.querySelector('.es-category-chip')).toBeNull();
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

  it('exibe clube, nota com total de avaliações sem citar Google e ponto de referência na localização', () => {
    const config: SiteConfig = {
      ...defaultConfig(baseData),
      contact: { addressNote: 'Ao lado do metrô Centro' },
    };
    const { container } = render(<SiteView data={baseData} config={config} />);

    expect(screen.getByRole('heading', { name: 'Clube' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Quero assinar' })).toHaveAttribute('href', '/#/clube/corte-fino');
    expect(container.querySelector('.es-rating-line')).toHaveTextContent('4,9');
    expect(container.querySelector('.es-rating-line')).toHaveTextContent('42 avaliações');
    expect(screen.queryByText('Avaliações do Google')).not.toBeInTheDocument();
    expect(screen.getByText(/Ao lado do metrô Centro/)).toBeInTheDocument();
    expect(container.querySelector('.es-hours-today')).not.toBeNull();
  });

  it('exibe página de serviço com antes/depois, WhatsApp e agendamento no fluxo natural sem barra fixa', () => {
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
    expect(container.querySelector('.es-sticky')).toBeNull();
    expect(container.querySelector('.es-decision')).toHaveTextContent('R$ 65');
    expect(within(container.querySelector('.es-detail-actions') as HTMLElement).getByRole('button', { name: 'Agendar este serviço' })).toBeInTheDocument();
  });

  it('repassa origem válida e mostra saída para WhatsApp no diálogo de agendamento', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/site/corte-fino?origem=instagram';
    render(<SiteView data={baseData} config={defaultConfig(baseData)} />);

    const cta = document.querySelector('.es-hero .es-button') as HTMLButtonElement;
    await user.click(cta);

    const dialog = document.querySelector('dialog.es-booking-dialog')!;
    expect(dialog).toHaveAttribute('open');
    expect(within(dialog as HTMLElement).getByRole('link', { name: 'Prefere falar no WhatsApp?' })).toBeInTheDocument();
    const iframe = screen.getByTitle('Agendamento do estabelecimento');
    expect(iframe).toHaveAttribute('src', expect.stringContaining('origem=instagram'));
  });

  it('exibe mini mapa interativo seguro para site real, inicia travado contra scroll trap e limpa link malicioso', async () => {
    const user = userEvent.setup();
    const config: SiteConfig = {
      ...defaultConfig(baseData),
      contact: {
        address: 'Av. Paulista, 1000 — Bela Vista, São Paulo',
        addressNote: 'Próximo ao metrô Trianon-Masp',
        lat: -23.5649,
        lng: -46.6519,
        mapsUrl: 'javascript:alert(1)',
      },
    };
    const { container } = render(<SiteView data={baseData} config={config} />);

    const mapIframe = screen.getByTitle('Mapa com a localização de Corte Fino');
    expect(mapIframe).toHaveAttribute('src', 'https://www.google.com/maps?q=-23.5649%2C-46.6519&hl=pt-BR&z=16&output=embed');
    expect(mapIframe).toHaveAttribute('loading', 'lazy');
    expect(mapIframe).toHaveAttribute('referrerpolicy', 'strict-origin-when-cross-origin');

    const mapBox = container.querySelector('.es-map-embed')!;
    expect(mapBox).not.toHaveAttribute('data-interactive', 'true');
    const toggleBtn = screen.getByRole('button', { name: 'Explorar mapa' });
    expect(toggleBtn).toHaveAttribute('aria-pressed', 'false');
    await user.click(toggleBtn);
    expect(mapBox).toHaveAttribute('data-interactive', 'true');
    expect(screen.getByRole('button', { name: 'Bloquear mapa' })).toHaveAttribute('aria-pressed', 'true');

    expect(screen.getByText('Av. Paulista, 1000 — Bela Vista, São Paulo')).toBeInTheDocument();
    expect(screen.getByText(/Próximo ao metrô Trianon-Masp/)).toBeInTheDocument();
    const directions = screen.getByRole('link', { name: 'Como chegar' });
    expect(directions).toHaveAttribute('href', 'https://www.google.com/maps/search/?api=1&query=-23.5649,-46.6519');
    expect(container.textContent?.toLowerCase()).not.toContain('agendix');
  });

  it('mantém mapa ilustrativo sem iframe externo no modo demonstração', () => {
    render(<SiteView data={{ ...baseData, demo: true }} config={defaultConfig(baseData)} />);
    expect(screen.queryByTitle(/Mapa com a localização/i)).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Mapa ilustrativo/i })).toBeInTheDocument();
  });

  it('oferece comparador interativo Antes e Depois acessível por teclado na sua própria seção', () => {
    const config: SiteConfig = {
      ...defaultConfig(baseData),
      beforeAfter: [
        {
          before: '/presenca/rhian/barber-before.webp',
          after: '/presenca/rhian/barber-after.webp',
          caption: 'Degradê e acabamento',
        },
      ],
    };
    const { container } = render(<SiteView data={baseData} config={config} />);

    const section = container.querySelector('#beforeAfter');
    expect(section).not.toBeNull();
    expect(section?.querySelectorAll('.es-before figure img')).toHaveLength(2);

    const slider = screen.getByRole('slider', { name: /comparar antes e depois/i });
    expect(slider).toHaveAttribute('aria-valuemin', '5');
    expect(slider).toHaveAttribute('aria-valuemax', '95');
    expect(slider).toHaveAttribute('aria-valuenow', '50');

    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(slider).toHaveAttribute('aria-valuenow', '55');
    fireEvent.keyDown(slider, { key: 'ArrowUp' });
    expect(slider).toHaveAttribute('aria-valuenow', '60');
    fireEvent.keyDown(slider, { key: 'PageDown' });
    expect(slider).toHaveAttribute('aria-valuenow', '45');
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(slider).toHaveAttribute('aria-valuenow', '40');
    fireEvent.keyDown(slider, { key: 'ArrowDown' });
    expect(slider).toHaveAttribute('aria-valuenow', '35');
    fireEvent.keyDown(slider, { key: 'PageUp' });
    expect(slider).toHaveAttribute('aria-valuenow', '50');
    fireEvent.keyDown(slider, { key: 'Home' });
    expect(slider).toHaveAttribute('aria-valuenow', '5');
    fireEvent.keyDown(slider, { key: 'End' });
    expect(slider).toHaveAttribute('aria-valuenow', '95');
    expect(slider).toHaveAttribute('aria-valuetext', '95% antes, 5% depois');
  });

  it('renderiza FAQ como acordeão acessível com aria-expanded, aria-controls e aria-hidden', async () => {
    const user = userEvent.setup();
    const config: SiteConfig = {
      ...defaultConfig(baseData),
      faq: [
        { question: 'Preciso agendar antes?', answer: 'Sim, reserve seu horário online.' },
        { question: 'Aceitam cartão?', answer: 'Sim, crédito, débito e Pix.' },
      ],
    };
    render(<SiteView data={baseData} config={config} />);

    const trigger = screen.getByRole('button', { name: 'Preciso agendar antes?' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    const panelId = trigger.getAttribute('aria-controls');
    expect(panelId).toBeTruthy();
    const panel = document.getElementById(panelId!);
    expect(panel).not.toHaveAttribute('data-open', 'true');
    expect(panel).toHaveAttribute('aria-hidden', 'true');

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(panel).toHaveAttribute('data-open', 'true');
    expect(panel).toHaveAttribute('aria-hidden', 'false');

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(panel).not.toHaveAttribute('data-open', 'true');
    expect(panel).toHaveAttribute('aria-hidden', 'true');
  });

  it('exibe nome completo na equipe sem duplicar especialidade e expõe data-count na galeria', () => {
    const { container } = render(<SiteView data={baseData} config={defaultConfig(baseData)} />);

    const teamHeadings = Array.from(container.querySelectorAll('#team article h3')).map(el => el.textContent);
    expect(teamHeadings).toEqual(['Rafael Costa', 'Lucas Mendes']);
    expect(container.querySelector('.es-gallery')).toHaveAttribute('data-count', '2');
  });

  it('sincroniza theme-color no modo público e mantém prévia imediata sem estados ocultos', () => {
    let meta = document.head.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = '#121212';
      document.head.appendChild(meta);
    }

    const { unmount } = render(
      <SiteView data={baseData} config={{ ...defaultConfig(baseData), preset: 'salon', style: 'light', background: '#FFFFFF' }} />,
    );
    expect(meta.content.toLowerCase()).toBe('#ffffff');
    unmount();
    expect(meta.content.toLowerCase()).toBe('#121212');

    const { container } = render(<SiteView data={baseData} config={defaultConfig(baseData)} preview />);
    expect(container.querySelector('[data-reveal="pending"]')).toBeNull();
  });

  it('marca data-dark-surface pela luminosidade real e cai para cartaz tipográfico se a capa quebrar', () => {
    const emptyTrustData: SiteData = {
      ...baseData,
      rating: undefined,
      reviewCount: 0,
      hours: [],
    };
    const { container } = render(
      <SiteView
        data={emptyTrustData}
        config={{ ...defaultConfig(emptyTrustData), style: 'dark', background: '#F5EFE6' }}
      />,
    );
    expect(container.querySelector('.establishment')).toHaveAttribute('data-dark-surface', 'false');
    expect(container.querySelector('.es-rating-line')).toBeNull();

    const heroImg = container.querySelector('.es-hero-photo img')!;
    expect(container.querySelector('.es-hero')).not.toHaveClass('es-no-cover');
    fireEvent.error(heroImg);
    expect(container.querySelector('.es-hero')).toHaveClass('es-no-cover');
    expect(container.querySelector('.es-hero-media')).toBeNull();
  });

  it('mantém fallback textual de imagem quebrada no lightbox mesmo após término da transição', async () => {
    const user = userEvent.setup();
    render(<SiteView data={baseData} config={defaultConfig(baseData)} />);

    await user.click(screen.getByRole('button', { name: 'Ampliar foto: Bancada iluminada' }));
    await user.click(screen.getByRole('button', { name: 'Próxima foto' }));
    const lightboxImg = document.querySelector('dialog.es-lightbox img')!;
    fireEvent.error(lightboxImg);
    expect(screen.getByText('Não foi possível carregar esta imagem.')).toBeInTheDocument();

    await new Promise(resolve => setTimeout(resolve, 220));
    expect(screen.getByText('Não foi possível carregar esta imagem.')).toBeInTheDocument();
  });
});
