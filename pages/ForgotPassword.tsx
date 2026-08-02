import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Mail, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { Screw } from '../components/Screw';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

export const ForgotPassword: React.FC = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleResetRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin,
            });

            if (resetError) throw resetError;
            setDone(true);
        } catch (err: unknown) {
            console.error('Error requesting password reset:', err);
            setError('Não conseguimos enviar o e-mail agora. Confira o endereço digitado e tente de novo.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-[var(--color-accent)]/5 to-transparent pointer-events-none" />

            <div className="w-full max-w-md z-10">
                <Link
                    to="/login"
                    className="flex items-center gap-2 text-xs font-mono text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-all uppercase mb-8 w-fit group min-h-[44px]"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Voltar para o Login
                </Link>

                <div className="bg-[var(--color-card)] border border-[var(--color-border)] shadow-[var(--elevation-3)] rounded-2xl p-8 relative">
                    <Screw className="top-[-10px] left-[-10px] text-[var(--color-text-muted)]" />
                    <Screw className="top-[-10px] right-[-10px] text-[var(--color-text-muted)]" />
                    <Screw className="bottom-[-10px] left-[-10px] text-[var(--color-text-muted)]" />
                    <Screw className="bottom-[-10px] right-[-10px] text-[var(--color-text-muted)]" />

                    {!done ? (
                        <>
                            <div className="text-center mb-8">
                                <div className="w-16 h-16 bg-[var(--color-info-bg)] border-2 border-[var(--color-info-border)] rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <Mail className="w-8 h-8 text-[var(--color-info)]" />
                                </div>
                                <h2 className="font-heading text-2xl text-[var(--color-text)] uppercase tracking-wider mb-2">
                                    Recuperar Senha
                                </h2>
                                <p className="font-mono text-sm text-[var(--color-text-muted)]">
                                    Enviaremos um link de recuperação para o seu e-mail.
                                </p>
                            </div>

                            {error && (
                                <div
                                    role="alert"
                                    className="p-4 bg-[var(--color-danger-bg)] border border-[var(--color-danger-border)] text-[var(--color-danger)] text-xs font-mono mb-6 flex items-start gap-3 rounded-xl"
                                >
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <form onSubmit={handleResetRequest} className="space-y-6">
                                <Input
                                    id="forgot-email"
                                    type="email"
                                    label="E-mail da Conta"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="seu.email@exemplo.com"
                                    autoComplete="email"
                                />

                                <Button
                                    type="submit"
                                    variant="primary"
                                    disabled={loading || !email}
                                    loading={loading}
                                    className="w-full h-14"
                                    icon={!loading ? <Send className="w-5 h-5" /> : undefined}
                                >
                                    {loading ? 'Enviando...' : 'Enviar link'}
                                </Button>
                            </form>
                        </>
                    ) : (
                        <div className="text-center py-4" id="recovery-success-message">
                            <div className="w-20 h-20 bg-[var(--color-success-bg)] border-2 border-[var(--color-success-border)] rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 className="w-10 h-10 text-[var(--color-success)]" />
                            </div>
                            <h2 className="font-heading text-2xl text-[var(--color-text)] uppercase mb-4">
                                E-mail Enviado!
                            </h2>
                            <p className="font-mono text-sm text-[var(--color-text-muted)] mb-8 leading-relaxed">
                                Verifique sua caixa de entrada (e pasta de spam) para o link de recuperação.
                            </p>
                            <Button
                                type="button"
                                variant="primary"
                                className="w-full h-14"
                                onClick={() => navigate('/login')}
                            >
                                Voltar ao login
                            </Button>
                        </div>
                    )}
                </div>

                <p className="text-center mt-8 text-xs font-mono text-[var(--color-text-muted)] uppercase tracking-widest">
                    Poder. Controle. Precisão.
                </p>
            </div>
        </div>
    );
};
