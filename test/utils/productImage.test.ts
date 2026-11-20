import { describe, expect, it } from 'vitest';
import {
  extractProductImagePath,
  MAX_PRODUCT_IMAGE_INPUT_BYTES,
  MAX_PRODUCT_IMAGE_UPLOAD_BYTES,
  prepareProductImage,
  validateProductImageFile,
} from '@/utils/productImage';

const COMPANY_ID = '22222222-2222-4222-8222-222222222222';
const OTHER_COMPANY_ID = '99999999-9999-4999-8999-999999999999';

function makeFile(name: string, type: string, sizeBytes: number): File {
  const bytes = new Uint8Array(sizeBytes);
  return new File([bytes], name, { type });
}

describe('productImage utils', () => {
  it('aceita JPG, PNG e WebP dentro do limite de entrada', () => {
    expect(validateProductImageFile(makeFile('a.jpg', 'image/jpeg', 1024))).toBeNull();
    expect(validateProductImageFile(makeFile('b.png', 'image/png', 1024))).toBeNull();
    expect(validateProductImageFile(makeFile('c.webp', 'image/webp', 1024))).toBeNull();
  });

  it('rejeita tipos não suportados e arquivos maiores que 10 MB', () => {
    expect(validateProductImageFile(makeFile('doc.pdf', 'application/pdf', 1024))).toMatch(/JPG, PNG ou WebP/);
    expect(validateProductImageFile(makeFile('anim.gif', 'image/gif', 1024))).toMatch(/JPG, PNG ou WebP/);
    expect(validateProductImageFile(makeFile('big.jpg', 'image/jpeg', MAX_PRODUCT_IMAGE_INPUT_BYTES + 1))).toMatch(/10 MB/);
  });

  it('faz fallback seguro para arquivo pequeno quando o canvas não decodifica', async () => {
    const file = makeFile('pomada.webp', 'image/webp', 2048);
    const prepared = await prepareProductImage(file);
    expect(prepared.contentType).toBe('image/webp');
    expect(prepared.extension).toBe('webp');
    expect(prepared.blob.size).toBe(2048);
  });

  it('rejeita arquivo acima de 2 MB quando não há compressão disponível', async () => {
    const file = makeFile('grande.jpg', 'image/jpeg', MAX_PRODUCT_IMAGE_UPLOAD_BYTES + 1024);
    await expect(prepareProductImage(file)).rejects.toThrow(/2 MB/);
  });

  it('extrai path apenas do bucket product_images dentro da pasta da própria empresa', () => {
    const ownUrl = `https://example.supabase.co/storage/v1/object/public/product_images/${COMPANY_ID}/1700000-abc.webp?t=123`;
    expect(extractProductImagePath(ownUrl, COMPANY_ID)).toBe(`${COMPANY_ID}/1700000-abc.webp`);

    const otherTenantUrl = `https://example.supabase.co/storage/v1/object/public/product_images/${OTHER_COMPANY_ID}/1700000-abc.webp`;
    expect(extractProductImagePath(otherTenantUrl, COMPANY_ID)).toBeNull();

    const otherBucketUrl = `https://example.supabase.co/storage/v1/object/public/service_images/${COMPANY_ID}/1700000-abc.webp`;
    expect(extractProductImagePath(otherBucketUrl, COMPANY_ID)).toBeNull();

    const traversalUrl = `https://example.supabase.co/storage/v1/object/public/product_images/${COMPANY_ID}/../${OTHER_COMPANY_ID}/x.webp`;
    expect(extractProductImagePath(traversalUrl, COMPANY_ID)).toBeNull();

    expect(extractProductImagePath('/demo/barbearia/produto-pomada.svg', COMPANY_ID)).toBeNull();
    expect(extractProductImagePath(null, COMPANY_ID)).toBeNull();
  });
});
