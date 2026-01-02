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
            // Check if already exists first using RPC to avoid RLS issues
            const { data: existingClients, error: searchError } = await supabase.rpc('get_public_client_by_phone', {
                p_business_id: data.business_id,
                p_phone: data.phone
            });

            if (searchError) {
                console.warn('Error searching client via RPC, falling back to insert:', searchError);
            }

            const existing = existingClients?.[0];

            if (existing) {
                // Update existing client with new info
                const { data: updatedClient, error: updateError } = await supabase
                    .from('public_clients')
                    .update({
                        name: data.name,
                        photo_url: data.photo_url || existing.photo_url
                    })
                    .eq('id', existing.id)
                    .select()
                    .single();

                if (updateError) throw updateError;

                if (updatedClient) {
                    setClient(updatedClient);
                    localStorage.setItem('rhian_public_client', JSON.stringify(updatedClient));
                    return updatedClient;
                }
            }

            // Create new client
            // We use a try-catch specifically for the insert to handle race conditions where the client
            // might have been created between the check and the insert (Unique Violation)
            try {
                const { data: newClient, error } = await supabase
                    .from('public_clients')
                    .insert([data])
                    .select()
                    .single();

                if (error) {
                    // If error is unique constraint violation (code 23505), try updating instead
                    if (error.code === '23505') {
                        // Fallback to update by phone and business_id
                        const { data: fallbackClient, error: fallbackError } = await supabase
                            .from('public_clients')
                            .update({
                                name: data.name,
                                // If we are here, we missed the read, so we can't easily preserve old photo if current is null.
                                // However, this path is rare (race condition). We prioritize the new data.
                                // If data.photo_url is provided, use it.
                                ...(data.photo_url ? { photo_url: data.photo_url } : {})
                            })
                            .eq('business_id', data.business_id)
                            .eq('phone', data.phone)
                            .select()
                            .single();

                        if (fallbackError) throw fallbackError;

                        if (fallbackClient) {
                            setClient(fallbackClient);
                            localStorage.setItem('rhian_public_client', JSON.stringify(fallbackClient));
                            return fallbackClient;
                        }
                    }
                    throw error;
                }

                if (newClient) {
                    setClient(newClient);
                    localStorage.setItem('rhian_public_client', JSON.stringify(newClient));
                    return newClient;
                }
            } catch (insertError: any) {
                // Re-check if it was handled in the nested try/catch (it re-throws if not 23505)
                throw insertError;
            }

            return null;
        } catch (error) {
            console.error('Error registering public client:', error);
            throw error; // Re-throw to be caught by the caller
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
