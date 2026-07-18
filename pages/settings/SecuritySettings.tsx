import { Card, Button } from '../../components/ui';
import React, { useState } from 'react';


import { Shield, Lock, Smartphone, Trash2, CheckCircle2 } from 'lucide-react';
import { use2FA } from '../../hooks/use2FA';
import { TwoFactorSetup } from '../../components/security/TwoFactorSetup';
import { SettingsLayout } from '../../components/SettingsLayout';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';

export const SecuritySettings: React.FC = () => {
    const { isEnabled, loading, unenroll, factors, refreshUser } = use2FA();
    const [showSetup, setShowSetup] = useState(false);

    const { accent, colors } = useBrutalTheme();

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
            <div className={`p-8 text-center ${colors.textSecondary}`}>Carregando configurações de segurança...</div>
        </SettingsLayout>
    );

    return (
        <SettingsLayout>
            <div className="max-w-4xl space-y-6 pb-20 md:pb-0">
                {/* Header dinâmico no SettingsLayout */}

                {/* 2FA Section */}
                <Card
                    title={
                        <div className="flex items-center gap-3">
                            <Smartphone className="w-5 h-5" />
                            <span>Autenticação em Dois Fatores</span>
                        </div>
                    }
                >
                    <div className="flex flex-col md:flex-row gap-8">
                        <div className="flex-1">
                            <p className={`${colors.textSecondary} text-sm mb-6 leading-relaxed`}>
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
                                            <Button
                                                variant="primary"
                                                onClick={() => setShowSetup(true)}
                                                className="w-full"
                                            >
                                                Configurar 2FA
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <h4 className={`${colors.textMuted} font-mono text-xs uppercase tracking-[0.2em] mb-4`}>Métodos Verificados</h4>
                                            {factors.map(factor => (
                                                <div key={factor.id} className={`${colors.surface} border ${colors.divider} p-4 rounded-2xl flex justify-between items-center group hover:bg-[var(--color-card-hover)] transition-all`}>
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-10 h-10 rounded-xl ${colors.inputBg} flex items-center justify-center border ${colors.divider}`}>
                                                            <Smartphone className={`w-5 h-5 ${colors.textSecondary}`} />
                                                        </div>
                                                        <div>
                                                            <p className={`${colors.text} text-sm font-bold`}>{factor.friendly_name || 'Autenticador'}</p>
                                                            <p className={`${colors.textMuted} text-xs uppercase`}>Algoritmo TOTP</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleUnenroll(factor.id)}
                                                        className={`p-2 hover:bg-red-500/20 rounded-xl ${colors.textMuted} hover:text-red-400 transition-all active:animate-haptic-click`}
                                                        title="Remover"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                            <Button
                                                variant="secondary"
                                                onClick={() => setShowSetup(true)}
                                                className="w-full text-xs"
                                            >
                                                + Novo Dispositivo
                                            </Button>
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
                </Card>

                {/* Password Section */}
                <Card className="opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                    <div className="flex items-center gap-3 mb-4">
                        <Lock className={`w-5 h-5 ${colors.textSecondary}`} />
                        <h3 className={`text-lg font-bold ${colors.text}`}>Alterar Senha</h3>
                    </div>
                    <p className={`${colors.textSecondary} text-sm mb-6 max-w-md`}>
                        Mantenha sua senha forte e atualizada para evitar acessos não autorizados.
                    </p>
                    <Button variant="secondary" disabled className="text-xs">
                        Recuperação em Breve
                    </Button>
                </Card>
            </div>
        </SettingsLayout>
    );
};
