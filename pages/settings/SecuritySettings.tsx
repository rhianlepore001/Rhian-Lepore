import React, { useState } from 'react';
import { BrutalCard } from '../../components/BrutalCard';
import { BrutalButton } from '../../components/BrutalButton';
import { Shield, Lock, Smartphone, Trash2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { use2FA } from '../../hooks/use2FA';
import { TwoFactorSetup } from '../../components/security/TwoFactorSetup';
import { SettingsLayout } from '../../components/SettingsLayout';

export const SecuritySettings: React.FC = () => {
    const { userType } = useAuth();
    const { isEnabled, loading, unenroll, factors, refreshUser } = use2FA();
    const [showSetup, setShowSetup] = useState(false);

    const isBeauty = userType === 'beauty';
    const accentText = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';

    const handleSetupComplete = () => {
        setShowSetup(false);
        refreshUser();
        alert('Autenticação em dois fatores ativada com sucesso!');
    };

    const handleUnenroll = async (factorId: string) => {
        if (!confirm('Tem certeza que deseja desativar o 2FA? Sua conta ficará menos segura.')) return;

        try {
            await unenroll(factorId);
            alert('2FA desativado.');
        } catch (error) {
            console.error(error);
            alert('Erro ao desativar 2FA.');
        }
    };

    if (loading) return (
        <SettingsLayout>
            <div className="p-8 text-center text-neutral-400">Carregando configurações de segurança...</div>
        </SettingsLayout>
    );

    return (
        <SettingsLayout>
            <div className="max-w-4xl space-y-6 pb-20 md:pb-0">
                {/* Header dinâmico no SettingsLayout */}

                {/* 2FA Section */}
                <BrutalCard
                    title={
                        <div className="flex items-center gap-3">
                            <Smartphone className="w-5 h-5" />
                            <span>Autenticação em Dois Fatores</span>
                        </div>
                    }
                >
                    <div className="flex flex-col md:flex-row gap-8">
                        <div className="flex-1">
                            <p className="text-neutral-400 text-sm mb-6 leading-relaxed">
                                Adicione uma camada extra de segurança. Ao fazer login, você precisará fornecer um código
                                gerado pelo seu celular além da senha tradicional.
                            </p>

                            {!isEnabled ? (
                                <div className="flex items-center gap-2 text-orange-400 mb-6 bg-orange-500/5 border border-orange-500/10 p-3 rounded-xl w-fit">
                                    <Lock className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase tracking-wider">Proteção Desativada</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-green-400 mb-6 bg-green-500/5 border border-green-500/10 p-3 rounded-xl w-fit">
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase tracking-wider">Conta Protegida</span>
                                </div>
                            )}
                        </div>

                        <div className="flex-1">
                            {!showSetup ? (
                                <>
                                    {!isEnabled ? (
                                        <div className="h-full flex flex-col justify-center">
                                            <BrutalButton
                                                variant="primary"
                                                onClick={() => setShowSetup(true)}
                                                className="w-full"
                                            >
                                                Configurar 2FA
                                            </BrutalButton>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <h4 className="text-white/40 font-mono text-[10px] uppercase tracking-[0.2em] mb-4">Métodos Verificados</h4>
                                            {factors.map(factor => (
                                                <div key={factor.id} className="bg-white/5 border border-white/5 p-4 rounded-2xl flex justify-between items-center group hover:bg-white/10 transition-all">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center border border-white/5">
                                                            <Smartphone className="w-5 h-5 text-neutral-400" />
                                                        </div>
                                                        <div>
                                                            <p className="text-white text-sm font-bold">{factor.friendly_name || 'Autenticador'}</p>
                                                            <p className="text-neutral-500 text-[10px] uppercase">Algoritmo TOTP</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleUnenroll(factor.id)}
                                                        className="p-2 hover:bg-red-500/20 rounded-xl text-neutral-500 hover:text-red-400 transition-all active:animate-haptic-click"
                                                        title="Remover"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                            <BrutalButton
                                                variant="secondary"
                                                onClick={() => setShowSetup(true)}
                                                className="w-full text-xs"
                                            >
                                                + Novo Dispositivo
                                            </BrutalButton>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <TwoFactorSetup
                                    onComplete={handleSetupComplete}
                                    onCancel={() => setShowSetup(false)}
                                />
                            )}
                        </div>
                    </div>
                </BrutalCard>

                {/* Password Section */}
                <BrutalCard className="opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                    <div className="flex items-center gap-3 mb-4">
                        <Lock className="w-5 h-5 text-neutral-400" />
                        <h3 className="text-lg font-bold text-white">Alterar Senha</h3>
                    </div>
                    <p className="text-neutral-400 text-sm mb-6 max-w-md">
                        Mantenha sua senha forte e atualizada para evitar acessos não autorizados.
                    </p>
                    <BrutalButton variant="secondary" disabled className="text-xs">
                        Recuperação em Breve
                    </BrutalButton>
                </BrutalCard>
            </div>
        </SettingsLayout>
    );
};
