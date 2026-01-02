import React, { useState, useEffect } from 'react';
import { BrutalCard } from './BrutalCard';
import { BrutalButton } from './BrutalButton';
import { usePublicClient } from '../contexts/PublicClientContext';
import { Phone, User, Mail, Camera, ArrowRight, Loader2, LogOut, Check } from 'lucide-react';
import { PhoneInput } from './PhoneInput';

interface ClientAuthModalProps {
    businessId: string;
    onSuccess: () => void;
    accentColor?: string;
}

export const ClientAuthModal: React.FC<ClientAuthModalProps> = ({
    businessId,
    onSuccess,
    accentColor = 'accent-gold'
}) => {
    const { client, login, register, logout, loading } = usePublicClient();

    // Form States
    const [step, setStep] = useState<'phone' | 'register'>('phone');
    const [phone, setPhone] = useState('');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    // If client is already logged in, show welcome back screen
    if (client) {
        return (
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-heading text-lg">Seus Dados</h3>
                    <button
                        onClick={logout}
                        className="text-neutral-500 hover:text-red-400 text-xs flex items-center gap-1"
                    >
                        <LogOut className="w-3 h-3" /> Sair
                    </button>
                </div>

                <div className="flex items-center gap-4 bg-black/30 p-4 rounded-lg border border-neutral-800">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-${accentColor}/10 border border-${accentColor}/20`}>
                        <User className={`w-6 h-6 text-${accentColor}`} />
                    </div>
                    <div>
                        <p className="text-white font-bold">{client.name}</p>
                        <p className="text-neutral-400 text-sm">{client.phone}</p>
                    </div>
                    <div className={`ml-auto w-8 h-8 rounded-full bg-${accentColor} flex items-center justify-center`}>
                        <Check className="w-5 h-5 text-black" />
                    </div>
                </div>

                <p className="text-neutral-500 text-xs mt-3 text-center">
                    Você está logged in como {client.name}. O agendamento continuará com estes dados.
                </p>
            </div>
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
                // Client found and set in context
                onSuccess();
            } else {
                // Not found, go to register
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
                phone, // already set from previous step
                photo_url: null, // placeholder for now
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
        <BrutalCard className="mb-8 overflow-hidden relative">
            {/* Background Accent */}
            <div className={`absolute top-0 left-0 w-full h-1 bg-${accentColor} opacity-50`}></div>

            <div className="p-2">
                <h3 className="text-xl font-heading text-white uppercase mb-6 text-center">
                    {step === 'phone' ? 'Identificação' : 'Criar Cadastro'}
                </h3>

                {step === 'phone' ? (
                    <form onSubmit={handleCheckPhone} className="space-y-4">
                        <div>
                            <label className="text-neutral-400 text-sm font-mono block mb-2">Seu Telefone / WhatsApp</label>
                            <PhoneInput
                                value={phone}
                                onChange={handlePhoneChange}
                                placeholder="Telefone"
                            />
                        </div>

                        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

                        <BrutalButton
                            className={`w-full bg-${accentColor} hover:bg-${accentColor}Hover text-black`}
                            disabled={isSubmitting || !phone || phone.replace(/\D/g, '').length < 10}
                        >
                            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (
                                <span className="flex items-center justify-center gap-2">
                                    Continuar <ArrowRight className="w-4 h-4" />
                                </span>
                            )}
                        </BrutalButton>

                        <p className="text-neutral-500 text-xs text-center mt-4">
                            Usamos seu telefone para identificar seus agendamentos anteriores.
                        </p>
                    </form>
                ) : (
                    <form onSubmit={handleRegister} className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="bg-black/30 p-3 rounded-lg border border-neutral-800 mb-4 flex items-center justify-between">
                            <span className="text-white font-mono">{phone}</span>
                            <button
                                type="button"
                                onClick={() => setStep('phone')}
                                className="text-xs text-neutral-400 hover:text-white underline"
                            >
                                Alterar
                            </button>
                        </div>

                        <div>
                            <label className="text-neutral-400 text-sm font-mono block mb-2">Seu Nome Completo</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ex: João Silva"
                                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-white transition-colors"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-neutral-400 text-sm font-mono block mb-2">Seu Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Ex: joao@email.com"
                                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-white transition-colors"
                                    required
                                />
                            </div>
                        </div>

                        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

                        <BrutalButton
                            className={`w-full bg-${accentColor} hover:bg-${accentColor}Hover text-black`}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Finalizar Cadastro'}
                        </BrutalButton>
                    </form>
                )}
            </div>
        </BrutalCard>
    );
};
