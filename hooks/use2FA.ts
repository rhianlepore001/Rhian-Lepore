import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AuthMFAEnrollResponse, AuthMFAChallengeResponse } from '@supabase/supabase-js';

export function use2FA() {
    const [factors, setFactors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Carregar fatores ativos
    const loadFactors = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.auth.mfa.listFactors();
            if (error) throw error;

            // Filtrar apenas fatores verificados
            const verifiedFactors = data.totp.filter(f => f.status === 'verified');
            setFactors(verifiedFactors);
        } catch (error) {
            console.error('Erro ao carregar fatores 2FA:', error);
        } finally {
            setLoading(false);
        }
    };

    // 1. Iniciar Enrolment (Gerar QR Code)
    const enroll = async () => {
        const { data, error } = await supabase.auth.mfa.enroll({
            factorType: 'totp'
        });

        if (error) throw error;
        return data as unknown as AuthMFAEnrollResponse;
    };

    // 2. Verificar Código e Ativar
    const verifyAndEnable = async (factorId: string, code: string) => {
        // Primeiro cria o challenge
        const challenge = await supabase.auth.mfa.challenge({ factorId });
        if (challenge.error) throw challenge.error;

        // Depois verifica
        const verify = await supabase.auth.mfa.verify({
            factorId,
            challengeId: challenge.data.id,
            code
        });

        if (verify.error) throw verify.error;

        await loadFactors(); // Recarrega lista
        return verify.data;
    };

    // 3. Desativar 2FA (Unenroll)
    const unenroll = async (factorId: string) => {
        const { error } = await supabase.auth.mfa.unenroll({ factorId });
        if (error) throw error;
        await loadFactors();
    };

    useEffect(() => {
        loadFactors();
    }, []);

    return {
        factors,
        loading,
        isEnabled: factors.length > 0,
        enroll,
        verifyAndEnable,
        unenroll,
        refreshUser: loadFactors
    };
}
