export const PRODUCT_IMAGES_BUCKET = 'product_images';
export const MAX_PRODUCT_IMAGE_INPUT_BYTES = 10 * 1024 * 1024;
export const MAX_PRODUCT_IMAGE_UPLOAD_BYTES = 2 * 1024 * 1024;
export const PRODUCT_IMAGE_MAX_DIMENSION = 800;
export const MAX_PRODUCT_DESCRIPTION_LENGTH = 240;

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export interface PreparedProductImage {
  blob: Blob;
  contentType: string;
  extension: 'webp' | 'jpg' | 'png';
}

export function validateProductImageFile(file: File): string | null {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return 'Use uma imagem JPG, PNG ou WebP.';
  }
  if (file.size > MAX_PRODUCT_IMAGE_INPUT_BYTES) {
    return 'A imagem deve ter no máximo 10 MB.';
  }
  return null;
}

function extensionForMime(mime: string): 'webp' | 'jpg' | 'png' {
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/png') return 'png';
  return 'jpg';
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob), type, quality);
    } catch {
      resolve(null);
    }
  });
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('image_load_failed'));
    };
    img.src = objectUrl;
  });
}

/**
 * Redimensiona e faz recorte central quadrado (máx. 800×800) em WebP (fallback JPEG)
 * para manter a foto leve e bem enquadrada no celular.
 */
export async function prepareProductImage(file: File): Promise<PreparedProductImage> {
  const validationError = validateProductImageFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const fallback = (): PreparedProductImage => {
    if (file.size > MAX_PRODUCT_IMAGE_UPLOAD_BYTES) {
      throw new Error('A imagem ficou grande demais. Escolha uma foto menor que 2 MB.');
    }
    const contentType = ALLOWED_MIME_TYPES.has(file.type) ? file.type : 'image/jpeg';
    return {
      blob: file,
      contentType,
      extension: extensionForMime(contentType),
    };
  };

  if (typeof document === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    return fallback();
  }

  try {
    const img = await loadImageFromFile(file);
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    if (!width || !height) {
      return fallback();
    }

    const cropSide = Math.min(width, height);
    const sx = Math.floor((width - cropSide) / 2);
    const sy = Math.floor((height - cropSide) / 2);
    const targetSide = Math.min(cropSide, PRODUCT_IMAGE_MAX_DIMENSION);

    const canvas = document.createElement('canvas');
    canvas.width = targetSide;
    canvas.height = targetSide;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return fallback();
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, sx, sy, cropSide, cropSide, 0, 0, targetSide, targetSide);

    const webpBlob = await canvasToBlob(canvas, 'image/webp', 0.82);
    if (webpBlob && webpBlob.size > 0 && webpBlob.type === 'image/webp' && webpBlob.size <= MAX_PRODUCT_IMAGE_UPLOAD_BYTES) {
      return { blob: webpBlob, contentType: 'image/webp', extension: 'webp' };
    }

    const jpegBlob = await canvasToBlob(canvas, 'image/jpeg', 0.84);
    if (jpegBlob && jpegBlob.size > 0 && jpegBlob.size <= MAX_PRODUCT_IMAGE_UPLOAD_BYTES) {
      return { blob: jpegBlob, contentType: 'image/jpeg', extension: 'jpg' };
    }

    return fallback();
  } catch {
    return fallback();
  }
}

/**
 * Extrai o caminho relativo dentro do bucket `product_images` apenas se
 * pertencer à pasta da empresa informada.
 */
export function extractProductImagePath(imageUrl: string | null | undefined, companyId: string): string | null {
  if (!imageUrl || !companyId) return null;
  const marker = `/${PRODUCT_IMAGES_BUCKET}/`;
  const idx = imageUrl.indexOf(marker);
  if (idx === -1) return null;

  const rawPath = imageUrl.slice(idx + marker.length).split('?')[0] ?? '';
  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(rawPath);
  } catch {
    decodedPath = rawPath;
  }

  const expectedPrefix = `${companyId}/`;
  if (!decodedPath.startsWith(expectedPrefix) || decodedPath.includes('..')) {
    return null;
  }
  return decodedPath;
}
