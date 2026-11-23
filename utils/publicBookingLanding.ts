export function getPublicBookingSection(searchParams: URLSearchParams): 'services' | 'products' | 'club' {
  const section = searchParams.get('secao');
  if (section === 'produtos') return 'products';
  if (section === 'clube') return 'club';
  return 'services';
}

export function publicBookingProductsPath(slug: string): string {
  return `/book/${encodeURIComponent(slug)}?secao=produtos`;
}

export function shouldLandOnClientArea(params: {
  isLoggedInForBusiness: boolean;
  searchParams: URLSearchParams;
}): boolean {
  if (!params.isLoggedInForBusiness || getPublicBookingSection(params.searchParams) !== 'services') return false;
  const bookingIntent = ['agendar', 'edit', 'rebook'].some((key) => {
    const value = params.searchParams.get(key);
    return Boolean(value && value !== '0' && value !== 'false');
  });
  return !bookingIntent;
}
