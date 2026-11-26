import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteSiteLogo, extractSiteLogoPath, uploadSiteLogo } from './establishmentPhotos';

const { storageFrom, bucket } = vi.hoisted(() => {
  const bucket = {
    upload: vi.fn(),
    getPublicUrl: vi.fn(),
    remove: vi.fn(),
  };
  const storageFrom = vi.fn(() => bucket);
  return { storageFrom, bucket };
});

vi.mock('../lib/supabase', () => ({
  supabase: {
    storage: {
      from: storageFrom,
    },
  },
}));

describe('uploadSiteLogo', () => {
  const originalCreateImageBitmap = globalThis.createImageBitmap;
  const originalCreateElement = document.createElement.bind(document);
  const originalRandomUUID = globalThis.crypto.randomUUID;

  let drawImageMock: ReturnType<typeof vi.fn>;
  let clearRectMock: ReturnType<typeof vi.fn>;
  let toBlobMock: ReturnType<typeof vi.fn>;
  let createdCanvas: { width: number; height: number };
  let closeBitmapMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    storageFrom.mockClear();
    bucket.upload.mockReset();
    bucket.getPublicUrl.mockReset();

    drawImageMock = vi.fn();
    clearRectMock = vi.fn();
    closeBitmapMock = vi.fn();
    toBlobMock = vi.fn((callback: BlobCallback, type?: string) => {
      callback(new Blob(['img-bytes'], { type: type || 'image/webp' }));
    });

    globalThis.createImageBitmap = vi.fn(async () => ({
      width: 1024,
      height: 512,
      close: closeBitmapMock,
    })) as unknown as typeof createImageBitmap;

    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('11111111-2222-3333-4444-555555555555');

    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'canvas') {
        createdCanvas = {
          width: 0,
          height: 0,
        };
        return Object.assign(createdCanvas, {
          getContext: vi.fn(() => ({
            clearRect: clearRectMock,
            drawImage: drawImageMock,
          })),
          toBlob: toBlobMock,
        }) as unknown as HTMLElement;
      }
      return originalCreateElement(tagName);
    });

    bucket.upload.mockResolvedValue({ error: null });
    bucket.remove.mockResolvedValue({ error: null });
    bucket.getPublicUrl.mockReturnValue({
      data: {
        publicUrl:
          'https://lcqwrngscsziysyfhpfj.supabase.co/storage/v1/object/public/logos/comp-1/presenca-logo-11111111-2222-3333-4444-555555555555.webp',
      },
    });
  });

  afterEach(() => {
    globalThis.createImageBitmap = originalCreateImageBitmap;
    vi.restoreAllMocks();
    if (originalRandomUUID) {
      globalThis.crypto.randomUUID = originalRandomUUID;
    }
  });

  it('rejects empty companyId and unsupported mime types', async () => {
    const png = new File(['abc'], 'logo.png', { type: 'image/png' });
    await expect(uploadSiteLogo('', png)).rejects.toThrow('Escolha um logo PNG, WebP ou JPG.');

    const svg = new File(['<svg></svg>'], 'logo.svg', { type: 'image/svg+xml' });
    await expect(uploadSiteLogo('comp-1', svg)).rejects.toThrow('Escolha um logo PNG, WebP ou JPG.');
    expect(storageFrom).not.toHaveBeenCalled();
  });

  it('rejects files larger than 5 MB', async () => {
    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'logo.png', { type: 'image/png' });
    await expect(uploadSiteLogo('comp-1', big)).rejects.toThrow('Escolha um logo de até 5 MB.');
    expect(storageFrom).not.toHaveBeenCalled();
  });

  it('resizes proportionally to max 512px without filling background, encodes webp 0.9, and uploads to logos bucket scoped by companyId', async () => {
    const file = new File(['png-content'], 'logo.png', { type: 'image/png' });
    const url = await uploadSiteLogo('comp-42', file);

    expect(createdCanvas.width).toBe(512);
    expect(createdCanvas.height).toBe(256);
    expect(drawImageMock).toHaveBeenCalledTimes(1);
    expect(closeBitmapMock).toHaveBeenCalledTimes(1);
    expect(toBlobMock).toHaveBeenCalledWith(expect.any(Function), 'image/webp', 0.9);

    expect(storageFrom).toHaveBeenCalledWith('logos');
    expect(bucket.upload).toHaveBeenCalledWith(
      'comp-42/presenca-logo-11111111-2222-3333-4444-555555555555.webp',
      expect.any(Blob),
      { contentType: 'image/webp', upsert: false },
    );
    expect(bucket.getPublicUrl).toHaveBeenCalledWith('comp-42/presenca-logo-11111111-2222-3333-4444-555555555555.webp');
    expect(url).toBe(
      'https://lcqwrngscsziysyfhpfj.supabase.co/storage/v1/object/public/logos/comp-1/presenca-logo-11111111-2222-3333-4444-555555555555.webp',
    );
  });

  it('falls back to image/png when webp toBlob returns null', async () => {
    toBlobMock
      .mockImplementationOnce((callback: BlobCallback) => callback(null))
      .mockImplementationOnce((callback: BlobCallback, type?: string) => callback(new Blob(['png'], { type: type || 'image/png' })));

    const file = new File(['png-content'], 'logo.png', { type: 'image/png' });
    await uploadSiteLogo('comp-42', file);

    expect(toBlobMock).toHaveBeenNthCalledWith(1, expect.any(Function), 'image/webp', 0.9);
    expect(toBlobMock).toHaveBeenNthCalledWith(2, expect.any(Function), 'image/png');
    expect(bucket.upload).toHaveBeenCalledWith(
      'comp-42/presenca-logo-11111111-2222-3333-4444-555555555555.png',
      expect.any(Blob),
      { contentType: 'image/png', upsert: false },
    );
  });

  it('propagates a friendly error when storage upload fails', async () => {
    bucket.upload.mockResolvedValue({ error: { message: 'Permission denied' } });
    const file = new File(['webp-content'], 'logo.webp', { type: 'image/webp' });
    await expect(uploadSiteLogo('comp-1', file)).rejects.toThrow('Não foi possível enviar o logo.');
  });

  it('extracts and deletes only scoped presenca-logo paths from Supabase logos bucket', async () => {
    const valid =
      'https://lcqwrngscsziysyfhpfj.supabase.co/storage/v1/object/public/logos/comp-1/presenca-logo-abc.webp';
    expect(extractSiteLogoPath(valid, 'comp-1')).toBe('comp-1/presenca-logo-abc.webp');
    expect(extractSiteLogoPath(valid, 'other-comp')).toBeNull();
    expect(extractSiteLogoPath('/presenca/demo-logo-barber.svg', 'comp-1')).toBeNull();

    await deleteSiteLogo('comp-1', valid);
    expect(storageFrom).toHaveBeenCalledWith('logos');
    expect(bucket.remove).toHaveBeenCalledWith(['comp-1/presenca-logo-abc.webp']);

    bucket.remove.mockClear();
    await deleteSiteLogo('comp-1', 'https://evil.example.com/logos/comp-1/presenca-logo-abc.webp');
    expect(bucket.remove).not.toHaveBeenCalled();
  });
});
