import { supabase } from './supabase';

function base64ToBlob(base64Data: string, mimeType = 'image/png'): Blob {
  const base64 = base64Data.includes(',')
    ? base64Data.split(',')[1] ?? base64Data
    : base64Data;
  const byteChars = atob(base64);
  const byteArrays: Uint8Array[] = [];
  const sliceSize = 8192;
  for (let offset = 0; offset < byteChars.length; offset += sliceSize) {
    const slice = byteChars.slice(offset, offset + sliceSize);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    byteArrays.push(new Uint8Array(byteNumbers));
  }
  return new Blob(byteArrays, { type: mimeType });
}

export async function uploadBase64(
  bucket: string,
  path: string,
  base64Data: string
): Promise<{ url: string; error: string | null }> {
  const blob = base64ToBlob(base64Data);
  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType: 'image/png',
    upsert: true,
  });

  if (error) {
    return { url: '', error: error.message };
  }

  return { url: getPublicUrl(bucket, path), error: null };
}

export function getPublicUrl(bucket: string, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteFile(
  bucket: string,
  path: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  return { error: error?.message ?? null };
}

// Bug Reporter — ver docs/features/bug-reporter.md