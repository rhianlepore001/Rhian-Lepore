import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Mail, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { Screw } from '../components/Screw';

export const ForgotPassword: React.FC = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // We'll use the barber theme as default for this system page, or allow it to be generic
    // Since we don't know the user's business type yet, we'll use a neutral but premium dark theme

    const handleResetRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin,
            });

            if (error) throw error;
            setDone(true);
        } catch (err: any) {
            console.error('Error requesting password reset:', err);
            setError(err.message || 'Erro ao enviar e-mail de recuperação.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Accents */}
            <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-blue-500/5 to-transparent pointer-events-none"></div>

            <div className="w-full max-w-md z-10">
                {/* Back Link */}
                <Link to="/login" className="flex items-center gap-2 text-xs font-mono text-neutral-500 hover:text-white transition-all uppercase mb-8 w-fit group">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Voltar para o Login
                </Link>

                <div className="bg-neutral-900 border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] p-8 relative">
                    <Screw className="top-[-10px] left-[-10px] text-neutral-800" />
                    <Screw className="top-[-10px] right-[-10px] text-neutral-800" />
                    <Screw className="bottom-[-10px] left-[-10px] text-neutral-800" />
                    <Screw className="bottom-[-10px] right-[-10px] text-neutral-800" />

                    {!done ? (
                        <>
                            <div className="text-center mb-8">
                                <div className="w-16 h-16 bg-blue-500/10 border-2 border-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <Mail className="w-8 h-8 text-blue-500" />
                                </div>
                                <h2 className="font-heading text-2xl text-white uppercase tracking-wider mb-2">Recuperar Senha</h2>
                                <p className="font-mono text-sm text-neutral-500">
                                    Enviaremos um link de recuperação para o seu e-mail.
                                </p>
                            </div>

                            {error && (
                                <div
                                    role="alert"
                                    className="p-4 bg-red-500/10 border-2 border-red-500 text-red-500 text-xs font-mono mb-6 flex items-start gap-3"
                                >
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <form onSubmit={handleResetRequest} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-mono font-bold text-neutral-500 uppercase tracking-widest block">
                                        E-mail da Conta
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="seu.email@exemplo.com"
                                        className="w-full p-4 bg-black border-2 border-neutral-800 text-white font-mono text-sm focus:outline-none focus:border-blue-500 transition-all"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || !email}
                                    aria-busy={loading}
                                    className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white font-heading text-lg uppercase tracking-wider transition-all border-2 border-black flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale"
                                >
                                    {loading ? (
                                        <span className="animate-pulse flex items-center gap-2">
                                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                                            ENVIANDO...
                                        </span>
                                    ) : (
                                        <>
                                            <Send className="w-5 h-5" />
                                            ENVIAR LINK
                                        </>
                                    )}
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="text-center py-4" id="recovery-success-message">
                            <div className="w-20 h-20 bg-green-500/10 border-2 border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 className="w-10 h-10 text-green-500" />
                            </div>
                            <h2 className="font-heading text-2xl text-white uppercase mb-4">E-mail Enviado!</h2>
                            <p className="font-mono text-sm text-neutral-400 mb-8 leading-relaxed">
                                Verifique sua caixa de entrada (e pasta de spam) para o link de recuperação.
                            </p>
                            <button
                                onClick={() => navigate('/login')}
                                className="w-full h-14 bg-white hover:bg-neutral-200 text-black font-heading text-lg uppercase tracking-wider transition-all border-2 border-black"
                            >
                                VOLTAR AO LOGIN
                            </button>
                        </div>
                    )}
                </div>

                <p className="text-center mt-8 text-xs font-mono text-neutral-600 uppercase tracking-widest">
                    Poder. Controle. Precisão.
                </p>
            </div>
        </div>
    );
};
