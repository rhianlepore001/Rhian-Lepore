import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp, Check, Copy, ExternalLink, Maximize2, Monitor, Save, Smartphone } from 'lucide-react';
import { accessibleAccent, defaultBackground, FOCUS_PRESETS, isRecommendedBackground, photoObjectPosition, RECOMMENDED_BACKGROUNDS, resolvedBackground, siteSurface, type PhotoFocus, type SiteConfig, type SiteData, type SiteKind } from '../../lib/establishment/model';
import { loadSiteDraft, saveSiteDraft, publishOwnerSite, unpublishOwnerSite } from '../../services/establishmentSite';
import '../../styles/site-editor.css';
import { PhotoPicker } from './PhotoPicker';

interface SiteEditorProps { data: SiteData; initial: SiteConfig; companyId: string; demo?: boolean; embedded?: boolean }
const labels: Record<string, string> = { services: 'Serviços', differences: 'Sobre a casa', gallery: 'Galeria', beforeAfter: 'Antes e depois', team: 'Equipe', reviews: 'Avaliações', faq: 'Perguntas frequentes', location: 'Localização e horários' };

function BackgroundField({ config, kind, onChange }: { config: SiteConfig; kind: SiteKind; onChange: (patch: Partial<SiteConfig>) => void }) {
  const current = resolvedBackground(config, kind);
  const recommended = RECOMMENDED_BACKGROUNDS.some(item => item.hex.toLowerCase() === current.toLowerCase());
  const surface = siteSurface(current, config.style);
  const [customHex, setCustomHex] = useState(current);
  const [pickingCustom, setPickingCustom] = useState(!recommended);
  useEffect(() => { setCustomHex(current); }, [current]);
  const applyHex = (value: string) => {
    setCustomHex(value);
    if (/^#[0-9a-fA-F]{6}$/.test(value.trim())) onChange({ background: value.trim() });
  };
  const customSelected = pickingCustom || !recommended;
  return <fieldset className="se-bg">
    <legend>Cor de fundo</legend>
    <p className="se-help">Recomendadas pelo AgendiX — os padrões de cada estilo. Ou escolha a sua.</p>
    <div className="se-swatches" role="radiogroup" aria-label="Cor de fundo do site">
      {RECOMMENDED_BACKGROUNDS.map(item => {
        const checked = !customSelected && item.hex.toLowerCase() === current.toLowerCase();
        return <button key={item.id} type="button" role="radio" aria-checked={checked} aria-label={`${item.label}, recomendada`} className="se-swatch" style={{ '--swatch': item.hex } as React.CSSProperties} onClick={() => { setPickingCustom(false); onChange({ background: item.hex }); }}>
          <i aria-hidden="true" />
          <span>{item.label}</span>
          <small className="se-swatch-badge">Recomendada</small>
        </button>;
      })}
      <button type="button" role="radio" aria-checked={customSelected} aria-label="Personalizada" className="se-swatch se-swatch-custom" onClick={() => setPickingCustom(true)}>
        <i aria-hidden="true" />
        <span>Personalizada</span>
      </button>
    </div>
    {customSelected && <div className="se-color"><span>Cor personalizada</span><input type="color" aria-label="Selecionar cor" value={/^#[0-9a-fA-F]{6}$/.test(customHex) ? customHex : current} onChange={e => applyHex(e.target.value)} /><input type="text" aria-label="Cor personalizada" value={customHex} maxLength={7} spellCheck={false} onChange={e => applyHex(e.target.value)} /></div>}
    {surface.warning && <p role="status" className="se-contrast">{surface.warning}</p>}
  </fieldset>;
}

export function SiteEditor({ data, initial, companyId, demo = false, embedded = false }: SiteEditorProps) {
  const [config, setConfig] = useState(() => loadSiteDraft(companyId, initial));
  const [saved, setSaved] = useState('');
  const [mode, setMode] = useState<'mobile' | 'desktop'>('mobile');
  const [expanded, setExpanded] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const [frameReady, setFrameReady] = useState(false);
  const [storage, setStorage] = useState<'local' | 'remote'>('local');
  const [saving, setSaving] = useState(false);
  const [presenceEnabled, setPresenceEnabled] = useState(false);
  const [published, setPublished] = useState(false);
  const update = (patch: Partial<SiteConfig>) => { setConfig(current => ({ ...current, ...patch })); setSaved(''); };
  const changeStyle = (style: SiteConfig['style']) => {
    const current = resolvedBackground(config, data.kind);
    update({ style, background: isRecommendedBackground(current) ? defaultBackground(style, data.kind) : current });
  };
  const sendPreview = () => frame.current?.contentWindow?.postMessage({ type: 'agendix:site-preview', data, config }, window.location.origin);
  useEffect(() => { if (frameReady) sendPreview(); }, [config, data, frameReady]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin === window.location.origin && event.source === frame.current?.contentWindow && event.data?.type === 'agendix:site-preview-ready') {
        setFrameReady(true); sendPreview();
      }
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [config, data]);
  useEffect(() => {
    if (!expanded) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setExpanded(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded]);
  useEffect(() => {
    if (demo) return;
    let active = true;
    void import('../../services/establishmentSite').then(m => m.loadOwnerSite(companyId, initial)).then(result => {
      if (!active) return;
      setStorage(result.storage);
      setPresenceEnabled(result.presenceEnabled); setPublished(result.published);
      if (result.config) setConfig(result.config);
    }).catch(() => { if (active) setSaved('Não foi possível ler o rascunho remoto. Sua cópia local continua disponível.'); });
    return () => { active = false; };
  }, [companyId, demo]);
  const save = async () => {
    setSaving(true);
    try {
      saveSiteDraft(companyId, config);
      if (!demo) {
        const m = await import('../../services/establishmentSite');
        const result = await m.saveOwnerSiteDraft(companyId, config);
        setStorage(result.storage);
        setSaved(result.storage === 'remote' ? 'Rascunho salvo. Seu site público não mudou.' : 'Rascunho salvo neste navegador. Nada foi publicado.');
      } else setSaved('Rascunho de demonstração salvo neste navegador.');
    } catch { setSaved('Não foi possível salvar. Confira o espaço e as permissões do navegador e tente novamente.'); }
    finally { setSaving(false); }
  };
  const changePublication = async (unpublish = false) => {
    if (demo || storage !== 'remote' || !presenceEnabled) return;
    setSaving(true);
    try {
      if (unpublish) await unpublishOwnerSite(companyId);
      else await publishOwnerSite(companyId, config);
      setPublished(!unpublish);
      setSaved(unpublish ? 'Site despublicado. O link de agendamento continua funcionando.' : 'Site publicado com esta versão.');
    } catch { setSaved('Não foi possível alterar a publicação. Confira a liberação do plano e tente novamente.'); }
    finally { setSaving(false); }
  };
  const downloadQr = async () => {
    try {
      const QRCode = await import('qrcode');
      const url = await QRCode.toDataURL(link, { width: 900, margin: 3, color: { dark: '#263e33', light: '#ffffff' } });
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${data.slug}-qr.png`; anchor.click();
      setSaved('QR Code preparado para baixar.');
    } catch { setSaved('Não foi possível gerar o QR Code. Tente novamente.'); }
  };
  const move = (index: number, direction: number) => {
    const sections = [...config.sections];
    const other = index + direction;
    if (other < 0 || other >= sections.length) return;
    [sections[index], sections[other]] = [sections[other], sections[index]];
    update({ sections });
  };
  const field = (label: string, value: string, onChange: (value: string) => void, multiline = false, hint?: string) => <label className="se-field"><span>{label}</span>{multiline ? <textarea value={value} onChange={e => onChange(e.target.value)} rows={3} maxLength={2000} /> : <input value={value} onChange={e => onChange(e.target.value)} maxLength={400} />}{hint && <small>{hint}</small>}</label>;
  const photoPicker = (label: string, value: string, onChange: (value: string) => void) => <PhotoPicker label={label} value={value} onChange={onChange} companyId={companyId} demo={demo} choices={[data.cover, ...data.gallery.map(p => p.src)].filter(Boolean) as string[]} />;
  const link = `${window.location.origin}/#/site/${data.slug}`;
  const missing = [!(data.cover || config.cover) && 'foto principal', !data.services.some(s => s.description) && 'descrições dos serviços', !data.gallery.length && 'galeria', !data.address && 'endereço', !data.hours.length && 'horários'].filter(Boolean);
  const pageBackground = resolvedBackground(config, data.kind);
  const safeAccent = accessibleAccent(config.accent, config.style, pageBackground);
  const previewFrame = <iframe ref={frame} title="Prévia ao vivo do meu site" src="/#/site-preview" onLoad={() => { setFrameReady(true); sendPreview(); }} />;

  return <div className="site-editor" data-embedded={embedded || undefined}>
    {demo && <div className="se-demo">Demonstração do editor · dados fictícios · nenhuma publicação real</div>}
    <header className="se-header">
      <div className="se-title"><span className="se-breadcrumb">Ajustes / Presença</span><h1>Meu site</h1><p>Personalize sua casa. Confira antes de publicar.</p></div>
      <div className="se-header-actions">
        <button className="se-save" onClick={() => void save()} disabled={saving}><Save size={17} />{saving ? 'Salvando…' : 'Salvar rascunho'}</button>
        <button className="se-publish" onClick={() => void changePublication()} disabled={saving || demo || storage !== 'remote' || !presenceEnabled} title={!presenceEnabled ? 'Aguardando aprovação e liberação do Presença' : undefined}>{published ? 'Publicar alterações' : 'Publicar'}</button>
        <a href={link} target="_blank" rel="noreferrer" aria-label="Abrir site em nova aba"><ExternalLink size={18} /></a>
      </div>
    </header>
    <div className="se-notice"><span className="se-status-dot" /><strong>{published ? 'Site publicado' : 'Rascunho privado'}</strong><p>{storage === 'local' ? 'Salvo neste navegador. Publicação indisponível nesta prévia.' : presenceEnabled ? 'Suas alterações só entram no ar ao publicar.' : 'Publicação disponível com a liberação do Presença.'}</p></div>
    {saved && <p role="status" className="se-feedback"><Check size={16} aria-hidden="true" />{saved}</p>}
    <div className="se-workspace">
      <div className="se-controls">
        <section className="se-checklist"><strong>O cadastro já faz parte do seu site</strong><p>{data.services.length} {data.services.length === 1 ? 'serviço' : 'serviços'}{data.team.length ? ` · ${data.team.length} ${data.team.length === 1 ? 'profissional' : 'profissionais'}` : ''}{data.gallery.length ? ` · ${data.gallery.length} ${data.gallery.length === 1 ? 'foto' : 'fotos'}` : ''}</p>{missing.length > 0 && <small>Para completar: {missing.join(', ')}.</small>}</section>
        <BackgroundField config={config} kind={data.kind} onChange={update} />
        <details name="site-editor-sections" open><summary>Uma boa primeira impressão</summary><div className="se-detail-content">{field('Frase principal', config.headline, headline => update({ headline }), true, 'Diga o que você faz e em qual bairro. Ex.: Barbearia em Pinheiros.')}{field('Sobre a casa', config.about, about => update({ about }), true)}{field('Diferenciais — um por linha', config.differences.join('\n'), value => update({ differences: value.split('\n') }), true, 'Conte algo concreto: consulta antes do corte, atendimento reservado, cuidado com cachos.')}</div></details>
        <details name="site-editor-sections"><summary>Estilo e identidade</summary><div className="se-detail-content"><div className="se-styles"><button aria-label="Aa Clássico escuro" className="se-style-dark" aria-pressed={config.style === 'dark'} onClick={() => changeStyle('dark')}><span className="se-style-sample"><span>Corte Fino</span><strong>Urbano<br />preciso.</strong><i /></span><span className="se-style-label">Urbano preciso</span></button><button aria-label="Aa Editorial claro" className="se-style-light" aria-pressed={config.style === 'light'} onClick={() => changeStyle('light')}><span className="se-style-sample"><span>Studio Aurora</span><strong>Editorial<br />clássico.</strong><i /></span><span className="se-style-label">Editorial clássico</span></button></div><label className="se-color"><span>Cor da sua marca</span><input type="color" value={config.accent} onChange={e => update({ accent: e.target.value })} /><span>{config.accent}</span></label>{safeAccent.background.toLowerCase() !== config.accent.toLowerCase() && <p className="se-help">Ajustamos a cor no site para preservar a leitura e o contraste.</p>}{photoPicker('Foto de capa', config.cover || data.cover || '', cover => update({ cover }))}<label className="se-field"><span>Enquadramento da foto principal</span><select value={config.photoFocus || 'center'} onChange={e => { const photoFocus = e.target.value as PhotoFocus; update({ photoFocus, photoPosition: FOCUS_PRESETS[photoFocus] }); }}><option value="center">Centro</option><option value="work">Rosto e ofício</option><option value="space">Ambiente da casa</option><option value="top">Parte de cima</option><option value="bottom">Parte de baixo</option></select>{(config.cover || data.cover) && <div className="se-focus-preview"><img src={config.cover || data.cover} alt="" style={{ objectPosition: photoObjectPosition(config) }} /></div>}<div className="se-focus-sliders"><label>Horizontal <input type="range" min={0} max={100} value={config.photoPosition?.x ?? FOCUS_PRESETS[config.photoFocus || 'center'].x} onChange={e => update({ photoPosition: { x: Number(e.target.value), y: config.photoPosition?.y ?? 50 } })} /></label><label>Vertical <input type="range" min={0} max={100} value={config.photoPosition?.y ?? FOCUS_PRESETS[config.photoFocus || 'center'].y} onChange={e => update({ photoPosition: { x: config.photoPosition?.x ?? 50, y: Number(e.target.value) } })} /></label></div><small>Recorte a foto sem alterar o arquivo original. Use ambiente da casa quando houver barbeiro, cadeira e espaço no mesmo quadro.</small></label></div></details>
        <details name="site-editor-sections"><summary>Oferta de boas-vindas</summary><div className="se-detail-content"><label className="se-check"><input type="checkbox" checked={config.offer.enabled} onChange={e => update({ offer: { ...config.offer, enabled: e.target.checked } })} />Mostrar oferta no site</label>{field('Sua oferta', config.offer.title, title => update({ offer: { ...config.offer, title } }))}{field('Condições da oferta', config.offer.condition, condition => update({ offer: { ...config.offer, condition } }), true, 'Só o que o título não diz: dias, público, serviço. Não repita a oferta.')}<label className="se-field"><span>Serviço da oferta</span><select value={config.offer.serviceId || ''} onChange={e => update({ offer: { ...config.offer, serviceId: e.target.value || undefined } })}><option value="">Cliente escolhe o serviço</option>{data.services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label className="se-field"><span>Válida até (opcional)</span><input type="date" value={config.offer.expires || ''} onChange={e => update({ offer: { ...config.offer, expires: e.target.value } })} /></label><p className="se-help">O agendamento mostra o preço do cadastro. A equipe confere e concede a oferta no atendimento.</p></div></details>
        <details name="site-editor-sections"><summary>Seções e ordem da página</summary><div className="se-detail-content"><p className="se-help">Seções sem conteúdo ficam ocultas automaticamente.</p>{config.sections.map((section, index) => <div className="se-section-row" key={section.id}><label><input type="checkbox" checked={section.enabled} onChange={e => update({ sections: config.sections.map(s => s.id === section.id ? { ...s, enabled: e.target.checked } : s) })} />{labels[section.id]}</label><button aria-label={`Mover ${labels[section.id]} para cima`} disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp size={16} /></button><button aria-label={`Mover ${labels[section.id]} para baixo`} disabled={index === config.sections.length - 1} onClick={() => move(index, 1)}><ArrowDown size={16} /></button></div>)}</div></details>
        <details name="site-editor-sections"><summary>Serviços que vendem</summary><div className="se-detail-content"><p className="se-help">Preços e durações vêm de Ajustes → Serviços. Aqui você apresenta cada cuidado.</p>{data.services.map(service => {
          const details = config.serviceDetails?.[service.id] || {};
          const change = (patch: typeof details) => update({ serviceDetails: { ...config.serviceDetails, [service.id]: { ...details, ...patch } } });
          return <fieldset key={service.id}><legend>{service.name}</legend>{field('Descrição', details.description ?? service.description ?? '', description => change({ description }), true)}{field('O que inclui — um por linha', (details.includes ?? service.includes).join('\n'), value => change({ includes: value.split('\n') }), true)}{field('Para quem é', details.audience ?? service.audience ?? '', audience => change({ audience }))}{photoPicker('Foto do serviço', details.image ?? service.image ?? '', image => change({ image }))}<label className="se-check"><input type="checkbox" checked={details.priceFrom ?? service.priceFrom ?? false} onChange={e => change({ priceFrom: e.target.checked })} />Preço a partir de</label><label className="se-check"><input type="checkbox" checked={details.featured ?? service.featured ?? false} onChange={e => change({ featured: e.target.checked })} />Destacar como mais pedido</label>{field('Por que o preço pode variar?', details.priceNote ?? service.priceNote ?? '', priceNote => change({ priceNote }))}</fieldset>;
        })}</div></details>
        <details name="site-editor-sections"><summary>Galeria e equipe</summary><div className="se-detail-content">{photoPicker('Adicionar foto à galeria', '', src => update({ gallery: [...(config.gallery || data.gallery), { src, alt: `Trabalho e espaço de ${data.name}` }] }))}{field('Fotos da galeria — uma URL por linha', (config.gallery || data.gallery).map(p => p.src).join('\n'), value => update({ gallery: value.split('\n').filter(Boolean).map(src => ({ src, alt: `Trabalho de ${data.name}` })) }), true, 'Combine fotos de trabalho e do ambiente. Use imagens com autorização.')}{(config.beforeAfter ?? []).map((pair, index) => <fieldset key={`ba-${index}`}><legend>Antes e depois {index + 1}</legend>{photoPicker('Foto de antes', pair.before, before => update({ beforeAfter: (config.beforeAfter ?? []).map((item, n) => n === index ? { ...item, before } : item) }))}{photoPicker('Foto de depois', pair.after, after => update({ beforeAfter: (config.beforeAfter ?? []).map((item, n) => n === index ? { ...item, after } : item) }))}{field('Legenda', pair.caption ?? '', caption => update({ beforeAfter: (config.beforeAfter ?? []).map((item, n) => n === index ? { ...item, caption } : item) }))}<button className="se-link-button" onClick={() => update({ beforeAfter: (config.beforeAfter ?? []).filter((_, n) => n !== index) })}>Remover par</button></fieldset>)}<button className="se-secondary" onClick={() => update({ beforeAfter: [...(config.beforeAfter ?? []), { before: data.gallery[0]?.src || '', after: data.gallery[1]?.src || '' }] })}>Adicionar antes e depois</button>{data.team.map(person => <fieldset key={person.id}><legend>{person.name}</legend>{field('Especialidade', config.teamDetails?.[person.id]?.bio ?? person.bio ?? '', bio => update({ teamDetails: { ...config.teamDetails, [person.id]: { ...config.teamDetails?.[person.id], bio } } }))}{photoPicker('Foto profissional', config.teamDetails?.[person.id]?.image ?? person.image ?? '', image => update({ teamDetails: { ...config.teamDetails, [person.id]: { ...config.teamDetails?.[person.id], image } } }))}</fieldset>)}</div></details>
        <details name="site-editor-sections"><summary>Perguntas frequentes</summary><div className="se-detail-content">{config.faq.map((faq, i) => <fieldset key={i}><legend>Pergunta {i + 1}</legend>{field('Pergunta', faq.question, question => update({ faq: config.faq.map((f, n) => n === i ? { ...f, question } : f) }))}{field('Resposta', faq.answer, answer => update({ faq: config.faq.map((f, n) => n === i ? { ...f, answer } : f) }), true)}<button className="se-link-button" onClick={() => update({ faq: config.faq.filter((_, n) => n !== i) })}>Remover pergunta</button></fieldset>)}<button className="se-secondary" onClick={() => update({ faq: [...config.faq, { question: '', answer: '' }] })}>Adicionar pergunta</button></div></details>
        <details name="site-editor-sections"><summary>Contato e Google</summary><div className="se-detail-content">{field('WhatsApp do estabelecimento', config.contact?.phone ?? data.phone ?? '', phone => update({ contact: { ...config.contact, phone } }))}{field('Instagram', config.contact?.instagram ?? data.instagram ?? '', instagram => update({ contact: { ...config.contact, instagram } }))}{field('Título para o Google', config.seoTitle, seoTitle => update({ seoTitle }), false, 'Se vazio, usamos o nome e o endereço da casa.')}{field('Descrição para o Google', config.seoDescription, seoDescription => update({ seoDescription }), true)}<p className="se-help">Confira se nome, endereço e telefone são iguais aos do seu Perfil da Empresa no Google.</p></div></details>
        <section className="se-sharing"><h2>Seu endereço</h2>{published && <button className="se-link-button" onClick={() => void changePublication(true)} disabled={saving}>Despublicar site</button>}<p>{link}</p><button className="se-secondary" onClick={() => { void navigator.clipboard.writeText(link).then(() => setSaved('Link copiado.')).catch(() => setSaved('Não foi possível copiar automaticamente. Selecione o endereço acima.')); }}><Copy size={15} />Copiar link</button><button className="se-secondary" onClick={() => void downloadQr()}>Baixar QR Code</button><p className="se-help">O site real só estará disponível depois de publicado. A demonstração pode ser aberta agora.</p></section>
      </div>
      <aside className="se-preview" data-expanded={expanded || undefined}>
        <div className="se-preview-toolbar">
          {expanded ? (
            <>
              <div><span className="se-preview-live" />Prévia em tela cheia</div>
              <button type="button" className="se-preview-back" onClick={() => setExpanded(false)}><ArrowLeft size={18} />Voltar ao editor</button>
            </>
          ) : (
            <>
              <div><span className="se-preview-live" />Prévia ao vivo</div>
              <div>
                <button type="button" aria-label="Prévia no celular" aria-pressed={mode === 'mobile'} onClick={() => setMode('mobile')}><Smartphone size={18} /></button>
                <button type="button" aria-label="Prévia no computador" aria-pressed={mode === 'desktop'} onClick={() => setMode('desktop')}><Monitor size={18} /></button>
              </div>
              <button type="button" className="se-preview-expand" onClick={() => setExpanded(true)}><Maximize2 size={16} />Ver em tela cheia</button>
            </>
          )}
        </div>
        <div className="se-preview-stage" data-mode={mode}>{previewFrame}</div>
        <p className="se-help">A mesma página que seus clientes vão ver. Celular e computador, enquanto você personaliza.</p>
      </aside>
    </div>
  </div>;
}
