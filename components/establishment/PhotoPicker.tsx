import React, { useId, useState } from 'react';
import { ImagePlus } from 'lucide-react';

interface PhotoPickerProps { label: string; value: string; companyId: string; demo: boolean; choices: string[]; onChange: (value: string) => void }

export function PhotoPicker({ label, value, companyId, demo, choices, onChange }: PhotoPickerProps) {
  const id = useId();
  const [status, setStatus] = useState('');
  const [uploading, setUploading] = useState(false);
  const upload = async (file?: File) => {
    if (!file || demo) return;
    setUploading(true); setStatus('Preparando e enviando a foto…');
    try {
      const { uploadSitePhoto } = await import('../../services/establishmentPhotos');
      onChange(await uploadSitePhoto(companyId, file)); setStatus('Foto enviada. Salve o rascunho para continuar depois.');
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Não foi possível enviar a foto.'); }
    finally { setUploading(false); }
  };
  return <div className="se-photo-picker"><span>{label}</span><div className="se-photo-picker-row">{value && <img src={value} alt="Foto selecionada" width="70" height="60" loading="lazy" />}{demo ? <label className="se-field"><span>Trocar foto da demonstração</span><select value={choices.includes(value) ? value : ''} onChange={e => onChange(e.target.value)}><option value="">Escolha uma foto</option>{choices.map((src, index) => <option key={src} value={src}>Foto {index + 1}</option>)}</select></label> : <label className="se-upload"><ImagePlus size={16} />{uploading ? 'Enviando…' : 'Escolher do celular'}<input id={id} type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={event => { void upload(event.target.files?.[0]); event.target.value = ''; }} /></label>}</div><details className="se-photo-url"><summary>Usar o link de uma foto</summary><label className="se-field"><span>{label} (URL)</span><input type="url" value={value} onChange={e => onChange(e.target.value)} placeholder="https://…" /></label></details><p className="se-help">{demo ? 'Fotos ilustrativas. A demonstração não envia arquivos.' : 'JPG, PNG ou WebP, até 10 MB. A foto é otimizada antes de enviar.'}</p>{status && <p role="status" className="se-help">{status}</p>}</div>;
}
