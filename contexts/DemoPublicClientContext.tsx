import React, { useState } from 'react';
import { PublicClientContext, type PublicClientContextType } from './PublicClientContext';
import type { PublicClient } from '../types';
import { supabase } from '../lib/supabase';
import { upsertPublicClientSession } from '../services/publicBooking';

export const DemoPublicClientProvider = ({ children }: { children: React.ReactNode }) => {
  const [client, setClient] = useState<PublicClient | null>(null);
  const value: PublicClientContextType = {
    client, loading: false,
    login: async (phone, businessId) => {
      const { data } = await supabase.from('public_clients').select('*').eq('phone', phone).eq('business_id', businessId).maybeSingle();
      if (data) setClient(data);
      return data;
    },
    register: async data => {
      const next = await upsertPublicClientSession({ businessId: data.business_id, name: data.name, phone: data.phone, email: data.email, photoUrl: data.photo_url });
      setClient(next);
      return next;
    },
    establishSession: setClient,
    hydrateFromStorage: businessId => client?.business_id === businessId ? client : null,
    logout: () => setClient(null),
  };
  return <PublicClientContext.Provider value={value}>{children}</PublicClientContext.Provider>;
};
