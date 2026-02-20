import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { BrutalButton } from '../BrutalButton';
import { BrutalCard } from '../BrutalCard';
import { QrCode, Copy, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { use2FA } from '../../hooks/use2FA';
import { useAuth } from '../../contexts/AuthContext';

interface TwoFactorSetupProps {
    onComplete: () => void;
    onCancel: () => void;
}

export const TwoFactorSetup: React.FC<TwoFactorSetupProps> = ({ onComplete, onCancel }) => {
    const { enroll, verifyAndEnable } = use2FA();
    const { userType } = useAuth();

    const [step, setStep] = useState<'intro' | 'scan' | 'verify'>('intro');
    const [factorId, setFactorId] = useState<string>('');
    const [qrCodeData, setQrCodeData] = useState<string>(''); // SVG/DataURL
    const [secret, setSecret] = useState<string>(''); // TOTP URI
    const [verificationCode, setVerificationCode] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isBeauty = userType === 'beauty';
    const accentText = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';
    const buttonVariant = isBeauty ? 'primary' : 'primary'; // Simplificando para evitar erros de tipo, já que não é usado

    // Passo 1: Gerar Secret e QR Code
    const handleStart = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await enroll();
            if (!data) throw new Error('Dados do fator 2FA não retornados');

            setFactorId(data.id);
            setSecret(data.totp.secret);

            // Gerar QR Code
            const qr = await QRCode.toDataURL(data.totp.uri);
            setQrCodeData(qr);

            setStep('scan');
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Erro ao iniciar configuração do 2FA');
        } finally {
            setLoading(false);
        }
    };

    // Passo 2: Verificar Código
    const handleVerify = async () => {
        if (verificationCode.length !== 6) return;

        setLoading(true);
        setError(null);
        try {
            await verifyAndEnable(factorId, verificationCode);
            onComplete();
        } catch (err: any) {
            console.error(err);
            setError('Código incorreto. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(secret);
        alert('Código copiado para a área de transferência!');
    };

    return (
        <div className="space-y-6">
            {step === 'intro' && (
                <div className="space-y-4">
                    <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-lg flex gap-3">
                        <QrCode className="w-12 h-12 text-blue-400 flex-shrink-0" />
                        <div>
                            <h3 className="text-white font-bold mb-1">Aumente sua segurança</h3>
                            <p className="text-neutral-400 text-sm">
                                A autenticação em dois fatores (2FA) adiciona uma camada extra de proteção.
                                Mesmo que alguém descubra sua senha, não conseguirá acessar sua conta sem o código do seu celular.
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3">
                        <BrutalButton variant="secondary" onClick={onCancel}>
                            Cancelar
                        </BrutalButton>
                        <BrutalButton variant="primary" onClick={handleStart} disabled={loading}>
                            {loading ? <Loader2 className="animate-spin" /> : 'Configurar 2FA Agora'}
                        </BrutalButton>
                    </div>
                </div>
            )}

            {step === 'scan' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right duration-300">
                    <div className="text-center space-y-2">
                        <h3 className="text-xl font-bold text-white">Escaneie o QR Code</h3>
                        <p className="text-neutral-400 text-sm">
                            Abra seu aplicativo autenticador (Google Authenticator, Authy, etc) e escaneie a imagem abaixo.
                        </p>
                    </div>

                    <div className="flex justify-center bg-white p-4 rounded-xl w-fit mx-auto">
                        {qrCodeData && <img src={qrCodeData} alt="QR Code 2FA" className="w-48 h-48" />}
                    </div>

                    <div className="text-center">
                        <p className="text-neutral-500 text-xs mb-2">Não consegue escanear?</p>
                        <button
                            onClick={copyToClipboard}
                            className={`text-xs ${accentText} hover:underline flex items-center gap-1 mx-auto`}
                        >
                            <Copy className="w-3 h-3" />
                            Copiar código de configuração
                        </button>
                    </div>

                    <BrutalButton
                        variant="primary"
                        onClick={() => setStep('verify')}
                        className="w-full"
                    >
                        Já escaneei, próximo passo
                    </BrutalButton>
                </div>
            )}

            {step === 'verify' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right duration-300">
                    <div className="text-center space-y-2">
                        <h3 className="text-xl font-bold text-white">Verifique e Ative</h3>
                        <p className="text-neutral-400 text-sm">
                            Digite o código de 6 dígitos que aparece no seu aplicativo autenticador para confirmar.
                        </p>
                    </div>

                    <div className="max-w-xs mx-auto">
                        <input
                            type="text"
                            maxLength={6}
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, ''))}
                            placeholder="000000"
                            className="w-full bg-black/50 border border-white/20 rounded-xl p-4 text-center text-3xl tracking-[1em] text-white focus:outline-none focus:border-white/50 font-mono"
                        />
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-lg flex items-center gap-2 text-red-400 text-sm">
                            <AlertTriangle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    <div className="flex gap-3">
                        <BrutalButton variant="secondary" onClick={() => setStep('scan')} className="flex-1">
                            Voltar
                        </BrutalButton>
                        <BrutalButton
                            variant="primary"
                            onClick={handleVerify}
                            disabled={loading || verificationCode.length !== 6}
                            className="flex-1"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : 'Ativar 2FA'}
                        </BrutalButton>
                    </div>
                </div>
            )}
        </div>
    );
};
