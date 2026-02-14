import React, { useState } from 'react';
import { BrutalCard } from '../../components/BrutalCard';
import { BrutalButton } from '../../components/BrutalButton';
import { Shield, Lock, Smartphone, Trash2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { use2FA } from '../../hooks/use2FA';
import { TwoFactorSetup } from '../../components/security/TwoFactorSetup';

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

    if (loading) return <div className="p-8 text-center text-neutral-400">Carregando configurações de segurança...</div>;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="border-b-4 border-white/10 pb-4">
                <h2 className="text-2xl md:text-4xl font-heading text-white uppercase flex items-center gap-3">
                    <Shield className={`w-8 h-8 ${accentText}`} />
                    Segurança
                </h2>
                <p className="text-text-secondary font-mono mt-2 text-sm">
                    Gerencie a proteção da sua conta e métodos de acesso
                </p>
            </div>

            {/* 2FA Section */}
            <BrutalCard>
                <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <Smartphone className="w-6 h-6 text-white" />
                            <h3 className="text-xl font-bold text-white">Autenticação em Dois Fatores (2FA)</h3>
                        </div>
                        <p className="text-neutral-400 text-sm mb-4">
                            Adicione uma camada extra de segurança. Ao fazer login, você precisará fornecer um código
                            gerado pelo seu celular além da senha.
                        </p>

                        {!isEnabled ? (
                            <div className="flex items-center gap-2 text-orange-500 mb-4 bg-orange-500/10 p-2 rounded w-fit">
                                <Lock className="w-4 h-4" />
                                <span className="text-sm font-bold">Não Ativado</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-green-500 mb-4 bg-green-500/10 p-2 rounded w-fit">
                                <CheckCircle2 className="w-4 h-4" />
                                <span className="text-sm font-bold">Ativado e Protegido</span>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 border-t md:border-t-0 md:border-l border-white/10 pt-6 md:pt-0 md:pl-6">
                        {!showSetup ? (
                            <>
                                {!isEnabled ? (
                                    <div className="h-full flex flex-col justify-center">
                                        <BrutalButton
                                            variant="primary"
                                            onClick={() => setShowSetup(true)}
                                            className="w-full"
                                        >
                                            Ativar 2FA
                                        </BrutalButton>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <h4 className="text-white font-bold text-sm uppercase">Métodos Ativos</h4>
                                        {factors.map(factor => (
                                            <div key={factor.id} className="bg-neutral-800 p-3 rounded flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <Smartphone className="w-4 h-4 text-neutral-400" />
                                                    <div>
                                                        <p className="text-white text-sm font-bold">{factor.friendly_name || 'Aplicativo Autenticador'}</p>
                                                        <p className="text-neutral-500 text-xs">TOTP (Google Auth/Authy)</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleUnenroll(factor.id)}
                                                    className="p-2 hover:bg-red-500/20 rounded text-neutral-400 hover:text-red-500 transition-colors"
                                                    title="Remover"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                        <BrutalButton
                                            variant="secondary"
                                            onClick={() => setShowSetup(true)}
                                            className="w-full text-sm"
                                        >
                                            Adicionar novo dispositivo
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

            {/* Password Section (Placeholder for Sprint 2 Part 3) */}
            <BrutalCard className="opacity-50">
                <div className="flex items-center gap-3 mb-4">
                    <Lock className="w-6 h-6 text-white" />
                    <h3 className="text-xl font-bold text-white">Alterar Senha</h3>
                </div>
                <p className="text-neutral-400 text-sm mb-4">
                    Para alterar sua senha, você receberá um email de confirmação.
                </p>
                <BrutalButton variant="secondary" disabled>
                    Alterar Senha (Em Breve)
                </BrutalButton>
            </BrutalCard>
        </div>
    );
};
