import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AuthMFAEnrollResponse, AuthMFAChallengeResponse } from '@supabase/supabase-js';

/**
 * Custom hook for managing two-factor authentication (2FA) with TOTP
 * Handles enrollment, verification, and management of 2FA factors
 * @returns {Object} 2FA management object
 * @returns {Array} factors - List of verified 2FA factors
 * @returns {boolean} loading - Whether 2FA data is loading
 * @returns {boolean} isEnabled - Whether 2FA is currently enabled
 * @returns {Function} enroll - Start 2FA enrollment (generates QR code)
 * @returns {Function} verifyAndEnable - Verify code and activate 2FA
 * @returns {Function} unenroll - Disable 2FA
 * @returns {Function} refreshUser - Reload 2FA factors from server
 * @example
 * const { isEnabled, enroll, verifyAndEnable, unenroll } = use2FA();
 */
export function use2FA() {
    const [factors, setFactors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    /**
     * Load and refresh list of verified 2FA factors
     * @async
     */
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

    /**
     * Start 2FA enrollment process
     * Returns enrollment data including QR code for authenticator app
     * @async
     * @returns {Promise<AuthMFAEnrollResponse>} Enrollment data with QR code
     * @throws {Error} If enrollment fails
     */
    const enroll = async () => {
        const { data, error } = await supabase.auth.mfa.enroll({
            factorType: 'totp'
        });

        if (error) throw error;
        return data;
    };

    /**
     * Verify TOTP code and enable 2FA
     * Creates a challenge, then verifies the code from authenticator app
     * @async
     * @param {string} factorId - The 2FA factor ID from enrollment
     * @param {string} code - 6-digit code from authenticator app
     * @returns {Promise<AuthMFAChallengeResponse>} Verification result
     * @throws {Error} If verification fails (wrong code, factor not found, etc)
     */
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

    /**
     * Disable 2FA by unenrolling a factor
     * Removes the 2FA factor and reloads the factor list
     * @async
     * @param {string} factorId - The 2FA factor ID to remove
     * @throws {Error} If unenrollment fails
     */
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
