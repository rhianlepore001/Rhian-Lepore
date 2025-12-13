import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PublicClient } from '../types';

interface PublicClientContextType {
    client: PublicClient | null;
    loading: boolean;
    login: (phone: string, businessId: string) => Promise<PublicClient | null>;
    register: (data: Omit<PublicClient, 'id'>) => Promise<PublicClient | null>;
    logout: () => void;
}

const PublicClientContext = createContext<PublicClientContextType>({} as PublicClientContextType);

export const usePublicClient = () => useContext(PublicClientContext);

export const PublicClientProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [client, setClient] = useState<PublicClient | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Hydrate from local storage on mount
        const storedClient = localStorage.getItem('rhian_public_client');
        if (storedClient) {
            setClient(JSON.parse(storedClient));
        }
        setLoading(false);
    }, []);

    const login = async (phone: string, businessId: string) => {
        setLoading(true);
        try {
            // Use the secure RPC function if available, or direct query if RLS allows
            const { data, error } = await supabase.rpc('get_public_client_by_phone', {
                p_business_id: businessId,
                p_phone: phone
            });

            if (error) throw error;

            if (data && data.length > 0) {
                const foundClient = data[0];
                // Enrich with business_id since RPC might not return it
                const fullClient = { ...foundClient, business_id: businessId };
                setClient(fullClient);
                localStorage.setItem('rhian_public_client', JSON.stringify(fullClient));
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
            // Check if already exists first to avoid duplicate errors if constraints fail
            const existing = await login(data.phone, data.business_id);
            if (existing) return existing;

            const { data: newClient, error } = await supabase
                .from('public_clients')
                .insert([data])
                .select()
                .single();

            if (error) throw error;

            if (newClient) {
                setClient(newClient);
                localStorage.setItem('rhian_public_client', JSON.stringify(newClient));
                return newClient;
            }
            return null;
        } catch (error) {
            console.error('Error registering public client:', error);
            return null;
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        setClient(null);
        localStorage.removeItem('rhian_public_client');
    };

    return (
        <PublicClientContext.Provider value={{ client, loading, login, register, logout }}>
            {children}
        </PublicClientContext.Provider>
    );
};
