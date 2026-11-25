import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SiteEditor } from './SiteEditor';
import { defaultConfig, type SiteData } from '../../lib/establishment/model';

const { uploadSiteLogoMock, loadOwnerSiteMock, toDataUrlMock } = vi.hoisted(() => ({
  uploadSiteLogoMock: vi.fn(),
  loadOwnerSiteMock: vi.fn(),
  toDataUrlMock: vi.fn(),
}));

vi.mock('../../services/establishmentPhotos', () => ({
  uploadSiteLogo: uploadSiteLogoMock,
  uploadSitePhoto: vi.fn(),
}));

vi.mock('../../services/establishmentSite', async () => {
  const actual = await vi.importActual<typeof import('../../services/establishmentSite')>('../../services/establishmentSite');
  return {
    ...actual,
    loadOwnerSite: loadOwnerSiteMock,
  };
});

vi.mock('qrcode', () => ({
  default: { toDataURL: toDataUrlMock },
  toDataURL: toDataUrlMock,
}));

const data: SiteData = {
  id: 'business',
  slug: 'navalha-fina',
  name: 'Navalha Fina',
  kind: 'barber',
  region: 'BR',
  demo: true,
  logo: '/presenca/demo-logo-barber.svg',
  cover: '/presenca/rhian/barber-hero.jpg',
  address: 'Rua dos Pinheiros, 100 — Pinheiros, São Paulo',
  phone: '11999998888',
  hours: [{ day: 'Segunda', hours: '09:00–20:00' }],
  services: [{ id: 'cut', name: 'Corte', description: 'Corte preciso.', includes: [], duration: 30, price: 65 }],
  clubPlans: [{ id: 'club-1', name: 'Clube Navalha', priceCents: 13900, usageLimitPerMonth: 4 }],
  team: [{ id: 'pro-1', name: 'Rafael Costa', bio: 'Degradê' }],
  gallery: [
    { src: '/presenca/rhian/barber-hero.jpg', alt: 'Salão principal' },
    { src: '/presenca/rhian/barber-fade.jpg', alt: 'Acabamento degradê' },
  ],
  reviews: [],
  reviewCount: 0,
};

beforeEach(() => {
  localStorage.clear();
  uploadSiteLogoMock.mockReset();
  loadOwnerSiteMock.mockReset();
  toDataUrlMock.mockReset();
  toDataUrlMock.mockResolvedValue(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  );
});

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

  it('mantém a prévia ao vivo visível junto dos controles no celular e permite recolher', async () => {
    const user = userEvent.setup();
    render(<SiteEditor data={data} initial={defaultConfig(data)} companyId="business" demo />);
    expect(screen.getByTitle('Prévia ao vivo do meu site')).toBeVisible();
    expect(screen.getByLabelText(/^Frase principal/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Prévia no celular' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Ver em tela cheia' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Prévia no computador' }));
    expect(screen.getByRole('button', { name: 'Prévia no computador' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText(/^Frase principal/)).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Recolher prévia' }));
    expect(document.querySelector('.se-workspace')).toHaveAttribute('data-preview-collapsed', 'true');
    expect(screen.getByRole('button', { name: 'Mostrar prévia' })).toBeVisible();
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
    await user.clear(screen.getByLabelText('Cor personalizada'));
    await user.type(screen.getByLabelText('Cor personalizada'), '#777777');
    expect(await screen.findByRole('status')).toHaveTextContent(/contraste|leitura/i);
  });

  it('gerencia logo, modo de exibição no topo e os 3 estilos prontos', async () => {
    const user = userEvent.setup();
    render(<SiteEditor data={data} initial={defaultConfig(data)} companyId="business" demo />);

    await user.click(screen.getByText('Estilo e identidade'));
    expect(screen.getByAltText('Logo selecionado')).toHaveAttribute('src', '/presenca/demo-logo-barber.svg');

    await user.click(screen.getByRole('button', { name: 'Só o logo' }));
    expect(screen.getByRole('button', { name: 'Só o logo' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: /^Sem logo$/ }));
    expect(screen.queryByAltText('Logo selecionado')).not.toBeInTheDocument();
    expect(screen.getByText('Sem logo', { selector: '.se-logo-empty' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Logo ilustrativo da casa' }));
    expect(screen.getByAltText('Logo selecionado')).toHaveAttribute('src', '/presenca/demo-logo-barber.svg');

    await user.click(screen.getByRole('button', { name: 'Salão luminoso' }));
    expect(screen.getByRole('button', { name: 'Salão luminoso' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('radio', { name: /Salão claro, recomendada/i })).toHaveAttribute('aria-checked', 'true');

    await user.click(screen.getByRole('button', { name: 'Editorial clássico' }));
    expect(screen.getByRole('button', { name: 'Editorial clássico' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('radio', { name: /Editorial clássico, recomendada/i })).toHaveAttribute('aria-checked', 'true');
  });

  it('envia logo personalizado no modo autenticado e exibe feedback', async () => {
    const user = userEvent.setup();
    const initial = defaultConfig(data);
    loadOwnerSiteMock.mockResolvedValue({
      config: initial,
      storage: 'local',
      published: false,
      presenceEnabled: false,
    });
    uploadSiteLogoMock.mockResolvedValue('https://cdn.example.com/logos/business/novo-logo.webp');

    render(<SiteEditor data={{ ...data, demo: false }} initial={initial} companyId="business" embedded />);
    await user.click(screen.getByText('Estilo e identidade'));

    const fileInput = screen.getByLabelText(/Trocar logo|Enviar logo/i) as HTMLInputElement;
    const file = new File(['png-bytes'], 'logo.png', { type: 'image/png' });
    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(uploadSiteLogoMock).toHaveBeenCalledWith('business', file);
      expect(screen.getByAltText('Logo selecionado')).toHaveAttribute(
        'src',
        'https://cdn.example.com/logos/business/novo-logo.webp',
      );
    });

    await user.click(screen.getByRole('button', { name: 'Remover logo' }));
    expect(screen.queryByAltText('Logo selecionado')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Usar logo do cadastro' }));
    expect(screen.getByAltText('Logo selecionado')).toHaveAttribute('src', '/presenca/demo-logo-barber.svg');
  });

  it('exibe checklist interativo com progresso e abre o bloco pendente ao clicar no chip', async () => {
    const user = userEvent.setup();
    const incompleteData: SiteData = {
      ...data,
      logo: undefined,
      cover: undefined,
      gallery: [],
      phone: undefined,
      address: '',
      services: [{ id: 'cut', name: 'Corte', includes: [], duration: 30, price: 65 }],
    };
    const incompleteConfig = { ...defaultConfig(incompleteData), headline: 'Curto' };
    render(<SiteEditor data={incompleteData} initial={incompleteConfig} companyId="business-inc" demo />);

    expect(screen.getByText(/Seu site está 0% pronto/i)).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');

    const photosSection = screen.getByText('Fotos, serviços e equipe').closest('details')!;
    expect(photosSection.open).toBe(false);

    await user.click(screen.getByRole('button', { name: 'Adicionar fotos' }));
    expect(photosSection.open).toBe(true);
  });

  it('oferece galeria visual com miniaturas sem textarea de URLs', async () => {
    const user = userEvent.setup();
    render(<SiteEditor data={data} initial={defaultConfig(data)} companyId="business" demo />);

    await user.click(screen.getByText('Fotos, serviços e equipe'));
    expect(screen.queryByLabelText(/uma URL por linha/i)).not.toBeInTheDocument();

    const firstAlt = screen.getByLabelText('Descrição da foto 1');
    expect(firstAlt).toHaveValue('Salão principal');
    await user.clear(firstAlt);
    await user.type(firstAlt, 'Cadeira clássica na janela');
    expect(firstAlt).toHaveValue('Cadeira clássica na janela');

    await user.click(screen.getByRole('button', { name: 'Mover foto 2 para cima' }));
    expect(screen.getByLabelText('Descrição da foto 1')).toHaveValue('Acabamento degradê');

    await user.click(screen.getByRole('button', { name: 'Remover foto 1' }));
    expect(screen.queryByLabelText('Descrição da foto 2')).not.toBeInTheDocument();
  });

  it('permite editar diferenciais item a item, ponto de referência, clube e sugestões de FAQ', async () => {
    const user = userEvent.setup();
    render(<SiteEditor data={data} initial={defaultConfig(data)} companyId="business" demo />);

    await user.click(screen.getByRole('button', { name: 'Adicionar diferencial' }));
    const diffInput = screen.getByLabelText('Diferencial 1');
    await user.type(diffInput, 'Café passado na hora');
    expect(diffInput).toHaveValue('Café passado na hora');

    await user.click(screen.getByText('Seções e ordem da página'));
    expect(screen.getByLabelText('Clube e planos')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '+ Formas de pagamento' }));
    expect(screen.getByDisplayValue('Quais formas de pagamento vocês aceitam?')).toBeInTheDocument();

    const referenceInput = screen.getByLabelText('Ponto de referência');
    await user.type(referenceInput, 'Ao lado do metrô Fradique Coutinho');
    expect(referenceInput).toHaveValue('Ao lado do metrô Fradique Coutinho');
  });

  it('mostra prévia do Google, checklist, canais de compartilhamento e QR Code', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);

    render(<SiteEditor data={data} initial={defaultConfig(data)} companyId="business" demo />);
    await user.click(screen.getByText('Google e compartilhar'));

    const googlePreview = screen.getByLabelText('Prévia do resultado no Google');
    expect(googlePreview).toHaveTextContent('Navalha Fina');
    expect(screen.getByText(/Confira com seu Perfil da Empresa no Google/i)).toBeInTheDocument();
    const googleCheck = screen.getByText(/Confira com seu Perfil da Empresa no Google/i).closest('.se-google-check')!;
    expect(googleCheck).toHaveTextContent('Rua dos Pinheiros, 100 — Pinheiros, São Paulo');

    await waitFor(() => {
      expect(screen.getByAltText('QR Code de Navalha Fina')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Copiar link para bio do Instagram' }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('/#/site/navalha-fina?origem=instagram'));

    await user.click(screen.getByRole('button', { name: 'Copiar link para perfil do Google' }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('/#/site/navalha-fina?origem=google'));

    const waLink = screen.getByRole('link', { name: 'Enviar no WhatsApp' });
    expect(waLink).toHaveAttribute('href', expect.stringMatching(/^https:\/\/wa\.me\/\?text=/));
    expect(
      decodeURIComponent(waLink.getAttribute('href')!)
        .toLowerCase()
        .replace(/https?:\/\/\S+/g, ''),
    ).not.toContain('agendix');

    await user.click(screen.getByRole('button', { name: 'Imprimir plaquinha' }));
    expect(openSpy).toHaveBeenCalled();
    expect(await screen.findByRole('status')).toHaveTextContent(/pop-ups|plaquinha/i);
    openSpy.mockRestore();
  });

  it('suporta restaurar padrão com confirmação inline sem window.confirm', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm');
    render(<SiteEditor data={data} initial={defaultConfig(data)} companyId="business" demo />);

    await user.clear(screen.getByLabelText(/^Frase principal/));
    await user.type(screen.getByLabelText(/^Frase principal/), 'Texto alterado');
    expect(screen.getByLabelText(/^Frase principal/)).toHaveValue('Texto alterado');

    await user.click(screen.getByText('Google e compartilhar'));
    await user.click(screen.getByRole('button', { name: 'Restaurar padrão' }));
    expect(screen.getByText(/Voltar tudo ao padrão inicial/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sim, restaurar' }));
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/^Frase principal/)).toHaveValue(defaultConfig(data).headline);
    confirmSpy.mockRestore();
  });
});
