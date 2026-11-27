import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  MapPin,
  Maximize2,
  MessageCircle,
  Monitor,
  Palette,
  Plus,
  Printer,
  RotateCcw,
  Smartphone,
  Trash2,
} from 'lucide-react';
import {
  accessibleAccent,
  buildSeo,
  defaultBackground,
  defaultConfig,
  FOCUS_PRESETS,
  formatPrice,
  isRecommendedBackground,
  neighborhoodFromAddress,
  photoObjectPosition,
  recommendedPresetForKind,
  resolvedBackground,
  resolvedPreset,
  siteSurface,
  type OfferKind,
  type PhotoFocus,
  type SectionId,
  type SiteConfig,
  type SiteData,
  type SiteKind,
} from '../../lib/establishment/model';
import {
  buildGoogleMapsDirectionsUrl,
  normalizeCoordinates,
  parseGoogleMapsLocationInput,
} from '../../lib/establishment/location';
import {
  loadSiteDraft,
  loadStaleLogos,
  saveSiteDraft,
  saveStaleLogos,
} from '../../lib/establishment/draft';
import {
  buildPresenceActivationUrl,
  buildQrPrintHtml,
  buildShareLinks,
  buildWhatsAppShareUrl,
  computeSiteCompleteness,
  type CompletenessSectionKey,
} from '../../lib/establishment/sharing';
import '../../styles/site-editor.css';
import { LogoPicker } from './LogoPicker';
import { PhotoPicker } from './PhotoPicker';

interface SiteEditorProps {
  data: SiteData;
  initial: SiteConfig;
  companyId: string;
  demo?: boolean;
  embedded?: boolean;
  autosaveDelayMs?: number;
}

const sectionLabels: Record<SectionId, string> = {
  services: 'Serviços',
  differences: 'Diferenciais da casa',
  gallery: 'Galeria',
  beforeAfter: 'Antes e depois',
  team: 'Equipe',
  reviews: 'Avaliações',
  club: 'Clube e planos',
  faq: 'Perguntas frequentes',
  location: 'Localização e horários',
};

const ACCENT_PRESETS = [
  { hex: '#9A5628', label: 'Terracota' },
  { hex: '#3F4E41', label: 'Verde sálvia' },
  { hex: '#1E3A5F', label: 'Azul marinho' },
  { hex: '#7C2D12', label: 'Mogno' },
  { hex: '#6B3A5B', label: 'Ameixa' },
];

const CTA_SUGGESTIONS = ['Agendar agora', 'Reservar horário', 'Marcar horário'];

const FAQ_SUGGESTIONS = [
  {
    label: '+ Formas de pagamento',
    question: 'Quais formas de pagamento vocês aceitam?',
    answer: 'Aceitamos Pix, dinheiro e cartões de débito e crédito no atendimento.',
  },
  {
    label: '+ Atrasos e cancelamento',
    question: 'E se eu precisar remarcar ou atrasar?',
    answer: 'Avise com antecedência pelo WhatsApp ou pelo link da confirmação para ajustarmos seu horário.',
  },
  {
    label: '+ Estacionamento',
    question: 'Tem estacionamento por perto?',
    answer: 'Informe aqui se há vagas na rua, convênio ou estação de metrô próxima.',
  },
];

function headlineSuggestions(kind: SiteKind, address: string): string[] {
  const neighborhood = neighborhoodFromAddress(address);
  const place = neighborhood ? `em ${neighborhood}` : 'com hora marcada';
  if (kind === 'barber') {
    return [
      `Barbearia ${place} com corte preciso e horário respeitado`,
      `Corte e barba ${place} sem fila e no seu horário`,
      `Degradê, tesoura e navalha ${place} com atendimento reservado`,
    ];
  }
  if (kind === 'beauty') {
    return [
      `Salão ${place} dedicado à cor natural e ao cuidado do cabelo`,
      `Corte, mechas e tratamento ${place} com diagnóstico antes de começar`,
      `Beleza e cuidado para os fios ${place} no seu tempo`,
    ];
  }
  return [
    `Estúdio ${place} com atendimento pontual e personalizado`,
    `Cuidado exclusivo ${place} com hora marcada`,
    `Atendimento individualizado ${place} sem espera`,
  ];
}

function differenceSuggestions(kind: SiteKind): string[] {
  if (kind === 'barber') {
    return [
      'Horário respeitado — cadeira reservada sem fila de espera.',
      'Toalha quente, navalha e acabamento detalhado em cada atendimento.',
      'Lâminas descartáveis e bancada higienizada entre clientes.',
    ];
  }
  return [
    'Diagnóstico dos fios e orçamento claro antes de iniciar qualquer procedimento.',
    'Atendimento individualizado, sem correria entre uma cliente e outra.',
    'Orientação prática para manter o resultado em casa.',
  ];
}

function offerTemplates(kind: SiteKind): Array<{ label: string; kind: OfferKind; title: string; condition: string }> {
  if (kind === 'beauty') {
    return [
      {
        label: 'Brinde na 1ª visita',
        kind: 'first_visit',
        title: 'Hidratação de presente na primeira visita',
        condition: 'Para novas clientes ao agendar corte ou coloração.',
      },
      {
        label: '15% na 1ª visita',
        kind: 'first_visit',
        title: '15% de desconto na primeira visita',
        condition: 'Válido de terça a quinta-feira em serviços selecionados.',
      },
      {
        label: 'Combo especial',
        kind: 'combo',
        title: 'Combo corte + tratamento nutritivo',
        condition: 'Condição especial para agendamento no mesmo horário.',
      },
    ];
  }
  return [
    {
      label: '15% na 1ª visita',
      kind: 'first_visit',
      title: '15% de desconto na sua primeira visita',
      condition: 'Válido para novos clientes de terça a quinta-feira.',
    },
    {
      label: 'Brinde na 1ª visita',
      kind: 'first_visit',
      title: 'Toalha quente e acabamento de cortesia na 1ª visita',
      condition: 'Ao agendar qualquer corte.',
    },
    {
      label: 'Combo corte + barba',
      kind: 'combo',
      title: 'Combo corte + barba com valor especial',
      condition: 'Para reservas feitas online durante a semana.',
    },
  ];
}

function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

async function renderQrDataUrl(url: string, width: number, margin: number): Promise<string> {
  const QRCode = await import('qrcode');
  return QRCode.toDataURL(url, {
    width,
    margin,
    color: { dark: '#1C1714', light: '#ffffff' },
  });
}

const STYLE_CHOICES: Array<{
  id: 'urban' | 'editorial' | 'salon';
  label: string;
  subtitle: string;
  hex: string;
  style: SiteConfig['style'];
  className: string;
}> = [
  {
    id: 'urban',
    label: 'Urbano preciso',
    subtitle: 'Fundo escuro',
    hex: '#09090B',
    style: 'dark',
    className: 'se-style-dark',
  },
  {
    id: 'editorial',
    label: 'Editorial clássico',
    subtitle: 'Fundo creme',
    hex: '#FBF7F0',
    style: 'light',
    className: 'se-style-light',
  },
  {
    id: 'salon',
    label: 'Salão luminoso',
    subtitle: 'Fundo branco',
    hex: '#FFFFFF',
    style: 'light',
    className: 'se-style-salon',
  },
];

function StyleAndBackgroundField({
  config,
  kind,
  onChange,
}: {
  config: SiteConfig;
  kind: SiteKind;
  onChange: (patch: Partial<SiteConfig>) => void;
}) {
  const current = resolvedBackground(config, kind);
  const currentPreset = resolvedPreset(config, kind);
  const isStandardBg = isRecommendedBackground(current);
  const surface = siteSurface(current, config.style);
  const [customHex, setCustomHex] = useState(current);
  const [pickingCustom, setPickingCustom] = useState(!isStandardBg);

  useEffect(() => {
    setCustomHex(current);
  }, [current]);

  const applyHex = (value: string) => {
    setCustomHex(value);
    if (/^#[0-9a-fA-F]{6}$/.test(value.trim())) {
      onChange({ background: value.trim() });
    }
  };

  const customOpen = pickingCustom || !isStandardBg;
  const recommendedId = recommendedPresetForKind(kind);

  return (
    <fieldset className="se-bg se-style-fieldset">
      <legend>Estilo e fundo do site</legend>
      <p className="se-help">Escolha o visual da sua página ou ajuste uma cor de fundo sua.</p>
      <div className="se-style-choices" role="radiogroup" aria-label="Estilo e fundo do site">
        {STYLE_CHOICES.map(item => {
          const checked = currentPreset === item.id && isStandardBg;
          const isRecommended = item.id === recommendedId;
          return (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={isRecommended ? `${item.label}, recomendada` : item.label}
              className={`se-style-card ${item.className}`}
              onClick={() => {
                setPickingCustom(false);
                onChange({ preset: item.id, style: item.style, background: item.hex });
              }}
            >
              <span className="se-style-sample">
                <span>{item.subtitle}</span>
                <strong>{item.label}</strong>
              </span>
              {isRecommended && <small className="se-swatch-badge">Recomendada</small>}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className="se-secondary se-custom-bg-toggle"
        aria-expanded={customOpen}
        onClick={() => setPickingCustom(open => !open)}
      >
        <Palette size={15} aria-hidden="true" />
        {customOpen ? 'Ocultar cor personalizada' : 'Personalizar cor de fundo'}
      </button>
      {customOpen && (
        <div className="se-color">
          <span>Cor personalizada</span>
          <input
            type="color"
            aria-label="Selecionar cor"
            value={/^#[0-9a-fA-F]{6}$/.test(customHex) ? customHex : current}
            onChange={e => applyHex(e.target.value)}
          />
          <input
            type="text"
            aria-label="Cor personalizada"
            value={customHex}
            maxLength={7}
            spellCheck={false}
            onChange={e => applyHex(e.target.value)}
          />
        </div>
      )}
      {surface.warning && (
        <p role="status" className="se-contrast">
          {surface.warning}
        </p>
      )}
    </fieldset>
  );
}

type EditorStep = 'brand' | 'intro' | 'photos' | 'share';

const EDITOR_STEPS: Array<{ id: EditorStep; label: string }> = [
  { id: 'brand', label: '1. Visual' },
  { id: 'intro', label: '2. Textos' },
  { id: 'photos', label: '3. Fotos' },
  { id: 'share', label: '4. Divulgar' },
];

type PendingLeave =
  | { type: 'hash'; hash: string }
  | { type: 'history'; url: string; state: unknown };

type AutosaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

function initialLocationText(cfg: SiteConfig): string {
  if (cfg.contact?.mapsUrl) return cfg.contact.mapsUrl;
  const coords = normalizeCoordinates(cfg.contact?.lat, cfg.contact?.lng);
  return coords ? `${coords.lat}, ${coords.lng}` : '';
}

export function SiteEditor({
  data,
  initial,
  companyId,
  demo = false,
  embedded = false,
  autosaveDelayMs = 900,
}: SiteEditorProps) {
  const [initialDraft] = useState(() => loadSiteDraft(companyId, initial));
  const [config, setConfig] = useState<SiteConfig>(initialDraft);
  const [savedJson, setSavedJson] = useState(() => JSON.stringify(initialDraft));
  const [hydrated, setHydrated] = useState(demo);
  const [step, setStep] = useState<EditorStep>('brand');
  const [saved, setSaved] = useState('');
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>('idle');
  const [autosaveError, setAutosaveError] = useState('');
  const [locationInput, setLocationInput] = useState(() => initialLocationText(initialDraft));
  const [locationError, setLocationError] = useState('');
  const [mode, setMode] = useState<'mobile' | 'desktop'>('mobile');
  const [expanded, setExpanded] = useState(false);
  const [previewCollapsed, setPreviewCollapsed] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [pendingLeave, setPendingLeave] = useState<PendingLeave | null>(null);

  const currentConfigJson = useMemo(() => JSON.stringify(config), [config]);
  const isDirty = currentConfigJson !== savedJson;

  const staleLogos = useRef<Set<string>>(new Set(loadStaleLogos(companyId)));
  const publishedLogoRef = useRef<string>('');
  const hydratedRef = useRef(demo);
  hydratedRef.current = hydrated;
  const userEditedRef = useRef(false);
  const isSavingRef = useRef(false);
  const queuedAfterFlightRef = useRef(false);
  const inFlightPromiseRef = useRef<Promise<boolean> | null>(null);
  const lastSavedJsonRef = useRef(JSON.stringify(initialDraft));
  const debounceTimerRef = useRef<number | null>(null);
  const unmountedRef = useRef(false);
  const discardOnLeaveRef = useRef(false);
  const hasSavedOnceRef = useRef(false);
  const publishingRef = useRef(false);
  const publishPromiseRef = useRef<Promise<void> | null>(null);
  const leaveRequestTokenRef = useRef(0);
  const frameReadyRef = useRef(false);
  const autosaveStatusRef = useRef<AutosaveStatus>(autosaveStatus);
  autosaveStatusRef.current = autosaveStatus;
  const bypassNavGuardRef = useRef(false);
  const lastHashRef = useRef(typeof window !== 'undefined' ? window.location.hash : '');
  const originalPushStateRef = useRef<History['pushState'] | null>(null);
  const stayBtnRef = useRef<HTMLButtonElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const expandBtnRef = useRef<HTMLButtonElement>(null);
  const backBtnRef = useRef<HTMLButtonElement>(null);
  const wasExpandedRef = useRef(false);
  const sectionRefs = useRef<Record<CompletenessSectionKey, HTMLDetailsElement | null>>({
    brand: null,
    intro: null,
    photos: null,
    contact: null,
  });

  const [frameReady, setFrameReady] = useState(false);
  frameReadyRef.current = frameReady;
  const [storage, setStorage] = useState<'local' | 'remote'>('local');
  const [saving, setSaving] = useState(false);
  const [presenceEnabled, setPresenceEnabled] = useState(false);
  const [published, setPublished] = useState(false);

  useEffect(() => {
    staleLogos.current = new Set(loadStaleLogos(companyId));
  }, [companyId]);

  const queueStaleLogo = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed || demo) return;
    staleLogos.current.add(trimmed);
    saveStaleLogos(companyId, Array.from(staleLogos.current));
  };

  const flushStaleLogos = async ({
    includePublishedLogo,
    keepLogo,
  }: {
    includePublishedLogo: boolean;
    keepLogo: string;
  }) => {
    if (demo) return;
    const candidates = Array.from(staleLogos.current).filter(
      url => url !== keepLogo && (includePublishedLogo || url !== publishedLogoRef.current),
    );
    if (!candidates.length) return;
    const photos = await import('../../services/establishmentPhotos');
    await Promise.all(
      candidates.map(async url => {
        try {
          await photos.deleteSiteLogo(companyId, url);
          staleLogos.current.delete(url);
        } catch {
          // Mantém na fila persistida para remover na próxima tentativa
        }
      }),
    );
    saveStaleLogos(companyId, Array.from(staleLogos.current));
  };

  const update = (patch: Partial<SiteConfig>) => {
    userEditedRef.current = true;
    setConfig(current => ({ ...current, ...patch }));
    setSaved('');
  };

  const configRef = useRef(config);
  const dataRef = useRef(data);
  const initialRef = useRef(initial);
  const storageRef = useRef(storage);
  const skipNextEffectSync = useRef(false);
  configRef.current = config;
  dataRef.current = data;
  initialRef.current = initial;
  storageRef.current = storage;

  const persistDraft = async (reason: 'auto' | 'manual' | 'flush' = 'auto'): Promise<boolean> => {
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (publishPromiseRef.current) {
      saveSiteDraft(companyId, configRef.current);
      if (reason === 'auto') return false;
      await publishPromiseRef.current.catch(() => undefined);
    }
    const currentJson = JSON.stringify(configRef.current);
    if (
      (reason === 'auto' || reason === 'flush') &&
      !inFlightPromiseRef.current &&
      currentJson === lastSavedJsonRef.current &&
      autosaveStatusRef.current !== 'error'
    ) {
      return true;
    }
    if (inFlightPromiseRef.current) {
      if (reason === 'flush' || reason === 'manual') {
        queuedAfterFlightRef.current = true;
      }
      return inFlightPromiseRef.current;
    }

    const run = (async (): Promise<boolean> => {
      isSavingRef.current = true;
      if (!unmountedRef.current) {
        setAutosaveStatus('saving');
        setAutosaveError('');
      }
      try {
        let storageMode = storageRef.current;
        do {
          if (debounceTimerRef.current !== null) {
            window.clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
          }
          queuedAfterFlightRef.current = false;
          const snapshot = configRef.current;
          const snapshotJson = JSON.stringify(snapshot);
          saveSiteDraft(companyId, snapshot);
          const currentLogo = snapshot.logoRemoved ? '' : snapshot.logo || '';
          if (!demo) {
            const m = await import('../../services/establishmentSite');
            const result = await m.saveOwnerSiteDraft(companyId, snapshot);
            storageMode = result.storage;
            if (!unmountedRef.current) setStorage(result.storage);
            await flushStaleLogos({ includePublishedLogo: false, keepLogo: currentLogo });
          }
          lastSavedJsonRef.current = snapshotJson;
          if (!unmountedRef.current) setSavedJson(snapshotJson);
        } while (
          queuedAfterFlightRef.current &&
          JSON.stringify(configRef.current) !== lastSavedJsonRef.current
        );

        hasSavedOnceRef.current = true;
        if (!unmountedRef.current) {
          const stillDirty = JSON.stringify(configRef.current) !== lastSavedJsonRef.current;
          setAutosaveStatus(stillDirty ? 'pending' : 'saved');
          setAutosaveError('');
          if (reason === 'manual') {
            setSaved(
              demo
                ? 'Rascunho de demonstração salvo neste navegador.'
                : storageMode === 'remote'
                  ? 'Rascunho salvo. Seu site público não mudou.'
                  : 'Rascunho salvo neste navegador. Nada foi publicado.',
            );
          }
        }
        return true;
      } catch {
        if (debounceTimerRef.current !== null) {
          window.clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        if (!unmountedRef.current) {
          if (JSON.stringify(configRef.current) === lastSavedJsonRef.current) {
            setAutosaveStatus(hasSavedOnceRef.current ? 'saved' : 'idle');
            setAutosaveError('');
          } else {
            setAutosaveStatus('error');
            setAutosaveError('Não foi possível salvar automaticamente. Confira sua conexão e tente novamente.');
          }
        }
        return false;
      }
    })();

    inFlightPromiseRef.current = run;
    void run.then(succeeded => {
      isSavingRef.current = false;
      if (inFlightPromiseRef.current === run) {
        inFlightPromiseRef.current = null;
      }
      if (succeeded && !unmountedRef.current && hydratedRef.current) {
        const hasUnsaved = JSON.stringify(configRef.current) !== lastSavedJsonRef.current;
        if (queuedAfterFlightRef.current && hasUnsaved) {
          queuedAfterFlightRef.current = false;
          void persistDraft('flush');
        } else if (hasUnsaved && debounceTimerRef.current === null) {
          queuedAfterFlightRef.current = false;
          debounceTimerRef.current = window.setTimeout(() => {
            debounceTimerRef.current = null;
            void persistDraft('auto');
          }, autosaveDelayMs);
        } else {
          queuedAfterFlightRef.current = false;
        }
      } else if (!succeeded) {
        queuedAfterFlightRef.current = false;
      }
    });
    return run;
  };

  useEffect(() => {
    if (!hydrated) return;
    if (currentConfigJson === lastSavedJsonRef.current) {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      if (!isSavingRef.current && (autosaveStatusRef.current === 'pending' || autosaveStatusRef.current === 'error')) {
        setAutosaveStatus(hasSavedOnceRef.current ? 'saved' : 'idle');
        setAutosaveError('');
      }
      return;
    }
    if (!isSavingRef.current && autosaveStatusRef.current !== 'pending') {
      setAutosaveStatus('pending');
      setAutosaveError('');
    }
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = window.setTimeout(() => {
      debounceTimerRef.current = null;
      void persistDraft('auto');
    }, autosaveDelayMs);
    return () => {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [hydrated, currentConfigJson, autosaveDelayMs]);

  useEffect(() => {
    unmountedRef.current = false;
    discardOnLeaveRef.current = false;
    const flushIfDirty = () => {
      if (discardOnLeaveRef.current) return;
      if (hydratedRef.current && JSON.stringify(configRef.current) !== lastSavedJsonRef.current) {
        void persistDraft('flush');
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flushIfDirty();
    };
    window.addEventListener('pagehide', flushIfDirty);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      unmountedRef.current = true;
      window.removeEventListener('pagehide', flushIfDirty);
      document.removeEventListener('visibilitychange', onVisibility);
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      flushIfDirty();
    };
  }, [companyId]);

  useEffect(() => {
    if (!frameReady) return;
    if (skipNextEffectSync.current) {
      skipNextEffectSync.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      frame.current?.contentWindow?.postMessage(
        { type: 'agendix:site-preview', data: dataRef.current, config: configRef.current },
        window.location.origin,
      );
    }, 120);
    return () => window.clearTimeout(timer);
  }, [config, data, frameReady]);

  useEffect(() => {
    if (previewCollapsed && !expanded) {
      setFrameReady(false);
    }
  }, [previewCollapsed, expanded]);

  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (
        event.origin === window.location.origin &&
        event.source === frame.current?.contentWindow &&
        event.data?.type === 'agendix:site-preview-ready'
      ) {
        if (!frameReadyRef.current) {
          skipNextEffectSync.current = true;
        }
        setFrameReady(true);
        frame.current?.contentWindow?.postMessage(
          { type: 'agendix:site-preview', data: dataRef.current, config: configRef.current },
          window.location.origin,
        );
      }
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, []);

  const lastSentModeRef = useRef(mode);
  useEffect(() => {
    if (!frameReady) return;
    if (mode === lastSentModeRef.current) return;
    lastSentModeRef.current = mode;
    const win = frame.current?.contentWindow;
    if (!win) return;
    win.postMessage(
      { type: 'agendix:site-preview', data: dataRef.current, config: configRef.current },
      window.location.origin,
    );
    try {
      win.scrollTo?.(0, 0);
    } catch {
      // ignore cross-context scroll error
    }
  }, [mode, frameReady]);

  useEffect(() => {
    if (expanded) {
      wasExpandedRef.current = true;
      backBtnRef.current?.focus();
    } else if (wasExpandedRef.current) {
      wasExpandedRef.current = false;
      expandBtnRef.current?.focus();
    }
    if (!expanded) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded]);

  useEffect(() => {
    if (demo) {
      setHydrated(true);
      return;
    }
    let active = true;
    void import('../../services/establishmentSite')
      .then(m => m.loadOwnerSite(companyId, initialRef.current))
      .then(result => {
        if (!active) return;
        setStorage(result.storage);
        setPresenceEnabled(result.presenceEnabled);
        setPublished(result.published);
        publishedLogoRef.current = result.publishedLogo || '';
        if (result.config && !userEditedRef.current) {
          const nextJson = JSON.stringify(result.config);
          lastSavedJsonRef.current = nextJson;
          hasSavedOnceRef.current = false;
          setConfig(result.config);
          setSavedJson(nextJson);
          setLocationInput(initialLocationText(result.config));
          setLocationError('');
        }
        setHydrated(true);
      })
      .catch(() => {
        if (active) {
          setHydrated(true);
          setSaved('Não foi possível ler o rascunho remoto. Sua cópia local continua disponível.');
        }
      });
    return () => {
      active = false;
    };
  }, [companyId, demo]);

  useEffect(() => {
    if (pendingLeave) {
      stayBtnRef.current?.focus();
    }
  }, [pendingLeave]);

  const cancelPendingLeave = () => {
    leaveRequestTokenRef.current += 1;
    setPendingLeave(null);
  };

  useEffect(() => {
    if (!pendingLeave) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') cancelPendingLeave();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pendingLeave]);

  useEffect(() => {
    if (!pendingLeave || isDirty || autosaveStatus !== 'saved') return;
    const target = pendingLeave;
    leaveRequestTokenRef.current += 1;
    if (!unmountedRef.current) {
      proceedLeave(target);
    }
  }, [pendingLeave, isDirty, autosaveStatus]);

  const shouldProtectLeave = isDirty || autosaveStatus === 'saving' || autosaveStatus === 'error';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    lastHashRef.current = window.location.hash;
    if (!shouldProtectLeave) return;

    const requestLeave = (leave: PendingLeave) => {
      const token = ++leaveRequestTokenRef.current;
      if (autosaveStatusRef.current === 'saving' || autosaveStatusRef.current === 'error') {
        setPendingLeave(leave);
        return;
      }
      const flushAndLeave = () => {
        void persistDraft('flush').then(ok => {
          if (token !== leaveRequestTokenRef.current || unmountedRef.current) return;
          if (!ok) {
            if (
              JSON.stringify(configRef.current) === lastSavedJsonRef.current &&
              autosaveStatusRef.current !== 'error'
            ) {
              proceedLeave(leave);
              return;
            }
            setPendingLeave(leave);
            return;
          }
          if (JSON.stringify(configRef.current) !== lastSavedJsonRef.current) {
            flushAndLeave();
            return;
          }
          proceedLeave(leave);
        });
      };
      flushAndLeave();
    };

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    const onDocClick = (event: MouseEvent) => {
      if (
        bypassNavGuardRef.current ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      const rawHref = anchor.getAttribute('href') || '';
      if (!rawHref || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:')) return;
      let resolved: URL;
      try {
        resolved = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (resolved.origin !== window.location.origin || !resolved.hash.startsWith('#/')) return;
      const currentHash = window.location.hash || '#/';
      if (resolved.hash === currentHash) return;
      event.preventDefault();
      event.stopPropagation();
      requestLeave({ type: 'hash', hash: resolved.hash });
    };

    const onHashChange = () => {
      if (bypassNavGuardRef.current) {
        lastHashRef.current = window.location.hash;
        return;
      }
      const nextHash = window.location.hash;
      const prevHash = lastHashRef.current;
      if (nextHash === prevHash) return;
      bypassNavGuardRef.current = true;
      window.location.hash = prevHash;
      window.setTimeout(() => {
        bypassNavGuardRef.current = false;
      }, 0);
      requestLeave({ type: 'hash', hash: nextHash });
    };

    const originalPushState = window.history.pushState.bind(window.history);
    originalPushStateRef.current = originalPushState;
    window.history.pushState = (state, unused, url) => {
      if (bypassNavGuardRef.current || !url) {
        originalPushState(state, unused, url);
        lastHashRef.current = window.location.hash;
        return;
      }
      try {
        const nextUrl = new URL(String(url), window.location.href);
        if (nextUrl.origin === window.location.origin && nextUrl.hash && nextUrl.hash !== lastHashRef.current) {
          requestLeave({ type: 'history', url: nextUrl.href, state });
          return;
        }
      } catch {
        // fallback para comportamento nativo
      }
      originalPushState(state, unused, url);
      lastHashRef.current = window.location.hash;
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onDocClick, true);
    window.addEventListener('hashchange', onHashChange);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onDocClick, true);
      window.removeEventListener('hashchange', onHashChange);
      if (originalPushStateRef.current) {
        window.history.pushState = originalPushStateRef.current;
        originalPushStateRef.current = null;
      }
    };
  }, [shouldProtectLeave]);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.agendixstudio.com';
  const shareOrigin =
    demo || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)
      ? 'https://www.agendixstudio.com'
      : origin;
  const shareLinks = useMemo(() => buildShareLinks(shareOrigin, data.slug || 'site'), [shareOrigin, data.slug]);

  useEffect(() => {
    if (step !== 'share') return;
    let active = true;
    void renderQrDataUrl(shareLinks.qr, 420, 2)
      .then(url => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl('');
      });
    return () => {
      active = false;
    };
  }, [step, shareLinks.qr]);

  const changePublication = async (unpublish = false) => {
    if (demo || storage !== 'remote' || !presenceEnabled || publishingRef.current) return;
    publishingRef.current = true;
    if (debounceTimerRef.current !== null) {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setSaving(true);
    const runPublish = (async () => {
      try {
        while (inFlightPromiseRef.current) {
          await inFlightPromiseRef.current.catch(() => false);
        }
        if (unmountedRef.current) return;
        const snapshot = configRef.current;
        const m = await import('../../services/establishmentSite');
        const result = unpublish ? await m.unpublishOwnerSite(companyId) : await m.publishOwnerSite(companyId, snapshot);
        if (unmountedRef.current) return;
        const currentLogo = unpublish ? '' : snapshot.logoRemoved ? '' : snapshot.logo || '';
        publishedLogoRef.current = currentLogo;
        await flushStaleLogos({ includePublishedLogo: true, keepLogo: currentLogo });
        if (unmountedRef.current) return;
        if (!unpublish) {
          const nextJson = JSON.stringify(snapshot);
          lastSavedJsonRef.current = nextJson;
          hasSavedOnceRef.current = true;
          setSavedJson(nextJson);
          const stillDirty = JSON.stringify(configRef.current) !== nextJson;
          setAutosaveStatus(stillDirty ? 'pending' : 'saved');
          setAutosaveError('');
        }
        setPublished(!unpublish);
        const shareSynced = result?.sharePageSynced !== false;
        if (unpublish) {
          setSaved(
            shareSynced
              ? 'Site despublicado. O link de agendamento continua funcionando.'
              : 'Site despublicado. A página de compartilhamento pode levar alguns instantes para refletir a mudança, e o link de agendamento continua funcionando.',
          );
        } else {
          setSaved(
            shareSynced
              ? 'Site publicado com esta versão.'
              : 'Site publicado com esta versão. A prévia para Google e WhatsApp não pôde ser atualizada agora — tente publicar novamente em instantes.',
          );
        }
      } catch {
        if (!unmountedRef.current) {
          setSaved('Não foi possível alterar a publicação. Confira a liberação do plano e tente novamente.');
        }
      } finally {
        publishingRef.current = false;
        if (publishPromiseRef.current === runPublish) {
          publishPromiseRef.current = null;
        }
        if (!unmountedRef.current) {
          setSaving(false);
        }
        if (
          !unmountedRef.current &&
          hydratedRef.current &&
          JSON.stringify(configRef.current) !== lastSavedJsonRef.current &&
          !inFlightPromiseRef.current &&
          debounceTimerRef.current === null &&
          autosaveStatusRef.current !== 'error'
        ) {
          debounceTimerRef.current = window.setTimeout(() => {
            debounceTimerRef.current = null;
            void persistDraft('auto');
          }, autosaveDelayMs);
        }
      }
    })();
    publishPromiseRef.current = runPublish;
    return runPublish;
  };

  const proceedLeave = (leave: PendingLeave) => {
    setPendingLeave(null);
    bypassNavGuardRef.current = true;
    window.setTimeout(() => {
      if (leave.type === 'hash') {
        lastHashRef.current = leave.hash;
        window.location.hash = leave.hash;
      } else {
        if (originalPushStateRef.current) {
          originalPushStateRef.current(leave.state, '', leave.url);
        } else {
          window.history.pushState(leave.state, '', leave.url);
        }
        lastHashRef.current = new URL(leave.url).hash;
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
      window.setTimeout(() => {
        bypassNavGuardRef.current = false;
      }, 0);
    }, 0);
  };

  const copyText = (value: string, message: string) => {
    if (!navigator.clipboard?.writeText) {
      setSaved('Não foi possível copiar automaticamente. Selecione o endereço abaixo.');
      return;
    }
    void navigator.clipboard
      .writeText(value)
      .then(() => setSaved(message))
      .catch(() => setSaved('Não foi possível copiar automaticamente. Selecione o endereço abaixo.'));
  };

  const downloadQr = async () => {
    try {
      const url = await renderQrDataUrl(shareLinks.qr, 900, 3);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${data.slug}-qr.png`;
      anchor.click();
      setSaved('QR Code preparado para baixar.');
    } catch {
      setSaved('Não foi possível gerar o QR Code. Tente novamente.');
    }
  };

  const printQrPlaque = async () => {
    try {
      const dataUrl = qrDataUrl || (await renderQrDataUrl(shareLinks.qr, 900, 3));
      const html = buildQrPrintHtml({
        name: data.name,
        logo: effectiveLogo || undefined,
        link: shareLinks.qr,
        qrDataUrl: dataUrl,
        region: data.region,
      });
      const popup = window.open('', '_blank');
      if (!popup) {
        setSaved('Permita pop-ups no navegador para imprimir a plaquinha ou baixe o QR Code.');
        return;
      }
      popup.document.open();
      popup.document.write(html);
      popup.document.close();
      popup.focus();
      popup.print();
      setSaved('Plaquinha preparada para impressão.');
    } catch {
      setSaved('Não foi possível preparar a plaquinha agora. Tente baixar o QR Code.');
    }
  };

  const moveSection = (index: number, direction: number) => {
    const sections = [...config.sections];
    const other = index + direction;
    if (other < 0 || other >= sections.length) return;
    [sections[index], sections[other]] = [sections[other], sections[index]];
    update({ sections });
  };

  const galleryItems = config.gallery ?? data.gallery;

  const moveGalleryItem = (index: number, direction: number) => {
    const next = [...galleryItems];
    const other = index + direction;
    if (other < 0 || other >= next.length) return;
    [next[index], next[other]] = [next[other], next[index]];
    update({ gallery: next });
  };

  const changeStep = (nextStep: EditorStep) => {
    setStep(nextStep);
    if (hydratedRef.current && JSON.stringify(configRef.current) !== lastSavedJsonRef.current) {
      void persistDraft('flush');
    }
  };

  const jumpToSection = (sectionKey: CompletenessSectionKey) => {
    const targetStep: EditorStep = sectionKey === 'contact' ? 'intro' : sectionKey;
    changeStep(targetStep);
    window.requestAnimationFrame(() => {
      const target = sectionRefs.current[sectionKey];
      if (!target) return;
      target.open = true;
      const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      target.scrollIntoView?.({ behavior: reduced ? 'instant' : 'smooth', block: 'start' });
    });
  };

  const field = (
    label: string,
    value: string,
    onChange: (value: string) => void,
    multiline = false,
    hint?: string,
    inputOpts?: {
      type?: string;
      inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
      placeholder?: string;
      autoCapitalize?: string;
      autoCorrect?: string;
    },
  ) => (
    <div className="se-field-group">
      <label className="se-field">
        <span>{label}</span>
        {multiline ? (
          <textarea value={value} onChange={e => onChange(e.target.value)} rows={3} maxLength={2000} placeholder={inputOpts?.placeholder} />
        ) : (
          <input
            type={inputOpts?.type ?? 'text'}
            inputMode={inputOpts?.inputMode}
            placeholder={inputOpts?.placeholder}
            autoCapitalize={inputOpts?.autoCapitalize}
            autoCorrect={inputOpts?.autoCorrect}
            value={value}
            onChange={e => onChange(e.target.value)}
            maxLength={400}
          />
        )}
      </label>
      {hint && <small className="se-field-hint">{hint}</small>}
    </div>
  );

  const photoChoices = useMemo(
    () => Array.from(new Set([data.cover, ...galleryItems.map(p => p.src)].filter(Boolean) as string[])),
    [data.cover, galleryItems],
  );

  const photoPicker = (
    label: string,
    value: string,
    onChange: (value: string) => void,
    options: { onRemove?: () => void; helperText?: string; uploadLabel?: string } = {},
  ) => (
    <PhotoPicker
      label={label}
      value={value}
      onChange={onChange}
      onRemove={options.onRemove}
      helperText={options.helperText}
      uploadLabel={options.uploadLabel}
      companyId={companyId}
      demo={demo}
      choices={photoChoices}
    />
  );

  const effectiveLogo = config.logoRemoved ? '' : config.logo || data.logo || '';
  const activeCover = config.coverRemoved ? '' : config.cover || data.cover || '';
  const pageBackground = resolvedBackground(config, data.kind);
  const pageSurface = useMemo(
    () => siteSurface(pageBackground, config.style),
    [pageBackground, config.style],
  );
  const safeAccent = useMemo(
    () => accessibleAccent(config.accent, config.style, pageBackground),
    [config.accent, config.style, pageBackground],
  );
  const completeness = useMemo(
    () => computeSiteCompleteness({ ...data, gallery: galleryItems }, config),
    [data, galleryItems, config],
  );
  const pendingItems = completeness.items.filter(item => !item.done);
  const seoPreview = useMemo(
    () => (step === 'share' ? buildSeo({ ...data, gallery: galleryItems }, config, origin) : null),
    [step, data, galleryItems, config, origin],
  );
  const whatsappShareUrl = useMemo(
    () => buildWhatsAppShareUrl(data.name, shareLinks.direct),
    [data.name, shareLinks.direct],
  );
  const activationUrl = useMemo(
    () => buildPresenceActivationUrl({ name: data.name, slug: data.slug || '', region: data.region }),
    [data.name, data.slug, data.region],
  );
  const effectiveAddress = (config.contact?.address ?? data.address).trim();
  const confirmedCoordinates = normalizeCoordinates(config.contact?.lat, config.contact?.lng);
  const effectiveDirectionsUrl = useMemo(
    () =>
      buildGoogleMapsDirectionsUrl({
        name: data.name,
        address: effectiveAddress,
        mapsUrl: config.contact?.mapsUrl,
        lat: config.contact?.lat,
        lng: config.contact?.lng,
      }),
    [data.name, effectiveAddress, config.contact?.mapsUrl, config.contact?.lat, config.contact?.lng],
  );
  const effectivePhone = (config.contact?.phone ?? data.phone)?.trim();

  const handleLocationInputChange = (raw: string) => {
    setLocationInput(raw);
    const parsed = parseGoogleMapsLocationInput(raw);
    if (parsed.kind === 'empty') {
      setLocationError('');
      update({
        contact: {
          ...config.contact,
          mapsUrl: undefined,
          lat: undefined,
          lng: undefined,
        },
      });
      return;
    }
    if (parsed.kind === 'invalid') {
      setLocationError(parsed.error);
      return;
    }
    setLocationError('');
    update({
      contact: {
        ...config.contact,
        mapsUrl: parsed.mapsUrl,
        lat: parsed.lat,
        lng: parsed.lng,
      },
    });
  };

  const clearLocationPin = () => {
    setLocationInput('');
    setLocationError('');
    update({
      contact: {
        ...config.contact,
        mapsUrl: undefined,
        lat: undefined,
        lng: undefined,
      },
    });
  };

  const sectionHasContent = (sectionId: SectionId): boolean => {
    if (sectionId === 'services') return data.services.length > 0;
    if (sectionId === 'differences') return config.differences.some(item => item.trim().length > 0);
    if (sectionId === 'gallery') return galleryItems.length > 0;
    if (sectionId === 'beforeAfter') return (config.beforeAfter ?? []).some(pair => Boolean(pair.before && pair.after));
    if (sectionId === 'team') {
      return (
        data.team.length > 1 ||
        data.team.some(member => Boolean(config.teamDetails?.[member.id]?.image || member.image))
      );
    }
    if (sectionId === 'reviews') return data.reviews.some(review => review.comment.trim().length > 0);
    if (sectionId === 'club') return (data.clubPlans ?? []).length > 0;
    if (sectionId === 'faq') return config.faq.some(item => Boolean(item.question.trim() && item.answer.trim()));
    return Boolean(effectiveAddress || confirmedCoordinates || config.contact?.mapsUrl || data.hours.length > 0);
  };

  const previewFrame = (
    <iframe
      ref={frame}
      title="Prévia ao vivo do meu site"
      src="/#/site-preview"
    />
  );

  const autosaveLabel =
    autosaveStatus === 'error'
      ? 'Erro ao salvar'
      : autosaveStatus === 'saving' || autosaveStatus === 'pending'
        ? 'Salvando rascunho…'
        : autosaveStatus === 'saved'
          ? 'Salvo automaticamente'
          : 'Rascunho salvo';

  const isSiteLive = published && (demo || presenceEnabled);
  const noticeState =
    autosaveStatus === 'error'
      ? 'error'
      : isSiteLive
        ? 'live'
        : !demo && !presenceEnabled
          ? 'pending'
          : 'draft';
  const showNoticeBanner = autosaveStatus === 'error' || demo || presenceEnabled || step !== 'share';

  return (
    <div className="site-editor" data-embedded={embedded || undefined}>
      {demo && <div className="se-demo">Demonstração do editor · dados fictícios · nenhuma publicação real</div>}
      <header className="se-header">
        <div className="se-title">
          <span className="se-breadcrumb">Ajustes / Presença</span>
          <h1>Meu site</h1>
          <p>Personalize sua casa sem complicação. Tudo é salvo automaticamente em rascunho.</p>
        </div>
        <div className="se-header-actions">
          <div className="se-autosave-pill" data-state={autosaveStatus} aria-live="polite" aria-atomic="true">
            {autosaveStatus === 'error' ? (
              <AlertCircle size={13} aria-hidden="true" />
            ) : autosaveStatus === 'saving' || autosaveStatus === 'pending' ? (
              <Loader2 size={13} className="se-spin" aria-hidden="true" />
            ) : (
              <Check size={13} aria-hidden="true" />
            )}
            <span>{autosaveLabel}</span>
            {autosaveStatus === 'error' && (
              <button type="button" className="se-autosave-retry" onClick={() => void persistDraft('manual')}>
                Tentar novamente
              </button>
            )}
          </div>
          {!demo && !presenceEnabled && step !== 'share' ? (
            <button
              type="button"
              className="se-publish"
              onClick={() => changeStep('share')}
            >
              Liberar publicação
            </button>
          ) : !demo && presenceEnabled ? (
            <button
              type="button"
              className="se-publish se-save"
              onClick={() => void changePublication()}
              disabled={saving || storage !== 'remote'}
            >
              {isSiteLive ? 'Publicar alterações' : 'Publicar'}
            </button>
          ) : null}
          {(isSiteLive || demo) && (
            <a
              href={`/#/site/${data.slug || 'site'}`}
              target="_blank"
              rel="noreferrer"
              aria-label="Abrir site em nova aba"
            >
              <ExternalLink size={18} />
            </a>
          )}
        </div>
      </header>

      {showNoticeBanner && (
        <div className="se-notice" data-state={noticeState}>
          <span className="se-status-dot" />
          <div>
            <strong>
              {autosaveStatus === 'error'
                ? 'Não foi possível salvar suas últimas alterações'
                : isSiteLive
                  ? 'Site publicado'
                  : !demo && !presenceEnabled
                    ? 'Rascunho salvo · Liberação pendente'
                    : 'Rascunho privado'}
            </strong>
            <p>
              {autosaveStatus === 'error'
                ? autosaveError || 'Confira sua conexão e toque em Tentar novamente.'
                : demo
                  ? 'Modo demonstração — alterações ficam salvas automaticamente só neste navegador.'
                  : !presenceEnabled
                    ? 'Suas edições são salvas automaticamente aqui. Falta apenas liberar a publicação com a equipe AgendiX.'
                    : isSiteLive
                      ? 'Suas edições são salvas no rascunho automático e só vão para o site público quando você publicar.'
                      : 'Suas alterações são salvas automaticamente. Quando quiser colocar no ar, publique no passo 4.'}
            </p>
            {!demo && !presenceEnabled && step !== 'share' && autosaveStatus !== 'error' && (
              <button type="button" className="se-link-button se-notice-action" onClick={() => changeStep('share')}>
                Como liberar publicação →
              </button>
            )}
          </div>
        </div>
      )}

      {saved && (
        <p role="status" className="se-feedback">
          <Check size={16} aria-hidden="true" />
          {saved}
        </p>
      )}

      <div className="se-workspace" data-preview-collapsed={previewCollapsed || undefined}>
        <div
          className="se-controls"
          aria-hidden={expanded || Boolean(pendingLeave) || undefined}
          {...(expanded || pendingLeave ? { inert: true } : {})}
        >
          <section className="se-checklist" aria-label="Progresso do site">
            <div className="se-checklist-top">
              <strong>Seu site está {completeness.percent}% pronto</strong>
              <span className="se-checklist-count">
                {completeness.completed}/{completeness.total}
              </span>
            </div>
            <div
              className="se-progress"
              role="progressbar"
              aria-valuenow={completeness.percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Completude do site"
            >
              <span style={{ width: `${completeness.percent}%` }} />
            </div>
            <p>
              Do cadastro já entram automaticamente: {pluralize(data.services.length, 'serviço', 'serviços')}
              {data.team.length > 0 ? ` · ${pluralize(data.team.length, 'profissional', 'profissionais')}` : ''}
              {galleryItems.length > 0 ? ` · ${pluralize(galleryItems.length, 'foto', 'fotos')}` : ''}.
            </p>
            {pendingItems.length > 0 && step !== 'share' && (
              <div className="se-checklist-actions">
                <small>Complete quando quiser (não impede publicar):</small>
                <div className="se-chip-row">
                  {pendingItems.map(item => (
                    <button
                      key={item.id}
                      type="button"
                      className="se-chip"
                      onClick={() => jumpToSection(item.sectionKey)}
                    >
                      {item.actionLabel}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          <nav className="se-steps-nav" role="tablist" aria-label="Etapas de edição do site">
            {EDITOR_STEPS.map(item => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={step === item.id}
                className="se-step-tab"
                onClick={() => changeStep(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {step === 'brand' && (
            <>
              <StyleAndBackgroundField config={config} kind={data.kind} onChange={update} />

              <details
                ref={el => {
                  sectionRefs.current.brand = el;
                }}
                open
              >
                <summary>Identidade e capa</summary>
            <div className="se-detail-content">
              <LogoPicker
                value={effectiveLogo}
                hasCatalogLogo={Boolean(data.logo)}
                logoRemoved={Boolean(config.logoRemoved)}
                logoDisplay={config.logoDisplay || 'both'}
                companyId={companyId}
                demo={demo}
                demoLogo={data.logo}
                siteName={data.name}
                surfaceBackground={pageSurface.background}
                surfaceInk={pageSurface.ink}
                onChange={update}
                onLogoReplaced={queueStaleLogo}
              />

              <div className="se-block-group">
                <span className="se-label-title">Cor dos botões e destaques</span>
                <div className="se-chip-row" role="group" aria-label="Cores sugeridas para botões">
                  {ACCENT_PRESETS.map(presetColor => (
                    <button
                      key={presetColor.hex}
                      type="button"
                      className="se-color-chip"
                      aria-pressed={config.accent.toLowerCase() === presetColor.hex.toLowerCase()}
                      onClick={() => update({ accent: presetColor.hex })}
                    >
                      <i aria-hidden="true" style={{ background: presetColor.hex }} />
                      {presetColor.label}
                    </button>
                  ))}
                </div>
                <label className="se-color">
                  <span>Cor da sua marca</span>
                  <input type="color" value={config.accent} onChange={e => update({ accent: e.target.value })} />
                  <span className="se-color-hint">Toque para ajustar</span>
                </label>
                {safeAccent.background.toLowerCase() !== config.accent.toLowerCase() && (
                  <p className="se-help">Ajustamos o tom no site para manter leitura confortável nos botões.</p>
                )}
              </div>

              <div className="se-block-group">
                {photoPicker(
                  'Foto de capa',
                  activeCover,
                  cover => update({ cover, coverRemoved: !cover }),
                  {
                    onRemove: activeCover ? () => update({ cover: undefined, coverRemoved: true }) : undefined,
                  },
                )}
                {config.coverRemoved && data.cover && (
                  <button
                    type="button"
                    className="se-secondary"
                    onClick={() => update({ cover: undefined, coverRemoved: false })}
                  >
                    <RotateCcw size={14} aria-hidden="true" />
                    Usar foto de capa do cadastro
                  </button>
                )}
                {activeCover && (
                  <div className="se-field">
                    <label className="se-field se-field-nested">
                      <span>Enquadramento da foto principal</span>
                      <select
                        value={config.photoFocus || 'center'}
                        onChange={e => {
                          const photoFocus = e.target.value as PhotoFocus;
                          update({ photoFocus, photoPosition: FOCUS_PRESETS[photoFocus] });
                        }}
                      >
                        <option value="center">Centro</option>
                        <option value="work">Rosto e ofício</option>
                        <option value="space">Ambiente da casa</option>
                        <option value="top">Parte de cima</option>
                        <option value="bottom">Parte de baixo</option>
                      </select>
                    </label>
                    <div className="se-focus-preview">
                      <img src={activeCover} alt="" style={{ objectPosition: photoObjectPosition(config) }} />
                    </div>
                    <div className="se-focus-sliders">
                      <label>
                        Horizontal
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={config.photoPosition?.x ?? FOCUS_PRESETS[config.photoFocus || 'center'].x}
                          onChange={e =>
                            update({
                              photoPosition: {
                                x: Number(e.target.value),
                                y: config.photoPosition?.y ?? 50,
                              },
                            })
                          }
                        />
                      </label>
                      <label>
                        Vertical
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={config.photoPosition?.y ?? FOCUS_PRESETS[config.photoFocus || 'center'].y}
                          onChange={e =>
                            update({
                              photoPosition: {
                                x: config.photoPosition?.x ?? 50,
                                y: Number(e.target.value),
                              },
                            })
                          }
                        />
                      </label>
                    </div>
                    <small>
                      Recorte a foto sem alterar o arquivo original. Use ambiente da casa quando houver cadeira e espaço no mesmo quadro.
                    </small>
                  </div>
                )}
              </div>
            </div>
          </details>
              <button type="button" className="se-step-next" onClick={() => changeStep('intro')}>
                Próximo: Textos da capa →
              </button>
            </>
          )}

          {step === 'intro' && (
            <>
              <details
                ref={el => {
                  sectionRefs.current.intro = el;
                }}
                open
              >
                <summary>Capa e apresentação</summary>
            <div className="se-detail-content">
              {field(
                'Frase principal',
                config.headline,
                headline => update({ headline }),
                true,
                data.kind === 'beauty'
                  ? 'Bom: Salão em Pinheiros com hora marcada · Evite: O melhor salão'
                  : data.kind === 'studio'
                    ? 'Bom: Estúdio em Pinheiros com hora marcada · Evite: O melhor estúdio'
                    : 'Bom: Barbearia em Pinheiros com hora marcada · Evite: A melhor barbearia',
              )}
              <div className="se-suggestions">
                <span>Ideias prontas (toque para usar):</span>
                <div className="se-chip-row">
                  {headlineSuggestions(data.kind, data.address).map(suggestion => (
                    <button
                      key={suggestion}
                      type="button"
                      className="se-chip"
                      onClick={() => update({ headline: suggestion })}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              {field(
                'Sobre a casa',
                config.about,
                about => update({ about }),
                true,
                'Bom: Diagnóstico antes do corte, café passado na hora · Evite: Profissionais qualificados',
              )}

              {field(
                'Texto do botão principal',
                config.ctaLabel ?? '',
                ctaLabel => update({ ctaLabel }),
                false,
                'Deixe em branco para usar o padrão da casa.',
              )}
              <div className="se-chip-row">
                {CTA_SUGGESTIONS.map(label => (
                  <button
                    key={label}
                    type="button"
                    className="se-chip"
                    aria-pressed={(config.ctaLabel || '') === label}
                    onClick={() => update({ ctaLabel: label })}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="se-block-group">
                <span className="se-label-title">Diferenciais da casa</span>
                <p className="se-help se-help-tight">
                  Conte motivos concretos: pontualidade, toalha quente, diagnóstico dos fios, retoque grátis.
                </p>
                <div className="se-list-editor">
                  {config.differences.map((item, index) => (
                    <div className="se-list-row" key={`diff-${index}`}>
                      <input
                        type="text"
                        aria-label={`Diferencial ${index + 1}`}
                        value={item}
                        placeholder="Ex.: Atendimento no horário marcado"
                        maxLength={250}
                        onChange={e =>
                          update({
                            differences: config.differences.map((entry, n) =>
                              n === index ? e.target.value : entry,
                            ),
                          })
                        }
                      />
                      <button
                        type="button"
                        className="se-icon-btn"
                        aria-label={`Remover diferencial ${index + 1}`}
                        onClick={() =>
                          update({
                            differences: config.differences.filter((_, n) => n !== index),
                          })
                        }
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="se-secondary"
                  onClick={() => update({ differences: [...config.differences, ''] })}
                >
                  <Plus size={15} aria-hidden="true" />
                  Adicionar diferencial
                </button>
                <div className="se-suggestions">
                  <span>Sugestões rápidas:</span>
                  <div className="se-chip-row">
                    {differenceSuggestions(data.kind).map(suggestion => (
                      <button
                        key={suggestion}
                        type="button"
                        className="se-chip"
                        onClick={() => {
                          if (!config.differences.includes(suggestion)) {
                            update({
                              differences: [...config.differences.filter(item => item.trim()), suggestion],
                            });
                          }
                        }}
                      >
                        + {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </details>

          <details>
            <summary>Oferta de boas-vindas</summary>
            <div className="se-detail-content">
              <label className="se-check">
                <input
                  type="checkbox"
                  checked={config.offer.enabled}
                  onChange={e => update({ offer: { ...config.offer, enabled: e.target.checked } })}
                />
                Mostrar oferta no site
              </label>
              <div className="se-suggestions">
                <span>Modelos prontos de 1 clique:</span>
                <div className="se-chip-row">
                  {offerTemplates(data.kind).map(template => (
                    <button
                      key={template.label}
                      type="button"
                      className="se-chip"
                      onClick={() =>
                        update({
                          offer: {
                            ...config.offer,
                            enabled: true,
                            kind: template.kind,
                            title: template.title,
                            condition: template.condition,
                          },
                        })
                      }
                    >
                      {template.label}
                    </button>
                  ))}
                </div>
              </div>
              <label className="se-field">
                <span>Tipo da oferta</span>
                <select
                  value={config.offer.kind || 'first_visit'}
                  onChange={e =>
                    update({
                      offer: { ...config.offer, kind: e.target.value as OfferKind },
                    })
                  }
                >
                  <option value="first_visit">1ª visita</option>
                  <option value="featured">Serviço em destaque</option>
                  <option value="combo">Combo especial</option>
                  <option value="club">Plano do clube</option>
                </select>
              </label>
              {field('Sua oferta', config.offer.title, title =>
                update({ offer: { ...config.offer, title } }),
              )}
              {field(
                'Condições da oferta',
                config.offer.condition,
                condition => update({ offer: { ...config.offer, condition } }),
                true,
                'Só o que o título não diz: dias, público, serviço. Não repita a oferta.',
              )}
              <label className="se-field">
                <span>Serviço da oferta</span>
                <select
                  value={config.offer.serviceId || ''}
                  onChange={e =>
                    update({
                      offer: { ...config.offer, serviceId: e.target.value || undefined },
                    })
                  }
                >
                  <option value="">Cliente escolhe o serviço</option>
                  {data.services.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="se-field">
                <span>Válida até (opcional)</span>
                <input
                  type="date"
                  value={config.offer.expires || ''}
                  onChange={e => update({ offer: { ...config.offer, expires: e.target.value } })}
                />
              </label>
              <p className="se-help">
                O agendamento mostra o preço do cadastro. A equipe confere e concede a oferta no atendimento.
              </p>
            </div>
          </details>

              <details
                ref={el => {
                  sectionRefs.current.contact = el;
                }}
              >
                <summary>
                  <span className="se-summary-stack">
                    <span>Dúvidas frequentes e contato</span>
                    <small>Perguntas comuns, endereço, mapa, WhatsApp e Instagram</small>
                  </span>
                </summary>
                <div className="se-detail-content">
                  <div className="se-block-group">
                    <span className="se-label-title">Perguntas frequentes</span>
                    <div className="se-suggestions">
                      <span>Adicionar dúvida comum:</span>
                      <div className="se-chip-row">
                        {FAQ_SUGGESTIONS.map(item => (
                          <button
                            key={item.label}
                            type="button"
                            className="se-chip"
                            onClick={() => {
                              if (!config.faq.some(existing => existing.question === item.question)) {
                                update({
                                  faq: [...config.faq, { question: item.question, answer: item.answer }],
                                });
                              }
                            }}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {config.faq.map((faq, i) => (
                      <fieldset key={i}>
                        <legend>Pergunta {i + 1}</legend>
                        {field('Pergunta', faq.question, question =>
                          update({
                            faq: config.faq.map((f, n) => (n === i ? { ...f, question } : f)),
                          }),
                        )}
                        {field(
                          'Resposta',
                          faq.answer,
                          answer =>
                            update({
                              faq: config.faq.map((f, n) => (n === i ? { ...f, answer } : f)),
                            }),
                          true,
                        )}
                        <button
                          type="button"
                          className="se-link-button"
                          onClick={() => update({ faq: config.faq.filter((_, n) => n !== i) })}
                        >
                          Remover pergunta
                        </button>
                      </fieldset>
                    ))}
                    <button
                      type="button"
                      className="se-secondary"
                      onClick={() => update({ faq: [...config.faq, { question: '', answer: '' }] })}
                    >
                      <Plus size={15} aria-hidden="true" />
                      Adicionar pergunta
                    </button>
                  </div>

                  <div className="se-block-group">
                    <span className="se-label-title">Contato e endereço</span>
                    {field(
                      'Endereço completo',
                      config.contact?.address ?? data.address,
                      address => update({ contact: { ...config.contact, address } }),
                      false,
                      'Usado no site, no mini mapa e no Google. Informe rua, número, bairro e cidade.',
                      { placeholder: 'Ex.: Rua Fradique Coutinho, 420 — Pinheiros, São Paulo' },
                    )}
                    {field(
                      'Ponto de referência',
                      config.contact?.addressNote ?? '',
                      addressNote => update({ contact: { ...config.contact, addressNote } }),
                      false,
                      'Ex.: Ao lado do metrô Fradique Coutinho. Aparece logo abaixo do endereço.',
                      { placeholder: 'Ex.: Ao lado do metrô' },
                    )}
                    <div className="se-field-group">
                      <label className="se-field">
                        <span>Link do Google Maps ou coordenadas (opcional)</span>
                        <input
                          type="text"
                          value={locationInput}
                          placeholder="Maps ou -23.56, -46.68"
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck={false}
                          aria-invalid={Boolean(locationError)}
                          aria-describedby={locationError ? 'se-location-error' : 'se-location-hint'}
                          onChange={e => handleLocationInputChange(e.target.value)}
                          maxLength={1000}
                        />
                      </label>
                      {locationError ? (
                        <p id="se-location-error" role="alert" className="se-location-error">
                          {locationError}
                        </p>
                      ) : (
                        <small id="se-location-hint" className="se-field-hint">
                          Se quiser travar o pino exato no mapa, cole aqui o link de Compartilhar do Google Maps ou as coordenadas.
                        </small>
                      )}
                    </div>
                    {(effectiveAddress || ((confirmedCoordinates || config.contact?.mapsUrl) && !locationError)) && (
                      <div className="se-location-summary">
                        <div className="se-location-summary-head">
                          <MapPin size={15} aria-hidden="true" />
                          <strong>{effectiveAddress || 'Pino confirmado no mapa'}</strong>
                        </div>
                        {config.contact?.addressNote?.trim() && (
                          <p className="se-help se-help-tight">
                            Referência: {config.contact.addressNote.trim()}
                          </p>
                        )}
                        {(confirmedCoordinates || config.contact?.mapsUrl) && !locationError && (
                          <div className="se-location-pin-row">
                            <span>
                              {confirmedCoordinates
                                ? `Localização exata confirmada (${confirmedCoordinates.lat}, ${confirmedCoordinates.lng})`
                                : 'Link do Google Maps confirmado para "Como chegar"'}
                            </span>
                            <button type="button" className="se-link-button se-location-clear" onClick={clearLocationPin}>
                              Limpar
                            </button>
                          </div>
                        )}
                        {!locationError && effectiveDirectionsUrl && (
                          <a
                            className="se-location-check-link"
                            href={effectiveDirectionsUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Conferir no Google Maps
                            <ExternalLink size={13} aria-hidden="true" />
                          </a>
                        )}
                      </div>
                    )}
                    {field(
                      'WhatsApp do estabelecimento',
                      config.contact?.phone ?? data.phone ?? '',
                      phone => update({ contact: { ...config.contact, phone } }),
                      false,
                      undefined,
                      { type: 'tel', inputMode: 'tel', placeholder: 'Ex.: (11) 99999-8888' },
                    )}
                    {field(
                      'Instagram',
                      config.contact?.instagram ?? data.instagram ?? '',
                      instagram => update({ contact: { ...config.contact, instagram } }),
                      false,
                      undefined,
                      { autoCapitalize: 'none', autoCorrect: 'off', placeholder: 'Ex.: @minhacasa' },
                    )}
                  </div>
                </div>
              </details>

              <button type="button" className="se-step-next" onClick={() => changeStep('photos')}>
                Próximo: Fotos e serviços →
              </button>
            </>
          )}

          {step === 'photos' && (
            <>
              <details
                ref={el => {
                  sectionRefs.current.photos = el;
                }}
                open
              >
                <summary>Fotos, serviços e equipe</summary>
            <div className="se-detail-content">
              <div className="se-block-group">
                <span className="se-label-title">Galeria do espaço e trabalhos</span>
                <p className="se-help se-help-tight">
                  Combine fotos reais do ambiente e dos resultados. Toque para descrever, reordenar ou remover.
                </p>
                {galleryItems.length > 0 ? (
                  <div className="se-gallery-grid">
                    {galleryItems.map((photo, index) => (
                      <div className="se-gallery-item" key={`${photo.src}-${index}`}>
                        <img src={photo.src} alt={photo.alt || `Foto ${index + 1}`} loading="lazy" />
                        <div className="se-gallery-item-body">
                          <input
                            type="text"
                            aria-label={`Descrição da foto ${index + 1}`}
                            value={photo.alt}
                            maxLength={200}
                            placeholder="Ex.: Acabamento na navalha"
                            onChange={e =>
                              update({
                                gallery: galleryItems.map((entry, n) =>
                                  n === index ? { ...entry, alt: e.target.value } : entry,
                                ),
                              })
                            }
                          />
                          <div className="se-gallery-item-actions">
                            <button
                              type="button"
                              className="se-icon-btn"
                              aria-label={`Mover foto ${index + 1} para cima`}
                              disabled={index === 0}
                              onClick={() => moveGalleryItem(index, -1)}
                            >
                              <ArrowUp size={15} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className="se-icon-btn"
                              aria-label={`Mover foto ${index + 1} para baixo`}
                              disabled={index === galleryItems.length - 1}
                              onClick={() => moveGalleryItem(index, 1)}
                            >
                              <ArrowDown size={15} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className="se-icon-btn"
                              aria-label={`Remover foto ${index + 1}`}
                              onClick={() =>
                                update({
                                  gallery: galleryItems.filter((_, n) => n !== index),
                                })
                              }
                            >
                              <Trash2 size={15} aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="se-help se-help-tight">
                    Nenhuma foto na galeria ainda. Adicione fotos reais do espaço e dos trabalhos abaixo.
                  </p>
                )}
                {photoPicker(
                  'Adicionar foto à galeria',
                  '',
                  src => {
                    if (!src.trim()) return;
                    update({
                      gallery: [...galleryItems, { src, alt: `Trabalho e espaço de ${data.name}` }],
                    });
                  },
                  { uploadLabel: 'Adicionar foto do celular' },
                )}
              </div>

              <div className="se-block-group">
                <span className="se-label-title">Antes e depois</span>
                {(config.beforeAfter ?? []).map((pair, index) => (
                  <fieldset key={`ba-${index}`}>
                    <legend>Antes e depois {index + 1}</legend>
                    {photoPicker(
                      'Foto de antes',
                      pair.before,
                      before =>
                        update({
                          beforeAfter: (config.beforeAfter ?? []).map((item, n) =>
                            n === index ? { ...item, before } : item,
                          ),
                        }),
                      { helperText: '' },
                    )}
                    {photoPicker(
                      'Foto de depois',
                      pair.after,
                      after =>
                        update({
                          beforeAfter: (config.beforeAfter ?? []).map((item, n) =>
                            n === index ? { ...item, after } : item,
                          ),
                        }),
                      { helperText: '' },
                    )}
                    {field('Legenda', pair.caption ?? '', caption =>
                      update({
                        beforeAfter: (config.beforeAfter ?? []).map((item, n) =>
                          n === index ? { ...item, caption } : item,
                        ),
                      }),
                    )}
                    <button
                      type="button"
                      className="se-link-button"
                      onClick={() =>
                        update({
                          beforeAfter: (config.beforeAfter ?? []).filter((_, n) => n !== index),
                        })
                      }
                    >
                      Remover par
                    </button>
                  </fieldset>
                ))}
                <button
                  type="button"
                  className="se-secondary"
                  onClick={() =>
                    update({
                      beforeAfter: [
                        ...(config.beforeAfter ?? []),
                        {
                          before: galleryItems[0]?.src || '',
                          after: galleryItems[1]?.src || '',
                        },
                      ],
                    })
                  }
                >
                  <Plus size={15} aria-hidden="true" />
                  Adicionar antes e depois
                </button>
              </div>

              <div className="se-block-group">
                <span className="se-label-title">Serviços em destaque</span>
                <p className="se-help se-help-tight">
                  Preços e durações vêm de Ajustes → Serviços. Aqui você apresenta cada cuidado.
                </p>
                {data.services.map(service => {
                  const details = config.serviceDetails?.[service.id] || {};
                  const change = (patch: typeof details) =>
                    update({
                      serviceDetails: {
                        ...config.serviceDetails,
                        [service.id]: { ...details, ...patch },
                      },
                    });
                  return (
                    <details className="se-subdetail" key={service.id}>
                      <summary>
                        <span>{service.name}</span>
                        <small>
                          {service.duration} min · {formatPrice(service.price, data.region)}
                        </small>
                      </summary>
                      <div className="se-subdetail-body">
                        {field(
                          'Descrição',
                          details.description ?? service.description ?? '',
                          description => change({ description }),
                          true,
                        )}
                        {field(
                          'O que inclui — um por linha',
                          (details.includes ?? service.includes).join('\n'),
                          value => change({ includes: value.split('\n') }),
                          true,
                        )}
                        {field('Para quem é', details.audience ?? service.audience ?? '', audience =>
                          change({ audience }),
                        )}
                        {photoPicker(
                          'Foto do serviço',
                          details.image ?? service.image ?? '',
                          image => change({ image }),
                          {
                            onRemove:
                              details.image || service.image ? () => change({ image: undefined }) : undefined,
                            helperText: '',
                          },
                        )}
                        <label className="se-check">
                          <input
                            type="checkbox"
                            checked={details.priceFrom ?? service.priceFrom ?? false}
                            onChange={e => change({ priceFrom: e.target.checked })}
                          />
                          Preço a partir de
                        </label>
                        <label className="se-check">
                          <input
                            type="checkbox"
                            checked={details.featured ?? service.featured ?? false}
                            onChange={e => change({ featured: e.target.checked })}
                          />
                          Destacar como mais pedido
                        </label>
                        {field(
                          'Por que o preço pode variar?',
                          details.priceNote ?? service.priceNote ?? '',
                          priceNote => change({ priceNote }),
                        )}
                      </div>
                    </details>
                  );
                })}
              </div>

              <div className="se-block-group">
                <span className="se-label-title">Equipe</span>
                {data.team.length === 0 ? (
                  <p className="se-help se-help-tight">
                    Cadastre profissionais em Ajustes → Equipe para exibi-los no site.
                  </p>
                ) : (
                  data.team.map(person => (
                    <details className="se-subdetail" key={person.id}>
                      <summary>
                        <span>{person.name}</span>
                      </summary>
                      <div className="se-subdetail-body">
                        {field(
                          'Especialidade',
                          config.teamDetails?.[person.id]?.bio ?? person.bio ?? '',
                          bio =>
                            update({
                              teamDetails: {
                                ...config.teamDetails,
                                [person.id]: { ...config.teamDetails?.[person.id], bio },
                              },
                            }),
                        )}
                        {photoPicker(
                          'Foto profissional',
                          config.teamDetails?.[person.id]?.image ?? person.image ?? '',
                          image =>
                            update({
                              teamDetails: {
                                ...config.teamDetails,
                                [person.id]: { ...config.teamDetails?.[person.id], image },
                              },
                            }),
                          {
                            onRemove:
                              config.teamDetails?.[person.id]?.image || person.image
                                ? () =>
                                    update({
                                      teamDetails: {
                                        ...config.teamDetails,
                                        [person.id]: {
                                          ...config.teamDetails?.[person.id],
                                          image: undefined,
                                        },
                                      },
                                    })
                                : undefined,
                            helperText: '',
                          },
                        )}
                      </div>
                    </details>
                  ))
                )}
              </div>
            </div>
          </details>

              <details>
                <summary>
                  <span className="se-summary-stack">
                    <span>Seções e ordem da página</span>
                    <small>Escolha o que aparece e em qual ordem</small>
                  </span>
                </summary>
                <div className="se-detail-content">
                  <div className="se-block-group">
                    <span className="se-label-title">Ordem e visibilidade das seções</span>
                    <p className="se-help se-help-tight">Seções sem conteúdo ficam ocultas automaticamente no site.</p>
                    {config.sections.map((section, index) => {
                      const hasContent = sectionHasContent(section.id);
                      return (
                        <div className="se-section-row" key={section.id}>
                          <label>
                            <input
                              type="checkbox"
                              checked={section.enabled}
                              onChange={e =>
                                update({
                                  sections: config.sections.map(s =>
                                    s.id === section.id ? { ...s, enabled: e.target.checked } : s,
                                  ),
                                })
                              }
                            />
                            {sectionLabels[section.id]}
                          </label>
                          {!hasContent && <span className="se-empty-badge">Sem conteúdo ainda</span>}
                          <button
                            type="button"
                            aria-label={`Mover ${sectionLabels[section.id]} para cima`}
                            disabled={index === 0}
                            onClick={() => moveSection(index, -1)}
                          >
                            <ArrowUp size={16} />
                          </button>
                          <button
                            type="button"
                            aria-label={`Mover ${sectionLabels[section.id]} para baixo`}
                            disabled={index === config.sections.length - 1}
                            onClick={() => moveSection(index, 1)}
                          >
                            <ArrowDown size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </details>

              <button type="button" className="se-step-next" onClick={() => changeStep('share')}>
                Próximo: Google e divulgar →
              </button>
            </>
          )}

          {step === 'share' && (
            <>
              {demo ? (
                <section className="se-publish-card" data-state="demo" aria-label="Publicação do site">
                  <span className="se-status-badge">Demonstração interativa</span>
                  <strong>Site pronto na demonstração</strong>
                  <p className="se-help se-help-tight">
                    Suas edições já estão salvas neste navegador. Abra a demonstração para testar a página como um cliente.
                  </p>
                  <div className="se-publish-card-actions">
                    <a
                      className="se-save"
                      href={`/#/site/${data.slug || 'site'}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink size={15} aria-hidden="true" />
                      Abrir demonstração
                    </a>
                    <button type="button" className="se-secondary" onClick={() => setExpanded(true)}>
                      <Maximize2 size={15} aria-hidden="true" />
                      Ver prévia em tela cheia
                    </button>
                  </div>
                </section>
              ) : !presenceEnabled ? (
                <section className="se-publish-card" data-state="pending" aria-label="Publicação do site">
                  <span className="se-status-badge">Rascunho salvo · Liberação pendente</span>
                  <strong>Seu site já está salvo. Falta liberar a publicação</strong>
                  <p className="se-help se-help-tight">
                    Tudo o que você personalizou já fica guardado automaticamente. Para colocar seu site no ar para clientes, peça a liberação para a equipe AgendiX.
                  </p>
                  <div className="se-publish-card-actions">
                    <a
                      className="se-save"
                      href={activationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle size={16} aria-hidden="true" />
                      Solicitar liberação no WhatsApp
                    </a>
                    <button type="button" className="se-secondary" onClick={() => setExpanded(true)}>
                      <Maximize2 size={15} aria-hidden="true" />
                      Ver prévia em tela cheia
                    </button>
                  </div>
                </section>
              ) : (
                <section className="se-publish-card" data-state={isSiteLive ? 'live' : 'ready'} aria-label="Publicação do site">
                  <span className="se-status-badge" data-live={isSiteLive || undefined}>
                    {isSiteLive ? 'Site no ar' : 'Pronto para publicar'}
                  </span>
                  <strong>{isSiteLive ? 'Seu site está no ar' : 'Tudo pronto para publicar'}</strong>
                  <p className="se-help se-help-tight">
                    {isSiteLive
                      ? 'Suas edições já ficam salvas no rascunho automático. Toque abaixo quando quiser atualizar o endereço público.'
                      : 'Seu rascunho já está salvo e liberado. Toque em Publicar site para colocar seu endereço no ar para clientes.'}
                  </p>
                  <div className="se-publish-card-actions">
                    <button
                      type="button"
                      className="se-save"
                      onClick={() => void changePublication()}
                      disabled={saving || storage !== 'remote'}
                    >
                      {isSiteLive ? 'Publicar alterações' : 'Publicar site'}
                    </button>
                    {isSiteLive ? (
                      <a
                        className="se-secondary"
                        href={`/#/site/${data.slug || 'site'}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink size={15} aria-hidden="true" />
                        Abrir site publicado
                      </a>
                    ) : (
                      <button type="button" className="se-secondary" onClick={() => setExpanded(true)}>
                        <Maximize2 size={15} aria-hidden="true" />
                        Ver prévia em tela cheia
                      </button>
                    )}
                  </div>
                </section>
              )}

              <details open>
                <summary>Compartilhar, QR Code e Google</summary>
                <div className="se-detail-content">
                  <div className="se-block-group se-share-block">
                    <span className="se-label-title">Compartilhar agora</span>
                    <p className="se-share-url">{shareLinks.direct}</p>
                    <div className="se-share-buttons">
                      <button
                        type="button"
                        className="se-secondary"
                        onClick={() => copyText(shareLinks.direct, 'Link do site copiado.')}
                      >
                        <Copy size={15} aria-hidden="true" />
                        Copiar link
                      </button>
                      <a className="se-secondary" href={whatsappShareUrl} target="_blank" rel="noreferrer">
                        <MessageCircle size={15} aria-hidden="true" />
                        Enviar no WhatsApp
                      </a>
                      <button
                        type="button"
                        className="se-secondary"
                        onClick={() => copyText(shareLinks.instagram, 'Link para bio do Instagram copiado.')}
                      >
                        <Copy size={15} aria-hidden="true" />
                        Copiar link para bio do Instagram
                      </button>
                      <button
                        type="button"
                        className="se-secondary"
                        onClick={() => copyText(shareLinks.google, 'Link para perfil do Google copiado.')}
                      >
                        <Copy size={15} aria-hidden="true" />
                        Copiar link para perfil do Google
                      </button>
                    </div>
                  </div>

                  <div className="se-qr-card">
                    {qrDataUrl && <img className="se-qr-image" src={qrDataUrl} alt={`QR Code de ${data.name}`} />}
                    <div className="se-qr-info">
                      <strong>QR Code para balcão e espelho</strong>
                      <p className="se-help se-help-tight">
                        O cliente aponta a câmera do celular e cai direto no seu site com serviços e horários.
                      </p>
                      <div className="se-share-buttons">
                        <button type="button" className="se-secondary" onClick={() => void downloadQr()}>
                          <Download size={15} aria-hidden="true" />
                          Baixar QR Code
                        </button>
                        <button type="button" className="se-secondary" onClick={() => void printQrPlaque()}>
                          <Printer size={15} aria-hidden="true" />
                          Imprimir plaquinha
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="se-block-group">
                    <span className="se-label-title">Como seu site aparece no Google</span>
                    <div className="se-google-card" aria-label="Prévia do resultado no Google">
                      <span className="se-google-url">
                        agendixstudio.com/s/{data.slug}
                      </span>
                      <strong>{seoPreview?.title}</strong>
                      <p>{seoPreview?.description}</p>
                    </div>
                    {field(
                      'Título para o Google',
                      config.seoTitle,
                      seoTitle => update({ seoTitle }),
                      false,
                      'Se deixar vazio, montamos automaticamente com o nome e o endereço da casa.',
                    )}
                    {field('Descrição para o Google', config.seoDescription, seoDescription =>
                      update({ seoDescription }),
                    true,
                    )}
                  </div>

                  <div className="se-google-check">
                    <strong>Confira com seu Perfil da Empresa no Google</strong>
                    <p className="se-help se-help-tight">
                      Nome, endereço e telefone idênticos aos do perfil no Google ajudam clientes próximos a encontrar sua casa.
                    </p>
                    <ul>
                      <li>
                        <span>Nome:</span> {data.name}
                      </li>
                      <li>
                        <span>Endereço:</span> {effectiveAddress || 'Não informado'}{' '}
                        {!effectiveAddress && (
                          <button
                            type="button"
                            className="se-link-button se-inline-jump"
                            onClick={() => jumpToSection('contact')}
                          >
                            Informar endereço
                          </button>
                        )}
                      </li>
                      <li>
                        <span>Telefone / WhatsApp:</span> {effectivePhone || 'Não informado'}
                      </li>
                    </ul>
                  </div>

                  <div className="se-danger-zone">
                    {isSiteLive && (
                      <button
                        type="button"
                        className="se-link-button"
                        onClick={() => void changePublication(true)}
                        disabled={saving}
                      >
                        Despublicar site
                      </button>
                    )}
                    {!confirmReset ? (
                      <button
                        type="button"
                        className="se-link-button"
                        onClick={() => setConfirmReset(true)}
                      >
                        Restaurar padrão
                      </button>
                    ) : (
                      <div className="se-reset-confirm">
                        <span>Voltar tudo ao padrão inicial do cadastro?</span>
                        <div className="se-chip-row">
                          <button
                            type="button"
                            className="se-chip se-chip-danger"
                            onClick={() => {
                              userEditedRef.current = true;
                              const next = defaultConfig(data);
                              setConfig(next);
                              setLocationInput(initialLocationText(next));
                              setLocationError('');
                              setConfirmReset(false);
                              setSaved('Configurações restauradas ao padrão. Salvando automaticamente…');
                            }}
                          >
                            Sim, restaurar
                          </button>
                          <button type="button" className="se-chip" onClick={() => setConfirmReset(false)}>
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="se-help">
                    O site real só fica disponível depois de publicado. A demonstração pode ser aberta agora.
                  </p>
                </div>
              </details>
            </>
          )}
        </div>

        <aside
          className="se-preview"
          data-expanded={expanded || undefined}
          role={expanded ? 'dialog' : undefined}
          aria-modal={expanded ? true : undefined}
          aria-label={expanded ? 'Prévia em tela cheia' : undefined}
        >
          <div className="se-preview-toolbar">
            {expanded ? (
              <>
                <div>
                  <span className="se-preview-live" />
                  Prévia em tela cheia
                </div>
                <button ref={backBtnRef} type="button" className="se-preview-back" onClick={() => setExpanded(false)}>
                  <ArrowLeft size={18} />
                  Voltar ao editor
                </button>
              </>
            ) : (
              <>
                <div>
                  <span className="se-preview-live" />
                  Prévia ao vivo
                </div>
                <div className="se-preview-modes">
                  <button
                    type="button"
                    aria-label="Prévia no celular"
                    aria-pressed={mode === 'mobile'}
                    onClick={() => setMode('mobile')}
                  >
                    <Smartphone size={18} />
                  </button>
                  <button
                    type="button"
                    aria-label="Prévia no computador"
                    aria-pressed={mode === 'desktop'}
                    onClick={() => setMode('desktop')}
                  >
                    <Monitor size={18} />
                  </button>
                  <button
                    type="button"
                    className="se-preview-collapse"
                    aria-expanded={!previewCollapsed}
                    onClick={() => setPreviewCollapsed(prev => !prev)}
                  >
                    {previewCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                    {previewCollapsed ? 'Mostrar prévia' : 'Recolher prévia'}
                  </button>
                </div>
                <button ref={expandBtnRef} type="button" className="se-preview-expand" onClick={() => setExpanded(true)}>
                  <Maximize2 size={16} />
                  Ver em tela cheia
                </button>
              </>
            )}
          </div>
          {(!previewCollapsed || expanded) && (
            <div className="se-preview-stage" data-mode={mode}>
              {previewFrame}
            </div>
          )}
          <p className="se-help">
            A mesma página que seus clientes vão ver. Celular e computador, enquanto você personaliza.
          </p>
        </aside>
      </div>

      {pendingLeave && (
        <div className="se-leave-backdrop">
          <div
            className="se-leave-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="se-leave-title"
          >
            <h2 id="se-leave-title">
              {autosaveStatus === 'error' ? 'Não foi possível salvar suas alterações' : 'Salvamento em andamento'}
            </h2>
            <p>
              {autosaveStatus === 'error'
                ? 'Houve uma falha ao salvar o rascunho. Você pode tentar salvar novamente ou sair descartando o que não foi enviado.'
                : 'Suas alterações ainda estão sendo salvas. Aguarde concluir ou tente finalizar antes de sair.'}
            </p>
            <div className="se-leave-actions">
              <button
                ref={stayBtnRef}
                type="button"
                className="se-secondary"
                onClick={cancelPendingLeave}
              >
                Continuar editando
              </button>
              <button
                type="button"
                className="se-save"
                disabled={autosaveStatus === 'saving'}
                onClick={() => {
                  void persistDraft('manual');
                }}
              >
                Tentar salvar e sair
              </button>
              <button
                type="button"
                className="se-chip se-chip-danger"
                onClick={() => {
                  discardOnLeaveRef.current = true;
                  proceedLeave(pendingLeave);
                }}
              >
                Sair sem salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
