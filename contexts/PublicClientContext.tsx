import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { upsertPublicClientSession } from '../services/publicBooking';
import { PublicClient } from '../types';

const LEGACY_STORAGE_KEY = 'rhian_public_client';

const storageKey = (businessId: string) => `rhian_public_client_${businessId}`;

const parseStoredClient = (raw: string): PublicClient | null => {
    try {
        return JSON.parse(raw) as PublicClient;
    } catch {
        return null;
    }
};

interface PublicClientContextType {
    client: PublicClient | null;
    loading: boolean;
    login: (phone: string, businessId: string) => Promise<PublicClient | null>;
    register: (data: Omit<PublicClient, 'id'>) => Promise<PublicClient | null>;
    establishSession: (client: PublicClient) => void;
    hydrateFromStorage: (businessId: string) => PublicClient | null;
    logout: (businessId?: string) => void;
}

const PublicClientContext = createContext<PublicClientContextType>({} as PublicClientContextType);

export const usePublicClient = () => useContext(PublicClientContext);

export const PublicClientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [client, setClient] = useState<PublicClient | null>(null);
    const [loading, setLoading] = useState(true);

    const persistClient = useCallback((next: PublicClient) => {
        setClient(next);
        localStorage.setItem(storageKey(next.business_id), JSON.stringify(next));
        localStorage.removeItem(LEGACY_STORAGE_KEY);
    }, []);

    const establishSession = useCallback((next: PublicClient) => {
        persistClient(next);
    }, [persistClient]);

    const hydrateFromStorage = useCallback((businessId: string): PublicClient | null => {
        const scoped = localStorage.getItem(storageKey(businessId));
        if (scoped) {
            const parsed = parseStoredClient(scoped);
            if (parsed && parsed.business_id === businessId) {
                setClient(parsed);
                return parsed;
            }
        }

        const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (legacy) {
            const parsed = parseStoredClient(legacy);
            if (parsed && parsed.business_id === businessId) {
                persistClient(parsed);
                return parsed;
            }
        }

        return null;
    }, [persistClient]);

    useEffect(() => {
        const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (legacy) {
            const parsed = parseStoredClient(legacy);
            if (parsed) {
                setClient(parsed);
            }
        }
        setLoading(false);
    }, []);

    const login = async (phone: string, businessId: string) => {
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_public_client_by_phone', {
                p_business_id: businessId,
                p_phone: phone,
            });

            if (error) throw error;

            const foundClient = data?.[0];
            if (foundClient) {
                const fullClient: PublicClient = {
                    id: foundClient.id,
                    name: foundClient.name,
                    phone: foundClient.phone,
                    email: foundClient.email ?? null,
                    photo_url: foundClient.photo_url ?? null,
                    business_id: foundClient.business_id ?? businessId,
                };
                persistClient(fullClient);
                return fullClient;
            }
            return null;
        } catch (error) {
            console.error('Error logging in public client:', error);
            return null;
        } finally {
            setLoading(false);
        }
    };

    const register = async (data: Omit<PublicClient, 'id'>) => {
        setLoading(true);
        try {
            const fullClient = await upsertPublicClientSession({
                businessId: data.business_id,
                name: data.name,
                phone: data.phone,
                photoUrl: data.photo_url,
                email: data.email,
            });
            persistClient(fullClient);
            return fullClient;
        } catch (error) {
            console.error('Error registering public client:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const logout = (businessId?: string) => {
        const bid = businessId ?? client?.business_id;
        setClient(null);
        if (bid) {
            localStorage.removeItem(storageKey(bid));
        }
        localStorage.removeItem(LEGACY_STORAGE_KEY);
    };

    return (
        <PublicClientContext.Provider value={{
            client,
            loading,
            login,
            register,
            establishSession,
            hydrateFromStorage,
            logout,
        }}
        >
            {children}
        </PublicClientContext.Provider>
    );
};
