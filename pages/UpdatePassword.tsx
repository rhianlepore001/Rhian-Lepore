import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Lock, ShieldCheck, AlertCircle, Eye, EyeOff, Save } from 'lucide-react';
import { Screw } from '../components/Screw';

export const UpdatePassword: React.FC = () => {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (!session || error) {
                setError('Sessão expirada ou link inválido. Por favor, solicite a recuperação novamente.');
            }
        };
        // Give it a tiny moment for Supabase to sync the session from the URL
        const timer = setTimeout(() => {
            checkSession();
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }

        if (password.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres.');
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

    return (
        <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Accents */}
            <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-green-500/5 to-transparent pointer-events-none"></div>

            <div className="w-full max-w-md z-10">
                <div className="bg-neutral-900 border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] p-8 relative">
                    <Screw className="top-[-10px] left-[-10px] text-neutral-800" />
                    <Screw className="top-[-10px] right-[-10px] text-neutral-800" />
                    <Screw className="bottom-[-10px] left-[-10px] text-neutral-800" />
                    <Screw className="bottom-[-10px] right-[-10px] text-neutral-800" />

                    {!success ? (
                        <>
                            <div className="text-center mb-8">
                                <div className="w-16 h-16 bg-green-500/10 border-2 border-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <Lock className="w-8 h-8 text-green-500" />
                                </div>
                                <h2 className="font-heading text-2xl text-white uppercase tracking-wider mb-2">Nova Senha</h2>
                                <p className="font-mono text-sm text-neutral-500">
                                    Defina sua nova credencial de acesso.
                                </p>
                            </div>

                            {error && (
                                <div className="p-4 bg-red-500/10 border-2 border-red-500 text-red-500 text-xs font-mono mb-6 flex items-start gap-3">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <form onSubmit={handleUpdatePassword} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-mono font-bold text-neutral-500 uppercase tracking-widest block">
                                        Nova Senha
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full p-4 bg-black border-2 border-neutral-800 text-white font-mono text-sm focus:outline-none focus:border-green-500 transition-all"
                                            placeholder="••••••••"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(prev => !prev)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-white transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-mono font-bold text-neutral-500 uppercase tracking-widest block">
                                        Confirmar Senha
                                    </label>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full p-4 bg-black border-2 border-neutral-800 text-white font-mono text-sm focus:outline-none focus:border-green-500 transition-all"
                                        placeholder="••••••••"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || !password}
                                    className="w-full h-14 bg-white hover:bg-neutral-200 text-black font-heading text-lg uppercase tracking-wider transition-all border-2 border-black flex items-center justify-center gap-3 disabled:opacity-50"
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
                            <div className="w-20 h-20 bg-green-500/10 border-2 border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <ShieldCheck className="w-10 h-10 text-green-500" />
                            </div>
                            <h2 className="font-heading text-2xl text-white uppercase mb-4">Senha Atualizada!</h2>
                            <p className="font-mono text-sm text-neutral-400 mb-8 leading-relaxed">
                                Sua senha foi alterada com sucesso. Você será redirecionado para o login em instantes.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
