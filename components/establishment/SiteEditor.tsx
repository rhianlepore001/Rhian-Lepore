import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Copy, ExternalLink, Monitor, Save, Smartphone } from 'lucide-react';
import { accessibleAccent, type SiteConfig, type SiteData } from '../../lib/establishment/model';
import { loadSiteDraft, saveSiteDraft, publishOwnerSite, unpublishOwnerSite } from '../../services/establishmentSite';
import '../../styles/site-editor.css';
import { PhotoPicker } from './PhotoPicker';

interface SiteEditorProps { data: SiteData; initial: SiteConfig; companyId: string; demo?: boolean; embedded?: boolean }
const labels: Record<string, string> = { services: 'Serviços', differences: 'Diferenciais', gallery: 'Galeria', team: 'Equipe', reviews: 'Avaliações', faq: 'Perguntas frequentes', location: 'Localização e horários' };

export function SiteEditor({ data, initial, companyId, demo = false, embedded = false }: SiteEditorProps) {
  const [config, setConfig] = useState(() => loadSiteDraft(companyId, initial));
  const [saved, setSaved] = useState('');
  const [mode, setMode] = useState<'mobile' | 'desktop'>('mobile');
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const frame = useRef<HTMLIFrameElement>(null);
  const previewPanel = useRef<HTMLElement>(null);
  const [frameReady, setFrameReady] = useState(false);
  const [storage, setStorage] = useState<'local' | 'remote'>('local');
  const [saving, setSaving] = useState(false);
  const [presenceEnabled, setPresenceEnabled] = useState(false);
  const [published, setPublished] = useState(false);
  const update = (patch: Partial<SiteConfig>) => { setConfig(current => ({ ...current, ...patch })); setSaved(''); };
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
  const completeness = [Boolean(data.cover || config.cover), data.services.some(s => s.description), data.gallery.length > 0, data.address.length > 0, data.hours.length > 0].filter(Boolean).length;
  const safeAccent = accessibleAccent(config.accent, config.style);

  return <div className="site-editor" data-embedded={embedded || undefined}>
    {demo && <div className="se-demo">Demonstração do editor · dados fictícios · nenhuma publicação real</div>}
    <header className="se-header"><div><span className="se-breadcrumb">Ajustes / Presença</span><h1>Meu site</h1><p>A sua casa, do seu jeito. Pronta para receber novos clientes.</p></div><div className="se-header-actions"><button className="se-save" onClick={() => void save()} disabled={saving}><Save size={16} />{saving ? 'Salvando…' : 'Salvar rascunho'}</button><button className="se-secondary" onClick={() => void changePublication()} disabled={saving || demo || storage !== 'remote' || !presenceEnabled} title={!presenceEnabled ? 'Aguardando aprovação e liberação do Presença' : undefined}>{published ? 'Publicar alterações' : 'Publicar'}</button><a href={link} target="_blank" rel="noreferrer" aria-label="Abrir site em nova aba"><ExternalLink size={18} /></a></div></header>
    <div className="se-notice"><span className="se-status-dot" /><div><strong>{published ? 'Site publicado' : 'Em preparação'}</strong><p>{storage === 'local' ? 'Seu rascunho fica neste navegador. A publicação está indisponível nesta prévia.' : presenceEnabled ? 'As alterações só entram no ar ao publicar.' : 'Rascunho privado. A publicação depende da liberação do plano Presença.'}</p></div></div>
    {saved && <p role="status" className="se-feedback">{saved}</p>}
    <div className="se-mobile-tabs"><button aria-pressed={tab === 'edit'} onClick={() => setTab('edit')}>Personalizar</button><button aria-pressed={tab === 'preview'} onClick={() => { setTab('preview'); requestAnimationFrame(() => previewPanel.current?.scrollIntoView({ block: 'start', behavior: 'instant' })); }}>Ver prévia ao vivo</button></div>
    <div className="se-workspace" data-tab={tab}>
      <div className="se-controls">
        <section className="se-checklist"><div><Check size={18} /><strong>{completeness} de 5 cuidados prontos</strong></div><p>{completeness === 5 ? 'Seu cadastro já dá vida ao site. Agora é só deixar com a sua cara.' : 'Complete capa, descrição dos serviços, galeria, endereço e horários para um site mais completo.'}</p></section>
        <details open><summary>Estilo e identidade</summary><div className="se-detail-content"><div className="se-styles"><button className="se-style-dark" aria-pressed={config.style === 'dark'} onClick={() => update({ style: 'dark' })}><span>Aa</span>Clássico escuro</button><button className="se-style-light" aria-pressed={config.style === 'light'} onClick={() => update({ style: 'light' })}><span>Aa</span>Editorial claro</button></div><label className="se-color"><span>Cor da sua marca</span><input type="color" value={config.accent} onChange={e => update({ accent: e.target.value })} /><span>{config.accent}</span></label>{safeAccent.background.toLowerCase() !== config.accent.toLowerCase() && <p className="se-help">Ajustamos a cor no site para preservar a leitura e o contraste.</p>}{photoPicker('Foto de capa', config.cover || data.cover || '', cover => update({ cover }))}</div></details>
        <details open><summary>Uma boa primeira impressão</summary><div className="se-detail-content">{field('Frase principal', config.headline, headline => update({ headline }), true, 'Diga o que você faz e em qual bairro. Ex.: Barbearia em Pinheiros.')}{field('Sobre a casa', config.about, about => update({ about }), true)}{field('Diferenciais — um por linha', config.differences.join('\n'), value => update({ differences: value.split('\n') }), true, 'Conte algo concreto: consulta antes do corte, atendimento reservado, cuidado com cachos.')}</div></details>
        <details><summary>Oferta de boas-vindas</summary><div className="se-detail-content"><label className="se-check"><input type="checkbox" checked={config.offer.enabled} onChange={e => update({ offer: { ...config.offer, enabled: e.target.checked } })} />Mostrar oferta no site</label>{field('Sua oferta', config.offer.title, title => update({ offer: { ...config.offer, title } }))}{field('Condições da oferta', config.offer.condition, condition => update({ offer: { ...config.offer, condition } }), true)}<label className="se-field"><span>Serviço da oferta</span><select value={config.offer.serviceId || ''} onChange={e => update({ offer: { ...config.offer, serviceId: e.target.value || undefined } })}><option value="">Cliente escolhe o serviço</option>{data.services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label className="se-field"><span>Válida até (opcional)</span><input type="date" value={config.offer.expires || ''} onChange={e => update({ offer: { ...config.offer, expires: e.target.value } })} /></label><p className="se-help">O agendamento mostra o preço do cadastro. A equipe confere e concede a oferta no atendimento.</p></div></details>
        <details><summary>Seções e ordem da página</summary><div className="se-detail-content"><p className="se-help">Seções sem conteúdo ficam ocultas automaticamente.</p>{config.sections.map((section, index) => <div className="se-section-row" key={section.id}><label><input type="checkbox" checked={section.enabled} onChange={e => update({ sections: config.sections.map(s => s.id === section.id ? { ...s, enabled: e.target.checked } : s) })} />{labels[section.id]}</label><button aria-label={`Mover ${labels[section.id]} para cima`} disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp size={16} /></button><button aria-label={`Mover ${labels[section.id]} para baixo`} disabled={index === config.sections.length - 1} onClick={() => move(index, 1)}><ArrowDown size={16} /></button></div>)}</div></details>
        <details><summary>Serviços que vendem</summary><div className="se-detail-content"><p className="se-help">Preços e durações vêm de Ajustes → Serviços. Aqui você apresenta cada cuidado.</p>{data.services.map(service => {
          const details = config.serviceDetails?.[service.id] || {};
          const change = (patch: typeof details) => update({ serviceDetails: { ...config.serviceDetails, [service.id]: { ...details, ...patch } } });
          return <fieldset key={service.id}><legend>{service.name}</legend>{field('Descrição', details.description ?? service.description ?? '', description => change({ description }), true)}{field('O que inclui — um por linha', (details.includes ?? service.includes).join('\n'), value => change({ includes: value.split('\n') }), true)}{field('Para quem é', details.audience ?? service.audience ?? '', audience => change({ audience }))}{photoPicker('Foto do serviço', details.image ?? service.image ?? '', image => change({ image }))}<label className="se-check"><input type="checkbox" checked={details.priceFrom ?? service.priceFrom ?? false} onChange={e => change({ priceFrom: e.target.checked })} />Preço a partir de</label>{field('Por que o preço pode variar?', details.priceNote ?? service.priceNote ?? '', priceNote => change({ priceNote }))}</fieldset>;
        })}</div></details>
        <details><summary>Galeria e equipe</summary><div className="se-detail-content">{photoPicker('Adicionar foto à galeria', '', src => update({ gallery: [...(config.gallery || data.gallery), { src, alt: `Trabalho e espaço de ${data.name}` }] }))}{field('Fotos da galeria — uma URL por linha', (config.gallery || data.gallery).map(p => p.src).join('\n'), value => update({ gallery: value.split('\n').filter(Boolean).map(src => ({ src, alt: `Trabalho de ${data.name}` })) }), true, 'Combine fotos de trabalho e do ambiente. Use imagens com autorização.')}{data.team.map(person => <fieldset key={person.id}><legend>{person.name}</legend>{field('Especialidade', config.teamDetails?.[person.id]?.bio ?? person.bio ?? '', bio => update({ teamDetails: { ...config.teamDetails, [person.id]: { ...config.teamDetails?.[person.id], bio } } }))}{photoPicker('Foto profissional', config.teamDetails?.[person.id]?.image ?? person.image ?? '', image => update({ teamDetails: { ...config.teamDetails, [person.id]: { ...config.teamDetails?.[person.id], image } } }))}</fieldset>)}</div></details>
        <details><summary>Perguntas frequentes</summary><div className="se-detail-content">{config.faq.map((faq, i) => <fieldset key={i}><legend>Pergunta {i + 1}</legend>{field('Pergunta', faq.question, question => update({ faq: config.faq.map((f, n) => n === i ? { ...f, question } : f) }))}{field('Resposta', faq.answer, answer => update({ faq: config.faq.map((f, n) => n === i ? { ...f, answer } : f) }), true)}<button className="se-link-button" onClick={() => update({ faq: config.faq.filter((_, n) => n !== i) })}>Remover pergunta</button></fieldset>)}<button className="se-secondary" onClick={() => update({ faq: [...config.faq, { question: '', answer: '' }] })}>Adicionar pergunta</button></div></details>
        <details><summary>Contato e Google</summary><div className="se-detail-content">{field('WhatsApp do estabelecimento', config.contact?.phone ?? data.phone ?? '', phone => update({ contact: { ...config.contact, phone } }))}{field('Instagram', config.contact?.instagram ?? data.instagram ?? '', instagram => update({ contact: { ...config.contact, instagram } }))}{field('Título para o Google', config.seoTitle, seoTitle => update({ seoTitle }), false, 'Se vazio, usamos o nome e o endereço da casa.')}{field('Descrição para o Google', config.seoDescription, seoDescription => update({ seoDescription }), true)}<p className="se-help">Confira se nome, endereço e telefone são iguais aos do seu Perfil da Empresa no Google.</p></div></details>
        <section className="se-sharing"><h2>Seu endereço</h2>{published && <button className="se-link-button" onClick={() => void changePublication(true)} disabled={saving}>Despublicar site</button>}<p>{link}</p><button className="se-secondary" onClick={() => { void navigator.clipboard.writeText(link).then(() => setSaved('Link copiado.')).catch(() => setSaved('Não foi possível copiar automaticamente. Selecione o endereço acima.')); }}><Copy size={15} />Copiar link</button><button className="se-secondary" onClick={() => void downloadQr()}>Baixar QR Code</button><p className="se-help">O site real só estará disponível depois de publicado. A demonstração pode ser aberta agora.</p></section>
      </div>
      <aside className="se-preview" ref={previewPanel}><div className="se-preview-toolbar"><span>Prévia ao vivo</span><div><button aria-label="Prévia no celular" aria-pressed={mode === 'mobile'} onClick={() => setMode('mobile')}><Smartphone size={18} /></button><button aria-label="Prévia no computador" aria-pressed={mode === 'desktop'} onClick={() => setMode('desktop')}><Monitor size={18} /></button></div></div><div className="se-preview-stage" data-mode={mode}><iframe ref={frame} title="Prévia ao vivo do meu site" src="/#/site-preview" onLoad={() => { setFrameReady(true); sendPreview(); }} /></div><p className="se-help">As alterações aparecem aqui. Salve para continuar depois.</p></aside>
    </div>
  </div>;
}
