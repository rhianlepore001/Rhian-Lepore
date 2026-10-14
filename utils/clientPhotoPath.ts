/** CRM / staff upload: pasta = auth user id. */
export function buildOwnerClientPhotoPath(
  uploaderId: string,
  fileExt: string,
  now: number = Date.now(),
): string {
  const ext = (fileExt || 'jpg').replace(/^\./, '');
  return `${uploaderId}/${now}.${ext}`;
}

/**
 * Foto no booking público: pasta = businessId (owner id) + prefixo public_.
 * Só passa na policy se o uploader autenticado for esse businessId.
 */
export function buildPublicClientPhotoPath(
  businessId: string,
  fileExt: string,
  now: number = Date.now(),
): string {
  const ext = (fileExt || 'jpg').replace(/^\./, '');
  return `${businessId}/public_${now}.${ext}`;
}
