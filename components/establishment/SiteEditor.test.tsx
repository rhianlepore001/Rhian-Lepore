import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SiteEditor } from './SiteEditor';
import { defaultConfig, type SiteData } from '../../lib/establishment/model';

const { uploadSiteLogoMock, deleteSiteLogoMock, loadOwnerSiteMock, saveOwnerSiteDraftMock, publishOwnerSiteMock, unpublishOwnerSiteMock, toDataUrlMock } = vi.hoisted(() => ({
  uploadSiteLogoMock: vi.fn(),
  deleteSiteLogoMock: vi.fn(),
  loadOwnerSiteMock: vi.fn(),
  saveOwnerSiteDraftMock: vi.fn(),
  publishOwnerSiteMock: vi.fn(),
  unpublishOwnerSiteMock: vi.fn(),
  toDataUrlMock: vi.fn(),
}));

vi.mock('../../services/establishmentPhotos', () => ({
  uploadSiteLogo: uploadSiteLogoMock,
  deleteSiteLogo: deleteSiteLogoMock,
  uploadSitePhoto: vi.fn(),
}));

vi.mock('../../services/establishmentSite', async () => {
  const actual = await vi.importActual<typeof import('../../services/establishmentSite')>('../../services/establishmentSite');
  return {
    ...actual,
    loadOwnerSite: loadOwnerSiteMock,
    saveOwnerSiteDraft: saveOwnerSiteDraftMock,
    publishOwnerSite: publishOwnerSiteMock,
    unpublishOwnerSite: unpublishOwnerSiteMock,
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
  cover: '/presenca/rhian/barber-hero.webp',
  address: 'Rua dos Pinheiros, 100 — Pinheiros, São Paulo',
  phone: '11999998888',
  hours: [{ day: 'Segunda', hours: '09:00–20:00' }],
  services: [{ id: 'cut', name: 'Corte', description: 'Corte preciso.', includes: [], duration: 30, price: 65 }],
  clubPlans: [{ id: 'club-1', name: 'Clube Navalha', priceCents: 13900, usageLimitPerMonth: 4 }],
  team: [{ id: 'pro-1', name: 'Rafael Costa', bio: 'Degradê' }],
  gallery: [
    { src: '/presenca/rhian/barber-hero.webp', alt: 'Salão principal' },
    { src: '/presenca/rhian/barber-fade.webp', alt: 'Acabamento degradê' },
  ],
  reviews: [],
  reviewCount: 0,
};

  beforeEach(() => {
    localStorage.clear();
    uploadSiteLogoMock.mockReset();
    deleteSiteLogoMock.mockReset();
    deleteSiteLogoMock.mockResolvedValue(undefined);
    loadOwnerSiteMock.mockReset();
    saveOwnerSiteDraftMock.mockReset();
    saveOwnerSiteDraftMock.mockResolvedValue({ storage: 'remote' });
    publishOwnerSiteMock.mockReset();
    publishOwnerSiteMock.mockResolvedValue({ published: true, sharePageSynced: true });
    unpublishOwnerSiteMock.mockReset();
    unpublishOwnerSiteMock.mockResolvedValue({ published: false, sharePageSynced: true });
  toDataUrlMock.mockReset();
  toDataUrlMock.mockResolvedValue(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  );
});

describe('SiteEditor panel', () => {
  it('mostra apenas uma cor recomendada para o nicho e uma opção personalizada', async () => {
    const user = userEvent.setup();
    render(<SiteEditor data={data} initial={defaultConfig(data)} companyId="business" demo />);
    expect(screen.getByRole('radio', { name: /Urbano preciso, recomendada/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('Recomendada', { selector: '.se-style-card[aria-checked=true] .se-swatch-badge' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Editorial clássico' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Salão luminoso' })).toBeInTheDocument();
    expect(screen.getAllByText('Recomendada')).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: /Personalizar cor de fundo/i }));
    expect(screen.getByLabelText('Cor personalizada')).toBeInTheDocument();
  });

  it('mantém a prévia ao vivo visível junto dos controles no celular e permite recolher', async () => {
    const user = userEvent.setup();
    render(<SiteEditor data={data} initial={defaultConfig(data)} companyId="business" demo />);
    expect(screen.getByTitle('Prévia ao vivo do meu site')).toBeVisible();
    expect(screen.getByRole('tab', { name: '1. Visual' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: 'Prévia no celular' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Ver em tela cheia' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Prévia no computador' }));
    expect(screen.getByRole('button', { name: 'Prévia no computador' })).toHaveAttribute('aria-pressed', 'true');

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
    expect(screen.getByRole('button', { name: 'Ver em tela cheia' })).toBeVisible();
  });

  it('avisa quando a cor personalizada exige ajuste de contraste', async () => {
    const user = userEvent.setup();
    render(<SiteEditor data={data} initial={defaultConfig(data)} companyId="business" demo />);
    await user.click(screen.getByRole('button', { name: /Personalizar cor de fundo/i }));
    await user.clear(screen.getByLabelText('Cor personalizada'));
    await user.type(screen.getByLabelText('Cor personalizada'), '#777777');
    expect(await screen.findByRole('status')).toHaveTextContent(/contraste|leitura/i);
  });

  it('gerencia logo, modo de exibição no topo e os 3 estilos prontos sem endereço externo', async () => {
    const user = userEvent.setup();
    render(<SiteEditor data={data} initial={defaultConfig(data)} companyId="business" demo />);

    expect(screen.queryByText(/Usar o endereço de um logo/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Usar o endereço de uma foto/i)).not.toBeInTheDocument();
    expect(screen.getByAltText('Logo selecionado')).toHaveAttribute('src', '/presenca/demo-logo-barber.svg');

    await user.click(screen.getByRole('button', { name: 'Só o logo' }));
    expect(screen.getByRole('button', { name: 'Só o logo' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: /^Sem logo$/ }));
    expect(screen.queryByAltText('Logo selecionado')).not.toBeInTheDocument();
    expect(screen.getByText('Sem logo', { selector: '.se-logo-empty' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Logo ilustrativo da casa' }));
    expect(screen.getByAltText('Logo selecionado')).toHaveAttribute('src', '/presenca/demo-logo-barber.svg');

    await user.click(screen.getByRole('radio', { name: 'Salão luminoso' }));
    expect(screen.getByRole('radio', { name: 'Salão luminoso' })).toHaveAttribute('aria-checked', 'true');

    await user.click(screen.getByRole('radio', { name: 'Editorial clássico' }));
    expect(screen.getByRole('radio', { name: 'Editorial clássico' })).toHaveAttribute('aria-checked', 'true');
  });

  it('envia logo personalizado no modo autenticado, remove o antigo do Storage via autosave e mostra passo 4 acionável', async () => {
    const user = userEvent.setup();
    const publishedLogo = 'https://lcqwrngscsziysyfhpfj.supabase.co/storage/v1/object/public/logos/business/presenca-logo-publicado.webp';
    const draftLogo1 = 'https://lcqwrngscsziysyfhpfj.supabase.co/storage/v1/object/public/logos/business/presenca-logo-1.webp';
    const draftLogo2 = 'https://lcqwrngscsziysyfhpfj.supabase.co/storage/v1/object/public/logos/business/presenca-logo-2.webp';
    const initial = { ...defaultConfig(data), logo: publishedLogo };
    loadOwnerSiteMock.mockResolvedValue({
      config: initial,
      storage: 'remote',
      published: true,
      presenceEnabled: false,
      publishedLogo,
    });
    uploadSiteLogoMock.mockResolvedValueOnce(draftLogo1).mockResolvedValueOnce(draftLogo2);

    render(<SiteEditor data={{ ...data, demo: false }} initial={initial} companyId="business" embedded autosaveDelayMs={25} />);
    await waitFor(() => {
      expect(screen.getByText(/Liberação pendente/i)).toBeInTheDocument();
    });

    const fileInput = screen.getByLabelText(/Trocar logo|Enviar logo/i) as HTMLInputElement;
    await user.upload(fileInput, new File(['png-1'], 'logo1.png', { type: 'image/png' }));
    await waitFor(() => {
      expect(screen.getByAltText('Logo selecionado')).toHaveAttribute('src', draftLogo1);
    });

    await user.upload(fileInput, new File(['png-2'], 'logo2.png', { type: 'image/png' }));
    await waitFor(() => {
      expect(screen.getByAltText('Logo selecionado')).toHaveAttribute('src', draftLogo2);
    });

    await waitFor(() => {
      expect(saveOwnerSiteDraftMock).toHaveBeenCalled();
      expect(deleteSiteLogoMock).toHaveBeenCalledWith('business', draftLogo1);
    });
    expect(deleteSiteLogoMock).not.toHaveBeenCalledWith('business', publishedLogo);
    expect(localStorage.getItem('agendix:presence:stale-logos:v1:business')).toContain(publishedLogo);
    expect(screen.getByText('Salvo automaticamente')).toBeInTheDocument();
  });

  it('mostra aviso coerente quando o site publica no banco mas a prévia de compartilhamento falha', async () => {
    const user = userEvent.setup();
    const initial = defaultConfig(data);
    loadOwnerSiteMock.mockResolvedValue({
      config: initial,
      storage: 'remote',
      published: false,
      presenceEnabled: true,
    });
    publishOwnerSiteMock.mockResolvedValueOnce({ published: true, sharePageSynced: false });

    render(<SiteEditor data={{ ...data, demo: false }} initial={initial} companyId="business" embedded />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Publicar' })).toBeEnabled();
    });

    await user.click(screen.getByRole('button', { name: 'Publicar' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Publicar alterações' })).toBeInTheDocument();
    });

    expect(screen.getByText(/Site publicado com esta versão/i)).toBeInTheDocument();
    expect(screen.getByText(/Google e WhatsApp não pôde ser atualizada agora/i)).toBeInTheDocument();
    expect(screen.queryByText(/Não foi possível alterar a publicação/i)).not.toBeInTheDocument();
  });

  it('salva automaticamente com debounce, faz flush ao trocar de passo, recupera de erro e só bloqueia saída em envio/erro', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/configuracoes/meu-site';
    const initial = defaultConfig(data);
    loadOwnerSiteMock.mockResolvedValue({
      config: initial,
      storage: 'remote',
      published: false,
      presenceEnabled: true,
    });

    let resolveSlowSave: ((val: { storage: 'remote' }) => void) | null = null;
    saveOwnerSiteDraftMock
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ storage: 'remote' })
      .mockImplementationOnce(
        () => new Promise(resolve => { resolveSlowSave = resolve; }),
      )
      .mockResolvedValue({ storage: 'remote' });

    render(
      <div>
        <a href="#/configuracoes/geral">Ir para Geral</a>
        <SiteEditor data={{ ...data, demo: false }} initial={initial} companyId="business" embedded autosaveDelayMs={250} />
      </div>,
    );

    await waitFor(() => expect(screen.getByRole('button', { name: 'Publicar' })).toBeEnabled());
    await user.click(screen.getByRole('tab', { name: '2. Textos' }));
    const headlineField = screen.getByLabelText(/^Frase principal/);
    await user.click(headlineField);
    await user.clear(headlineField);
    await user.paste('Texto com erro inicial');

    // 1. Erro no autosave mostra Tentar novamente e bloqueia saída ao navegar
    await waitFor(() => expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument());
    await user.click(screen.getByRole('link', { name: 'Ir para Geral' }));
    const errorDialog = await screen.findByRole('alertdialog');
    expect(errorDialog).toHaveTextContent(/Não foi possível salvar/i);
    expect(window.location.hash).toBe('#/configuracoes/meu-site');
    await user.click(screen.getByRole('button', { name: 'Continuar editando' }));

    // 2. Recupera ao clicar em Tentar novamente e navega livremente depois de salvo
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    await waitFor(() => expect(screen.getByText('Salvo automaticamente')).toBeInTheDocument());

    // 3. Flush imediato ao trocar de passo durante debounce (sem esperar delay)
    await user.click(screen.getByLabelText(/^Frase principal/));
    await user.paste(' + flush');
    await user.click(screen.getByRole('tab', { name: '3. Fotos' }));
    await waitFor(() => expect(saveOwnerSiteDraftMock).toHaveBeenCalledTimes(3));
    expect(screen.getByText('Salvando rascunho…')).toBeInTheDocument();

    // 4. Envio em andamento mantém proteção de saída; após finalizar, sai livremente
    await user.click(screen.getByRole('link', { name: 'Ir para Geral' }));
    await screen.findByRole('alertdialog');
    await user.click(screen.getByRole('button', { name: 'Continuar editando' }));

    resolveSlowSave?.({ storage: 'remote' });
    await waitFor(() => expect(screen.getByText('Salvo automaticamente')).toBeInTheDocument());
    await user.click(screen.getByRole('link', { name: 'Ir para Geral' }));
    await waitFor(() => {
      expect(window.location.hash).toBe('#/configuracoes/geral');
    });
  });

  it('permite editar endereço completo, ponto de referência e link/coordenadas do Google Maps em Contato e endereço', async () => {
    const user = userEvent.setup();
    render(<SiteEditor data={data} initial={defaultConfig(data)} companyId="business" demo autosaveDelayMs={50} />);

    await user.click(screen.getByRole('tab', { name: '2. Textos' }));
    await user.click(screen.getByText('Dúvidas frequentes e contato'));

    const addressInput = screen.getByLabelText('Endereço completo');
    expect(addressInput).toHaveValue('Rua dos Pinheiros, 100 — Pinheiros, São Paulo');
    await user.click(addressInput);
    await user.clear(addressInput);
    await user.paste('Av. Paulista, 1000 — Bela Vista, São Paulo');

    const referenceInput = screen.getByLabelText('Ponto de referência');
    await user.click(referenceInput);
    await user.paste('Em frente ao MASP');

    const mapsInput = screen.getByLabelText(/Link do Google Maps ou coordenadas/i);
    await user.click(mapsInput);
    await user.paste('https://evil.com/maps');
    expect(screen.getByRole('alert')).toHaveTextContent(/Google Maps ou coordenadas/i);

    await user.click(mapsInput);
    await user.clear(mapsInput);
    await user.paste('Veja aqui: https://www.google.com/maps/place/Casa/@-23.5614,-46.6559,17z');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText(/Localização exata confirmada \(-23\.5614, -46\.6559\)/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Conferir no Google Maps/i })).toHaveAttribute('href', expect.stringContaining('google.com/maps'));

    await waitFor(() => {
      expect(screen.getByText('Salvo automaticamente')).toBeInTheDocument();
    });
    const saved = JSON.parse(localStorage.getItem('agendix:presence:draft:v1:business') || '{}');
    expect(saved.contact.address).toBe('Av. Paulista, 1000 — Bela Vista, São Paulo');
    expect(saved.contact.addressNote).toBe('Em frente ao MASP');
    expect(saved.contact.lat).toBe(-23.5614);
    expect(saved.contact.lng).toBe(-46.6559);
  });

  it('mostra Passo 4 acionável com WhatsApp quando a liberação está pendente, sem botão desabilitado', async () => {
    const user = userEvent.setup();
    const initial = defaultConfig(data);
    loadOwnerSiteMock.mockResolvedValue({
      config: initial,
      storage: 'remote',
      published: false,
      presenceEnabled: false,
    });

    render(<SiteEditor data={{ ...data, demo: false }} initial={initial} companyId="business" embedded autosaveDelayMs={25} />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Liberar publicação' })).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Liberar publicação' }));
    expect(screen.getByRole('tab', { name: '4. Divulgar' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByRole('button', { name: /Publicar site/i })).not.toBeInTheDocument();
    expect(screen.getByText('Rascunho salvo · Liberação pendente', { selector: '.se-status-badge' })).toBeInTheDocument();

    const waBtn = screen.getByRole('link', { name: /Solicitar liberação no WhatsApp/i });
    expect(waBtn).toHaveAttribute('href', expect.stringMatching(/^https:\/\/wa\.me\/351927688674\?text=/));
    expect(screen.getByRole('button', { name: /Ver prévia em tela cheia/i })).toBeEnabled();
  });

  it('exibe checklist interativo com progresso e abre o passo pendente ao clicar no chip', async () => {
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

    await user.click(screen.getByRole('button', { name: 'Adicionar fotos' }));
    expect(screen.getByRole('tab', { name: '3. Fotos' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Galeria do espaço e trabalhos')).toBeVisible();
  });

  it('oferece galeria visual com miniaturas sem textarea de URLs', async () => {
    const user = userEvent.setup();
    render(<SiteEditor data={data} initial={defaultConfig(data)} companyId="business" demo />);

    await user.click(screen.getByRole('tab', { name: '3. Fotos' }));
    expect(screen.queryByLabelText(/uma URL por linha/i)).not.toBeInTheDocument();

    const firstAlt = screen.getByLabelText('Descrição da foto 1');
    expect(firstAlt).toHaveValue('Salão principal');
    await user.click(firstAlt);
    await user.clear(firstAlt);
    await user.paste('Cadeira clássica na janela');
    expect(firstAlt).toHaveValue('Cadeira clássica na janela');

    await user.click(screen.getByRole('button', { name: 'Mover foto 2 para cima' }));
    expect(screen.getByLabelText('Descrição da foto 1')).toHaveValue('Acabamento degradê');

    await user.click(screen.getByRole('button', { name: 'Remover foto 1' }));
    expect(screen.queryByLabelText('Descrição da foto 2')).not.toBeInTheDocument();
  });

  it('salva automaticamente ao editar diferenciais, referência, clube e FAQ', async () => {
    const user = userEvent.setup();
    render(<SiteEditor data={data} initial={defaultConfig(data)} companyId="business" demo autosaveDelayMs={150} />);

    await user.click(screen.getByRole('tab', { name: '2. Textos' }));
    await user.click(screen.getByRole('button', { name: 'Adicionar diferencial' }));
    expect(screen.getByText(/Salvando rascunho…/)).toBeInTheDocument();

    const diffInput = screen.getByLabelText('Diferencial 1');
    await user.click(diffInput);
    await user.paste('Café passado na hora');
    expect(diffInput).toHaveValue('Café passado na hora');

    await user.click(screen.getByText('Dúvidas frequentes e contato'));
    await user.click(screen.getByRole('button', { name: '+ Formas de pagamento' }));
    expect(screen.getByDisplayValue('Quais formas de pagamento vocês aceitam?')).toBeInTheDocument();

    const referenceInput = screen.getByLabelText('Ponto de referência');
    await user.click(referenceInput);
    await user.paste('Ao lado do metrô Fradique Coutinho');
    expect(referenceInput).toHaveValue('Ao lado do metrô Fradique Coutinho');

    await user.click(screen.getByRole('tab', { name: '3. Fotos' }));
    await user.click(screen.getByText('Seções e ordem da página'));
    expect(screen.getByLabelText('Clube e planos')).toBeInTheDocument();
  });

  it('mostra prévia do Google em /s/:slug, canais de compartilhamento e QR Code', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);

    render(<SiteEditor data={data} initial={defaultConfig(data)} companyId="business" demo />);
    await user.click(screen.getByRole('tab', { name: '4. Divulgar' }));

    const googlePreview = screen.getByLabelText('Prévia do resultado no Google');
    expect(googlePreview).toHaveTextContent('Navalha Fina');
    expect(googlePreview).toHaveTextContent('agendixstudio.com/s/navalha-fina');
    expect(screen.getByText(/Confira com seu Perfil da Empresa no Google/i)).toBeInTheDocument();
    const googleCheck = screen.getByText(/Confira com seu Perfil da Empresa no Google/i).closest('.se-google-check')!;
    expect(googleCheck).toHaveTextContent('Rua dos Pinheiros, 100 — Pinheiros, São Paulo');

    await waitFor(() => {
      expect(screen.getByAltText('QR Code de Navalha Fina')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Copiar link para bio do Instagram' }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('/s/navalha-fina?origem=instagram'));

    await user.click(screen.getByRole('button', { name: 'Copiar link para perfil do Google' }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('/s/navalha-fina?origem=google'));

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

    await user.click(screen.getByRole('tab', { name: '2. Textos' }));
    const headlineCtrl = screen.getByLabelText(/^Frase principal/);
    await user.click(headlineCtrl);
    await user.clear(headlineCtrl);
    await user.paste('Texto alterado');
    expect(headlineCtrl).toHaveValue('Texto alterado');

    await user.click(screen.getByRole('tab', { name: '4. Divulgar' }));
    await user.click(screen.getByRole('button', { name: 'Restaurar padrão' }));
    expect(screen.getByText(/Voltar tudo ao padrão inicial/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sim, restaurar' }));
    expect(confirmSpy).not.toHaveBeenCalled();
    await user.click(screen.getByRole('tab', { name: '2. Textos' }));
    expect(screen.getByLabelText(/^Frase principal/)).toHaveValue(defaultConfig(data).headline);
    confirmSpy.mockRestore();
  });

  it('restaura estado estável ao reverter edição antes do debounce e não grava ao sair sem salvar', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/configuracoes/meu-site';
    const initial = defaultConfig(data);
    loadOwnerSiteMock.mockResolvedValue({
      config: initial,
      storage: 'remote',
      published: false,
      presenceEnabled: true,
    });
    saveOwnerSiteDraftMock.mockRejectedValue(new Error('network'));

    const { unmount } = render(
      <div>
        <a href="#/configuracoes/geral">Ir para Geral</a>
        <SiteEditor data={{ ...data, demo: false }} initial={initial} companyId="business" embedded autosaveDelayMs={150} />
      </div>,
    );

    await waitFor(() => expect(screen.getByRole('button', { name: 'Publicar' })).toBeEnabled());
    await user.click(screen.getByRole('tab', { name: '2. Textos' }));
    const headlineInput = screen.getByLabelText(/^Frase principal/);
    await user.type(headlineInput, '!');
    expect(screen.getByText('Salvando rascunho…')).toBeInTheDocument();

    // Reverte dentro do debounce: volta a ficar estável sem enviar ao servidor
    await user.type(headlineInput, '{backspace}');
    await waitFor(() => expect(screen.getByText('Rascunho salvo')).toBeInTheDocument());
    await new Promise(resolve => setTimeout(resolve, 180));
    expect(saveOwnerSiteDraftMock).not.toHaveBeenCalled();

    // Edita e falha -> clica Sair sem salvar -> unmount não dispara flush
    await user.type(headlineInput, ' Novo');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument());
    expect(saveOwnerSiteDraftMock).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('link', { name: 'Ir para Geral' }));
    await screen.findByRole('alertdialog');
    await user.click(screen.getByRole('button', { name: 'Sair sem salvar' }));
    unmount();
    expect(saveOwnerSiteDraftMock).toHaveBeenCalledTimes(1);
  });

  it('oculta resumo do pino antigo enquanto link do Google Maps está inválido', async () => {
    const user = userEvent.setup();
    render(<SiteEditor data={data} initial={defaultConfig(data)} companyId="business" demo autosaveDelayMs={25} />);
    await user.click(screen.getByRole('tab', { name: '2. Textos' }));
    await user.click(screen.getByText('Dúvidas frequentes e contato'));

    const mapsInput = screen.getByLabelText(/Link do Google Maps ou coordenadas/i);
    await user.type(mapsInput, '-23.5614, -46.6559');
    expect(screen.getByText(/Localização exata confirmada \(-23\.5614, -46\.6559\)/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Conferir no Google Maps/i })).toBeInTheDocument();

    await user.clear(mapsInput);
    await user.type(mapsInput, 'https://evil.com/maps');
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText(/Localização exata confirmada/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Conferir no Google Maps/i })).not.toBeInTheDocument();
  });

  it('limpa estado error ao reverter edição e respeita Continuar editando se flush estava em curso', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/configuracoes/meu-site';
    const initial = defaultConfig(data);
    loadOwnerSiteMock.mockResolvedValue({
      config: initial,
      storage: 'remote',
      published: false,
      presenceEnabled: true,
    });

    let resolveFlush: ((val: { storage: 'remote' }) => void) | null = null;
    saveOwnerSiteDraftMock
      .mockRejectedValueOnce(new Error('network'))
      .mockImplementationOnce(() => new Promise(resolve => { resolveFlush = resolve; }));

    render(
      <div>
        <a href="#/configuracoes/geral">Ir para Geral</a>
        <SiteEditor data={{ ...data, demo: false }} initial={initial} companyId="business" embedded autosaveDelayMs={150} />
      </div>,
    );

    await waitFor(() => expect(screen.getByRole('button', { name: 'Publicar' })).toBeEnabled());
    await user.click(screen.getByRole('tab', { name: '2. Textos' }));
    const headlineInput = screen.getByLabelText(/^Frase principal/);

    // Provoca erro e depois reverte para o último salvo
    await user.type(headlineInput, '!');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument());
    await user.type(headlineInput, '{backspace}');
    await waitFor(() => expect(screen.getByText('Rascunho salvo')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).not.toBeInTheDocument();

    // Inicia navegação durante debounce (dispara flush lento), clica novamente para abrir diálogo e escolhe Continuar editando
    await user.click(headlineInput);
    await user.paste(' Edit');
    await user.click(screen.getByRole('link', { name: 'Ir para Geral' }));
    await waitFor(() => expect(saveOwnerSiteDraftMock).toHaveBeenCalledTimes(2));
    await user.click(screen.getByRole('link', { name: 'Ir para Geral' }));
    await screen.findByRole('alertdialog');
    await user.click(screen.getByRole('button', { name: 'Continuar editando' }));

    resolveFlush?.({ storage: 'remote' });
    await waitFor(() => expect(screen.getByText('Salvo automaticamente')).toBeInTheDocument());
    expect(window.location.hash).toBe('#/configuracoes/meu-site');
  });

  it('encadeia flush se houver nova edição durante flush iniciado por clique de saída', async () => {
    const user = userEvent.setup();
    window.location.hash = '#/configuracoes/meu-site';
    const initial = defaultConfig(data);
    loadOwnerSiteMock.mockResolvedValue({
      config: initial,
      storage: 'remote',
      published: false,
      presenceEnabled: true,
    });

    let resolveFirstFlush: ((val: { storage: 'remote' }) => void) | null = null;
    saveOwnerSiteDraftMock
      .mockImplementationOnce(() => new Promise(resolve => { resolveFirstFlush = resolve; }))
      .mockResolvedValue({ storage: 'remote' });

    render(
      <div>
        <a href="#/configuracoes/geral">Ir para Geral</a>
        <SiteEditor data={{ ...data, demo: false }} initial={initial} companyId="business" embedded autosaveDelayMs={250} />
      </div>,
    );

    await waitFor(() => expect(screen.getByRole('button', { name: 'Publicar' })).toBeEnabled());
    await user.click(screen.getByRole('tab', { name: '2. Textos' }));
    const headlineInput = screen.getByLabelText(/^Frase principal/);
    await user.type(headlineInput, ' A');
    await user.click(screen.getByRole('link', { name: 'Ir para Geral' }));
    await waitFor(() => expect(saveOwnerSiteDraftMock).toHaveBeenCalledTimes(1));

    // Edita novamente enquanto o flush anterior está em voo
    await user.type(headlineInput, ' B');
    resolveFirstFlush?.({ storage: 'remote' });

    await waitFor(() => expect(saveOwnerSiteDraftMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(window.location.hash).toBe('#/configuracoes/geral'));
  });
});
