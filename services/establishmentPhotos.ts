import { supabase } from '../lib/supabase';

function validCompanyFolder(companyId: string): boolean {
  const trimmed = companyId.trim();
  return Boolean(trimmed && !trimmed.includes('/') && !trimmed.includes('\\') && !trimmed.includes('..'));
}

export async function uploadSitePhoto(companyId: string, file: File): Promise<string> {
  if (!validCompanyFolder(companyId) || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Escolha uma foto JPG, PNG ou WebP.');
  if (file.size > 10 * 1024 * 1024) throw new Error('Escolha uma foto de até 10 MB.');
  const bitmap = await createImageBitmap(file);
  const ratio = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * ratio); canvas.height = Math.round(bitmap.height * ratio);
  const context = canvas.getContext('2d');
  if (!context) { bitmap.close(); throw new Error('Não foi possível preparar a foto neste navegador.'); }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
  const optimized = await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Não foi possível preparar a foto.')), 'image/webp', 0.78));
  const path = `${companyId.trim()}/presenca-${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage.from('covers').upload(path, optimized, { contentType: 'image/webp', upsert: false });
  if (error) throw new Error('Não foi possível enviar a foto. Verifique sua conexão e tente novamente.');
  const { data } = supabase.storage.from('covers').getPublicUrl(path);
  return data.publicUrl;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> {
  return new Promise(resolve => {
    if (quality === undefined) {
      canvas.toBlob(blob => resolve(blob), type);
    } else {
      canvas.toBlob(blob => resolve(blob), type, quality);
    }
  });
}

export async function uploadSiteLogo(companyId: string, file: File): Promise<string> {
  if (!validCompanyFolder(companyId) || !['image/png', 'image/webp', 'image/jpeg'].includes(file.type)) {
    throw new Error('Escolha um logo PNG, WebP ou JPG.');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Escolha um logo de até 5 MB.');
  }
  const bitmap = await createImageBitmap(file);
  const maxSide = Math.max(bitmap.width, bitmap.height);
  const ratio = maxSide > 0 ? Math.min(1, 512 / maxSide) : 1;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
  canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new Error('Não foi possível preparar o logo neste navegador.');
  }
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  let contentType = 'image/webp';
  let optimized = await canvasToBlob(canvas, 'image/webp', 0.9);
  if (!optimized) {
    contentType = 'image/png';
    optimized = await canvasToBlob(canvas, 'image/png');
  }
  if (!optimized) {
    throw new Error('Não foi possível preparar o logo.');
  }

  const extension = contentType === 'image/png' ? 'png' : 'webp';
  const path = `${companyId.trim()}/presenca-logo-${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from('logos').upload(path, optimized, { contentType, upsert: false });
  if (error) {
    throw new Error('Não foi possível enviar o logo. Verifique sua conexão e tente novamente.');
  }
  const { data } = supabase.storage.from('logos').getPublicUrl(path);
  return data.publicUrl;
}

export function extractSiteLogoPath(publicUrl: string, companyId: string): string | null {
  const folder = companyId.trim();
  if (!validCompanyFolder(folder)) return null;
  try {
    const parsed = new URL(publicUrl);
    if (parsed.protocol !== 'https:' || !/^[a-z0-9-]+\.supabase\.co$/i.test(parsed.hostname)) return null;
    const prefix = '/storage/v1/object/public/logos/';
    if (!parsed.pathname.startsWith(prefix)) return null;
    const path = decodeURIComponent(parsed.pathname.slice(prefix.length));
    if (!path.startsWith(`${folder}/presenca-logo-`) || path.includes('..') || path.includes('\\')) return null;
    return path;
  } catch {
    return null;
  }
}

export async function deleteSiteLogo(companyId: string, logoUrl?: string): Promise<void> {
  if (!logoUrl) return;
  const path = extractSiteLogoPath(logoUrl, companyId);
  if (!path) return;
  await supabase.storage.from('logos').remove([path]);
}
