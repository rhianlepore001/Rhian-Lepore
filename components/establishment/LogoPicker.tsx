import React, { useEffect, useId, useState } from 'react';
import { ImagePlus, RotateCcw, Trash2 } from 'lucide-react';
import type { LogoDisplayMode, SiteConfig } from '../../lib/establishment/model';

interface LogoPickerProps {
  value: string;
  hasCatalogLogo: boolean;
  logoRemoved: boolean;
  logoDisplay: LogoDisplayMode;
  companyId: string;
  demo: boolean;
  demoLogo?: string;
  onChange: (patch: Partial<Pick<SiteConfig, 'logo' | 'logoRemoved' | 'logoDisplay'>>) => void;
}

export function LogoPicker({
  value,
  hasCatalogLogo,
  logoRemoved,
  logoDisplay,
  companyId,
  demo,
  demoLogo,
  onChange,
}: LogoPickerProps) {
  const inputId = useId();
  const [status, setStatus] = useState('');
  const [uploading, setUploading] = useState(false);
  const [broken, setBroken] = useState(false);

  const effectiveLogo = logoRemoved ? '' : value.trim();

  useEffect(() => {
    setBroken(false);
  }, [effectiveLogo]);

  const handleUpload = async (file?: File) => {
    if (!file || demo) return;
    setUploading(true);
    setStatus('Preparando e enviando o logo…');
    try {
      const { uploadSiteLogo } = await import('../../services/establishmentPhotos');
      const uploaded = await uploadSiteLogo(companyId, file);
      onChange({ logo: uploaded, logoRemoved: false });
      setStatus('Logo enviado. Salve o rascunho para guardar.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Não foi possível enviar o logo.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="se-logo-picker">
      <span className="se-label-title">Logo do estabelecimento</span>
      <div className="se-logo-box">
        <div className="se-logo-checker" aria-label={effectiveLogo ? 'Prévia do logo' : 'Sem logo selecionado'}>
          {effectiveLogo && !broken ? (
            <img src={effectiveLogo} alt="Logo selecionado" onError={() => setBroken(true)} />
          ) : (
            <span className="se-logo-empty">Sem logo</span>
          )}
        </div>
        <div className="se-logo-actions">
          {demo ? (
            demoLogo ? (
              <div className="se-chip-row" role="group" aria-label="Opções de logo na demonstração">
                <button
                  type="button"
                  className="se-chip"
                  aria-pressed={Boolean(effectiveLogo)}
                  onClick={() => onChange({ logo: demoLogo, logoRemoved: false })}
                >
                  Logo ilustrativo da casa
                </button>
                <button
                  type="button"
                  className="se-chip"
                  aria-pressed={!effectiveLogo}
                  onClick={() => onChange({ logo: undefined, logoRemoved: true })}
                >
                  Sem logo
                </button>
              </div>
            ) : (
              <p className="se-help se-help-tight">Esta demonstração simula uma casa sem logo no topo.</p>
            )
          ) : (
            <label className="se-upload" htmlFor={inputId}>
              <ImagePlus size={16} aria-hidden="true" />
              {uploading ? 'Enviando…' : effectiveLogo ? 'Trocar logo' : 'Enviar logo'}
              <input
                id={inputId}
                type="file"
                accept="image/png,image/webp,image/jpeg"
                disabled={uploading}
                onChange={event => {
                  void handleUpload(event.target.files?.[0]);
                  event.target.value = '';
                }}
              />
            </label>
          )}
          {!demo && (
            <div className="se-logo-secondary-actions">
              {effectiveLogo && (
                <button
                  type="button"
                  className="se-link-button se-inline-icon-btn"
                  onClick={() => onChange({ logo: undefined, logoRemoved: true })}
                >
                  <Trash2 size={14} aria-hidden="true" />
                  Remover logo
                </button>
              )}
              {logoRemoved && hasCatalogLogo && (
                <button
                  type="button"
                  className="se-link-button se-inline-icon-btn"
                  onClick={() => onChange({ logo: undefined, logoRemoved: false })}
                >
                  <RotateCcw size={14} aria-hidden="true" />
                  Usar logo do cadastro
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {effectiveLogo && (
        <div className="se-logo-display">
          <span className="se-label-sub">Como mostrar no topo do site</span>
          <div className="se-segmented" role="group" aria-label="Exibição do logo no cabeçalho">
            <button
              type="button"
              aria-pressed={logoDisplay !== 'logo'}
              onClick={() => onChange({ logoDisplay: 'both' })}
            >
              Logo + nome
            </button>
            <button
              type="button"
              aria-pressed={logoDisplay === 'logo'}
              onClick={() => onChange({ logoDisplay: 'logo' })}
            >
              Só o logo
            </button>
          </div>
        </div>
      )}

      {!demo && (
        <details className="se-photo-url">
          <summary>Usar o endereço de um logo</summary>
          <label className="se-field">
            <span>Endereço da imagem do logo</span>
            <input
              type="url"
              value={effectiveLogo}
              onChange={event => onChange({ logo: event.target.value, logoRemoved: false })}
              placeholder="https://…"
            />
          </label>
        </details>
      )}

      <p className="se-help">
        {demo
          ? 'Na demonstração, alterne entre o logo ilustrativo e só o nome da casa.'
          : 'PNG com fundo transparente fica melhor sobre o topo. PNG, WebP ou JPG até 5 MB.'}
      </p>
      {status && (
        <p role="status" className="se-help">
          {status}
        </p>
      )}
    </div>
  );
}
