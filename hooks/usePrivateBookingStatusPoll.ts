import { useEffect } from 'react';
import { fetchPublicBookingById } from '@/services/publicBooking';
import { mergeFreshPublicBooking } from '@/utils/publicBookingFresh';

export function usePrivateBookingStatusPoll(
  booking: { id: string; status: string; management_token?: string } | null,
  businessId: string | null,
  linkToken: string,
  onBooking: (update: (previous: any) => any) => void,
) {
  const token = booking?.management_token || linkToken;
  const id = booking?.id;
  const pending = booking?.status === 'pending';
  useEffect(() => {
    if (!id || !pending || !businessId || !token) return;
    let alive = true;
    let fetching = false;
    const refresh = async () => {
      if (fetching) return;
      fetching = true;
      try {
        const fresh = await fetchPublicBookingById(id, businessId, token);
        if (fresh && alive) onBooking(previous => previous?.id === id ? mergeFreshPublicBooking(previous, fresh) : previous);
      } catch {
        return;
      } finally {
        fetching = false;
      }
    };
    const visible = () => { if (document.visibilityState === 'visible') void refresh(); };
    const online = () => { void refresh(); };
    const timer = window.setInterval(() => { void refresh(); }, 5000);
    window.addEventListener('online', online);
    document.addEventListener('visibilitychange', visible);
    return () => {
      alive = false;
      window.clearInterval(timer);
      window.removeEventListener('online', online);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [id, pending, businessId, token, onBooking]);
}
