import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Lock, ShieldCheck, AlertCircle, Eye, EyeOff, Save, Loader2 } from 'lucide-react';
import { Screw } from '../components/Screw';
import { validatePassword } from '../utils/passwordValidation';

export const UpdatePassword: React.FC = () => {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [initializing, setInitializing] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const initializeSession = async () => {
            try {
                // Step 1: Try to get existing session first
                const { data: { session } } = await supabase.auth.getSession();

                if (session) {
                    // Session already exists, we're good
                    setInitializing(false);
                    return;
                }

                // Step 2: If no session, try to extract tokens from URL
                // Tokens can be in format: #access_token=xxx OR #/update-password?access_token=xxx
                const fullHash = window.location.hash;
                let accessToken = null;
                let refreshToken = null;
                let type = null;

                // Try parsing as query string after the path
                if (fullHash.includes('?')) {
                    const queryPart = fullHash.substring(fullHash.indexOf('?') + 1);
                    const queryParams = new URLSearchParams(queryPart);
                    accessToken = queryParams.get('access_token');
                    refreshToken = queryParams.get('refresh_token');
                    type = queryParams.get('type');
                }

                // Fallback: try parsing as raw hash params (old format)
                if (!accessToken && fullHash.includes('access_token')) {
                    const hashParams = new URLSearchParams(fullHash.substring(1));
                    accessToken = hashParams.get('access_token');
                    refreshToken = hashParams.get('refresh_token');
                    type = hashParams.get('type');
                }

                if (accessToken && refreshToken && type === 'recovery') {
                    // Set the session manually using the tokens from URL
                    const { error: sessionError } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken,
                    });

                    if (sessionError) {
                        console.error('Error setting session:', sessionError);
                        setError('Link de recuperação inválido ou expirado. Por favor, solicite novamente.');
                    } else {
                        // Clean the URL hash after extracting tokens
                        window.history.replaceState(null, '', window.location.pathname + '#/update-password');
                    }
                } else {
                    // No tokens found and no existing session
                    setError('Sessão expirada ou link inválido. Por favor, solicite a recuperação novamente.');
                }
            } catch (err) {
                console.error('Error initializing session:', err);
                setError('Erro ao processar o link de recuperação.');
            } finally {
                setInitializing(false);
            }
        };

        initializeSession();
    }, []);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }

        const passwordCheck = validatePassword(password);
        if (!passwordCheck.isValid) {
            setError(`Sua senha precisa de: ${passwordCheck.errors.join(', ')}`);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) throw error;

            setSuccess(true);
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err: any) {
            console.error('Error updating password:', err);
            setError(err.message || 'Erro ao atualizar a senha.');
        } finally {
            setLoading(false);
        }
    };

    if (initializing) {
        return (
            <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-[var(--color-success)] animate-spin mx-auto mb-4" />
                    <p className="text-[var(--color-text-muted)] font-mono text-sm">Verificando link de recuperação...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Accents */}
            <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-green-500/5 to-transparent pointer-events-none"></div>

            <div className="w-full max-w-md z-10">
                <div className="bg-[var(--color-card)] border-4 border-black shadow-[var(--shadow-brutal)] p-8 relative">
                    <Screw className="top-[-10px] left-[-10px] text-[var(--color-text-muted)]" />
                    <Screw className="top-[-10px] right-[-10px] text-[var(--color-text-muted)]" />
                    <Screw className="bottom-[-10px] left-[-10px] text-[var(--color-text-muted)]" />
                    <Screw className="bottom-[-10px] right-[-10px] text-[var(--color-text-muted)]" />

                    {!success ? (
                        <>
                            <div className="text-center mb-8">
                                <div className="w-16 h-16 bg-[var(--color-success-bg)] border-2 border-[var(--color-success-border)] rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <Lock className="w-8 h-8 text-[var(--color-success)]" />
                                </div>
                                <h2 className="font-heading text-2xl text-[var(--color-text)] uppercase tracking-wider mb-2">Nova Senha</h2>
                                <p className="font-mono text-sm text-[var(--color-text-muted)]">
                                    Defina sua nova credencial de acesso.
                                </p>
                            </div>

                            {error && (
                                <div className="p-4 bg-[var(--color-danger-bg)] border-2 border-[var(--color-danger-border)] text-[var(--color-danger)] text-xs font-mono mb-6 flex items-start gap-3">
                                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <form onSubmit={handleUpdatePassword} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-mono font-bold text-[var(--color-text-muted)] uppercase tracking-widest block">
                                        Nova Senha
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full p-4 bg-[var(--color-bg)] border-2 border-[var(--color-border)] text-[var(--color-text)] font-mono text-sm focus:outline-none focus:border-[var(--color-success-border)] transition-all"
                                            placeholder="••••••••"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(prev => !prev)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-mono font-bold text-[var(--color-text-muted)] uppercase tracking-widest block">
                                        Confirmar Senha
                                    </label>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full p-4 bg-[var(--color-bg)] border-2 border-[var(--color-border)] text-[var(--color-text)] font-mono text-sm focus:outline-none focus:border-[var(--color-success-border)] transition-all"
                                        placeholder="••••••••"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || !password}
                                    className="w-full h-14 bg-white hover:bg-neutral-200 text-[var(--color-bg)] font-heading text-lg uppercase tracking-wider transition-all border-2 border-black flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {loading ? (
                                        <span className="animate-pulse">SALVANDO...</span>
                                    ) : (
                                        <>
                                            <Save className="w-5 h-5" />
                                            ATUALIZAR SENHA
                                        </>
                                    )}
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="text-center py-4">
                            <div className="w-20 h-20 bg-[var(--color-success-bg)] border-2 border-[var(--color-success-border)] rounded-full flex items-center justify-center mx-auto mb-6">
                                <ShieldCheck className="w-10 h-10 text-[var(--color-success)]" />
                            </div>
                            <h2 className="font-heading text-2xl text-[var(--color-text)] uppercase mb-4">Senha Atualizada!</h2>
                            <p className="font-mono text-sm text-[var(--color-text-muted)] mb-8 leading-relaxed">
                                Sua senha foi alterada com sucesso. Você será redirecionado para o login em instantes.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
