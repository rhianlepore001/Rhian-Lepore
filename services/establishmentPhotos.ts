import { supabase } from '../lib/supabase';

export async function uploadSitePhoto(companyId: string, file: File): Promise<string> {
  if (!companyId || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Escolha uma foto JPG, PNG ou WebP.');
  if (file.size > 10 * 1024 * 1024) throw new Error('Escolha uma foto de até 10 MB.');
  const bitmap = await createImageBitmap(file);
  const ratio = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * ratio); canvas.height = Math.round(bitmap.height * ratio);
  const context = canvas.getContext('2d');
  if (!context) { bitmap.close(); throw new Error('Não foi possível preparar a foto neste navegador.'); }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
  const optimized = await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Não foi possível preparar a foto.')), 'image/webp', 0.78));
  const path = `${companyId}/presenca-${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage.from('covers').upload(path, optimized, { contentType: 'image/webp', upsert: false });
  if (error) throw new Error('Não foi possível enviar a foto. Verifique sua conexão e tente novamente.');
  const { data } = supabase.storage.from('covers').getPublicUrl(path);
  return data.publicUrl;
}
