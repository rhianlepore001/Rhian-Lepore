export function shouldLandOnClientArea(params: {
  isLoggedInForBusiness: boolean;
  searchParams: URLSearchParams;
}): boolean {
  if (!params.isLoggedInForBusiness) return false;
  const bookingIntent = ['agendar', 'edit', 'rebook'].some((key) => {
    const value = params.searchParams.get(key);
    return Boolean(value && value !== '0' && value !== 'false');
  });
  return !bookingIntent;
}
