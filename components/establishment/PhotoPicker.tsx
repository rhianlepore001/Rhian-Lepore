import React, { useEffect, useId, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';

interface PhotoPickerProps {
  label: string;
  value: string;
  companyId: string;
  demo: boolean;
  choices: string[];
  onChange: (value: string) => void;
  onRemove?: () => void;
  helperText?: string;
  uploadLabel?: string;
}

export function PhotoPicker({
  label,
  value,
  companyId,
  demo,
  choices,
  onChange,
  onRemove,
  helperText,
  uploadLabel = 'Escolher do celular',
}: PhotoPickerProps) {
  const id = useId();
  const [status, setStatus] = useState('');
  const [uploading, setUploading] = useState(false);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [value]);

  const upload = async (file?: File) => {
    if (!file || demo) return;
    setUploading(true);
    setStatus('Preparando e enviando a foto…');
    try {
      const { uploadSitePhoto } = await import('../../services/establishmentPhotos');
      onChange(await uploadSitePhoto(companyId, file));
      setStatus('Foto enviada. Salve o rascunho para guardar.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Não foi possível enviar a foto.');
    } finally {
      setUploading(false);
    }
  };

  const defaultHelp = demo
    ? 'Fotos ilustrativas. A demonstração não envia arquivos.'
    : 'JPG, PNG ou WebP, até 10 MB. A foto é otimizada antes de enviar.';
  const helpCopy = helperText === undefined ? defaultHelp : helperText;

  return (
    <div className="se-photo-picker">
      <span>{label}</span>
      <div className="se-photo-picker-row">
        {value && !broken && (
          <img
            src={value}
            alt="Foto selecionada"
            width="70"
            height="60"
            loading="lazy"
            onError={() => setBroken(true)}
          />
        )}
        {demo ? (
          <label className="se-field">
            <span>Trocar foto da demonstração</span>
            <select value={choices.includes(value) ? value : ''} onChange={e => onChange(e.target.value)}>
              <option value="">Escolha uma foto</option>
              {choices.map((src, index) => (
                <option key={src} value={src}>
                  Foto {index + 1}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="se-upload" htmlFor={id}>
            <ImagePlus size={16} aria-hidden="true" />
            {uploading ? 'Enviando…' : uploadLabel}
            <input
              id={id}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={uploading}
              onChange={event => {
                void upload(event.target.files?.[0]);
                event.target.value = '';
              }}
            />
          </label>
        )}
        {value && onRemove && (
          <button type="button" className="se-secondary se-picker-remove" onClick={onRemove}>
            <Trash2 size={14} aria-hidden="true" />
            Remover foto
          </button>
        )}
      </div>
      {helpCopy && <p className="se-help">{helpCopy}</p>}
      {status && (
        <p role="status" className="se-help">
          {status}
        </p>
      )}
    </div>
  );
}
