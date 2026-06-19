import React, { useState } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { useBrutalTheme, type ThemeVariant } from '../hooks/useBrutalTheme';
import { usePublicClient } from '../contexts/PublicClientContext';
import { Phone, User, Mail, ArrowRight, LogOut, Check } from 'lucide-react';
import { PhoneInput } from './PhoneInput';

interface ClientAuthModalProps {
    businessId: string;
    onSuccess: () => void;
    /** @deprecated use isBeauty */
    accentColor?: string;
    isBeauty?: boolean;
}

export const ClientAuthModal: React.FC<ClientAuthModalProps> = ({
    businessId,
    onSuccess,
    accentColor: _accentColor,
    isBeauty = false,
}) => {
    const { client, login, register, logout, loading: _loading } = usePublicClient();
    const { colors, accent, font, status } = useBrutalTheme({ override: isBeauty ? 'beauty' as ThemeVariant : 'barber' as ThemeVariant });

    const [step, setStep] = useState<'phone' | 'register'>('phone');
    const [phone, setPhone] = useState('');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    if (client) {
        return (
            <Card variant="outlined" className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h3 className={`${colors.text} ${font.heading} text-lg`}>Seus Dados</h3>
                    <button
                        onClick={() => logout(businessId)}
                        className={`${colors.textMuted} hover:${status.danger} text-xs flex items-center gap-1`}
                    >
                        <LogOut className="w-3 h-3" /> Sair
                    </button>
                </div>

                <div className={`flex items-center gap-4 ${colors.surface} p-4 rounded-lg ${colors.border} border`}>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${accent.bgDim} ${accent.borderDim} border`}>
                        <User className={`w-6 h-6 ${accent.text}`} />
                    </div>
                    <div>
                        <p className={`${colors.text} font-bold`}>{client.name}</p>
                        <p className={`${colors.textSecondary} text-sm`}>{client.phone}</p>
                    </div>
                    <div className={`ml-auto w-8 h-8 rounded-full ${accent.bg} flex items-center justify-center`}>
                        <Check className="w-5 h-5 text-black" />
                    </div>
                </div>

                <p className={`${colors.textMuted} text-xs mt-3 text-center`}>
                    Você está logged in como {client.name}. O agendamento continuará com estes dados.
                </p>
            </Card>
        );
    }

    const handlePhoneChange = (value: string) => {
        setPhone(value);
        setError('');
    };

    const handleCheckPhone = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.length < 10) {
            setError('Digite um telefone válido');
            return;
        }

        setIsSubmitting(true);
        try {
            const foundClient = await login(phone, businessId);
            if (foundClient) {
                onSuccess();
            } else {
                setStep('register');
            }
        } catch (err) {
            setError('Erro ao verificar telefone. Tente novamente.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!name || !email) {
            setError('Preencha todos os campos');
            return;
        }

        setIsSubmitting(true);
        try {
            const newClient = await register({
                name,
                email,
                phone,
                photo_url: null,
                business_id: businessId
            });

            if (newClient) {
                onSuccess();
            } else {
                setError('Erro ao criar cadastro. Tente novamente.');
            }
        } catch (err) {
            setError('Erro ao cadastrar. Tente novamente.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card variant="outlined" className="mb-8 overflow-hidden relative">
            <div className={`absolute top-0 left-0 w-full h-1 ${accent.bg} opacity-50`}></div>

            <div className="p-2">
                <h3 className={`text-xl ${font.heading} ${colors.text} uppercase mb-6 text-center`}>
                    {step === 'phone' ? 'Identificação' : 'Criar Cadastro'}
                </h3>

                {step === 'phone' ? (
                    <form onSubmit={handleCheckPhone} className="space-y-4">
                        <div>
                            <label className={`${colors.textSecondary} text-sm ${font.mono} block mb-2`}>Seu Telefone / WhatsApp</label>
                            <PhoneInput
                                value={phone}
                                onChange={handlePhoneChange}
                                placeholder="Telefone"
                            />
                        </div>

                        {error && <p className={`${status.danger} text-sm text-center`}>{error}</p>}

                        <Button
                            type="submit"
                            variant="primary"
                            fullWidth
                            disabled={isSubmitting || !phone || phone.replace(/\D/g, '').length < 10}
                            loading={isSubmitting}
                            iconRight={!isSubmitting ? <ArrowRight className="w-4 h-4" /> : undefined}
                        >
                            {isSubmitting ? '' : 'Continuar'}
                        </Button>

                        <p className={`${colors.textMuted} text-xs text-center mt-4`}>
                            Usamos seu telefone para identificar seus agendamentos anteriores.
                        </p>
                    </form>
                ) : (
                    <form onSubmit={handleRegister} className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className={`${colors.surface} p-3 rounded-lg ${colors.border} border mb-4 flex items-center justify-between`}>
                            <span className={`${colors.text} ${font.mono}`}>{phone}</span>
                            <button
                                type="button"
                                onClick={() => setStep('phone')}
                                className={`text-xs ${colors.textSecondary} hover:${colors.text} underline`}
                            >
                                Alterar
                            </button>
                        </div>

                        <div>
                            <label className={`${colors.textSecondary} text-sm ${font.mono} block mb-2`}>Seu Nome Completo</label>
                            <div className="relative">
                                <User className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${colors.textMuted}`} />
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ex: João Silva"
                                    className={`w-full ${colors.inputBg} ${colors.inputBorder} border rounded-lg py-3 pl-10 pr-4 ${colors.text} focus:outline-none focus:border-[var(--color-input-focus)] transition-colors`}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className={`${colors.textSecondary} text-sm ${font.mono} block mb-2`}>Seu Email</label>
                            <div className="relative">
                                <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${colors.textMuted}`} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Ex: joao@email.com"
                                    className={`w-full ${colors.inputBg} ${colors.inputBorder} border rounded-lg py-3 pl-10 pr-4 ${colors.text} focus:outline-none focus:border-[var(--color-input-focus)] transition-colors`}
                                    required
                                />
                            </div>
                        </div>

                        {error && <p className={`${status.danger} text-sm text-center`}>{error}</p>}

                        <Button
                            type="submit"
                            variant="primary"
                            fullWidth
                            disabled={isSubmitting}
                            loading={isSubmitting}
                        >
                            {isSubmitting ? '' : 'Finalizar Cadastro'}
                        </Button>
                    </form>
                )}
            </div>
        </Card>
    );
};
