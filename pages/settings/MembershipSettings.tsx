import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, Check } from 'lucide-react';
import { SettingsLayout } from '../../components/SettingsLayout';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import { useToast } from '../../components/ui/Toast';
import { useBusinessPixConfig, useUpdateBusinessPixConfig } from '../../hooks/useMemberships';
import { useAuth } from '../../contexts/AuthContext';
import { validatePixKey, PixKeyType } from '../../lib/pix-generator';
import { validateMbwayPhone } from '../../lib/mbway';
import { Button } from '../../components/ui';
import { ClubOwnerNav } from '../../components/membership/ClubOwnerNav';

const PIX_TYPES: { value: PixKeyType; label: string; placeholder: string; helper: string }[] = [
    { value: 'cpf', label: 'CPF', placeholder: '000.000.000-00', helper: 'Seu CPF (apenas números)' },
    { value: 'cnpj', label: 'CNPJ', placeholder: '00.000.000/0000-00', helper: 'CNPJ da empresa' },
    { value: 'phone', label: 'Celular', placeholder: '(11) 98765-4321', helper: 'Seu celular com DDD' },
    { value: 'email', label: 'E-mail', placeholder: 'voce@email.com', helper: 'Seu e-mail pessoal ou comercial' },
    { value: 'random', label: 'Chave aleatória', placeholder: '123e4567-e89b-12d3-a456-426614174000', helper: 'Código gerado pelo seu banco' },
];

export const MembershipSettings: React.FC = () => {
    const { accent, colors, classes, isBeauty, font } = useBrutalTheme();
    const { showToast } = useToast();
    const { businessName, region } = useAuth();
    const isPt = region === 'PT';
    const { data: config, isLoading } = useBusinessPixConfig();
    const updateMutation = useUpdateBusinessPixConfig();

    const [pixKeyType, setPixKeyType] = useState<PixKeyType>('cpf');
    const [pixKeyValue, setPixKeyValue] = useState('');
    const [holderName, setHolderName] = useState('');
    const [merchantCity, setMerchantCity] = useState('SAO PAULO');
    const [pixValid, setPixValid] = useState<boolean | null>(null);
    const [mbwayPhone, setMbwayPhone] = useState('');
    const [mbwayHolder, setMbwayHolder] = useState('');
    const [mbwayValid, setMbwayValid] = useState<boolean | null>(null);

    useEffect(() => {
        if (config) {
            if (config.pix_key_type) setPixKeyType(config.pix_key_type);
            if (config.pix_key_value) setPixKeyValue(config.pix_key_value);
            if (config.pix_holder_name) setHolderName(config.pix_holder_name);
            if (config.pix_merchant_city) setMerchantCity(config.pix_merchant_city);
            if (config.mbway_phone) setMbwayPhone(config.mbway_phone);
            if (config.mbway_holder_name) setMbwayHolder(config.mbway_holder_name);
        }
    }, [config]);

    useEffect(() => {
        if (!pixKeyValue) {
            setPixValid(null);
            return;
        }
        setPixValid(!!validatePixKey(pixKeyValue, pixKeyType));
    }, [pixKeyValue, pixKeyType]);

    useEffect(() => {
        if (!mbwayPhone) {
            setMbwayValid(null);
            return;
        }
        setMbwayValid(!!validateMbwayPhone(mbwayPhone));
    }, [mbwayPhone]);

    useEffect(() => {
        if (businessName && !holderName) setHolderName(businessName);
        if (businessName && !mbwayHolder) setMbwayHolder(businessName);
    }, [businessName, holderName, mbwayHolder]);

    const selectedType = PIX_TYPES.find(t => t.value === pixKeyType)!;

    const handleSavePix = async () => {
        if (!pixValid) {
            showToast('Chave Pix inválida. Verifique o valor digitado.', 'error');
            return;
        }
        if (!holderName.trim()) {
            showToast('Informe o nome do recebedor.', 'error');
            return;
        }
        try {
            const normalizedKey = validatePixKey(pixKeyValue, pixKeyType)!;
            await updateMutation.mutateAsync({
                pix_key_type: pixKeyType,
                pix_key_value: normalizedKey,
                pix_holder_name: holderName.trim(),
                pix_merchant_city: merchantCity.trim().toUpperCase() || 'SAO PAULO',
            });
            showToast('Pix cadastrado com sucesso!', 'success');
        } catch {
            showToast('Não foi possível salvar o Pix. Tente novamente.', 'error');
        }
    };

    const handleSaveMbway = async () => {
        const normalized = validateMbwayPhone(mbwayPhone);
        if (!normalized) {
            showToast('Telemóvel MB WAY inválido. Use 9 dígitos a começar por 9.', 'error');
            return;
        }
        try {
            await updateMutation.mutateAsync({
                mbway_phone: normalized,
                mbway_holder_name: (mbwayHolder || businessName || '').trim(),
            });
            showToast('MB WAY cadastrado com sucesso!', 'success');
        } catch {
            showToast('Não foi possível salvar o MB WAY. Tente novamente.', 'error');
        }
    };

    if (isLoading) {
        return (
            <SettingsLayout>
                <div className="w-full max-w-3xl space-y-6">
                    <ClubOwnerNav />
                    <div className={`${colors.textSecondary} p-8`}>Carregando...</div>
                </div>
            </SettingsLayout>
        );
    }

    return (
        <SettingsLayout>
            <div className="w-full max-w-3xl pb-20 md:pb-0 space-y-6">
                <header>
                    <h1 className={`text-2xl md:text-3xl ${font.heading} ${colors.text} uppercase mb-2`}>
                        {isPt ? 'MB WAY do Clube' : 'Pix do Clube'}
                    </h1>
                    <p className={`${colors.textSecondary} text-sm`}>
                        {isPt
                            ? 'Cadastre o telemóvel MB WAY para receber as mensalidades dos assinantes.'
                            : 'Configure seu Pix para receber as mensalidades dos assinantes.'}
                    </p>
                </header>

                <ClubOwnerNav />

                {isPt ? (
                    <section className={`${colors.card} ${colors.border} border rounded-2xl p-6 space-y-5`}>
                        <h2 className={`${font.heading} ${colors.text} text-lg uppercase`}>Seu MB WAY</h2>

                        <div>
                            <label className={`${classes.label} block mb-1.5`}>Telemóvel MB WAY</label>
                            <input
                                type="tel"
                                value={mbwayPhone}
                                onChange={e => setMbwayPhone(e.target.value)}
                                placeholder="912 345 678"
                                className={`${classes.input} ${mbwayValid === false ? 'border-[var(--color-danger-border)]/60' : ''}`}
                            />
                            {mbwayValid === false && (
                                <p className="text-[var(--color-danger)] text-xs mt-1.5 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    Use um telemóvel português (9 dígitos a começar por 9)
                                </p>
                            )}
                            {mbwayValid === true && (
                                <p className="text-[var(--color-success)] text-xs mt-1.5 flex items-center gap-1">
                                    <Check className="w-3 h-3" />
                                    Número válido
                                </p>
                            )}
                        </div>

                        <div>
                            <label className={`${classes.label} block mb-1.5`}>Nome do recebedor</label>
                            <input
                                type="text"
                                value={mbwayHolder}
                                onChange={e => setMbwayHolder(e.target.value)}
                                placeholder="Ana Silva"
                                className={classes.input}
                            />
                        </div>

                        <Button
                            variant="primary"
                            onClick={() => void handleSaveMbway()}
                            loading={updateMutation.isPending}
                            disabled={!mbwayValid}
                            forceTheme={isBeauty ? 'beauty' : 'barber'}
                        >
                            <Save className="w-4 h-4 mr-2" />
                            Salvar MB WAY
                        </Button>
                    </section>
                ) : (
                    <section className={`${colors.card} ${colors.border} border rounded-2xl p-6 space-y-5`}>
                        <h2 className={`${font.heading} ${colors.text} text-lg uppercase`}>Seu Pix</h2>

                        <div>
                            <label className={`${classes.label} block mb-1.5`}>Tipo de chave</label>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                {PIX_TYPES.map(t => (
                                    <button
                                        key={t.value}
                                        type="button"
                                        onClick={() => setPixKeyType(t.value)}
                                        className={[
                                            'py-2.5 px-2 rounded-xl text-xs font-bold uppercase tracking-wide leading-tight transition-all',
                                            pixKeyType === t.value
                                                ? `${accent.bg} text-[var(--color-bg)] ${accent.shadow}`
                                                : `${colors.inputBg} ${colors.border} ${colors.textMuted} border`,
                                        ].join(' ')}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className={`${classes.label} block mb-1.5`}>{selectedType.label}</label>
                            <input
                                type="text"
                                value={pixKeyValue}
                                onChange={e => setPixKeyValue(e.target.value)}
                                placeholder={selectedType.placeholder}
                                className={`${classes.input} ${pixValid === false ? 'border-[var(--color-danger-border)]/60' : ''}`}
                            />
                            {pixValid === false && (
                                <p className="text-[var(--color-danger)] text-xs mt-1.5 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    {selectedType.helper}
                                </p>
                            )}
                            {pixValid === true && (
                                <p className="text-[var(--color-success)] text-xs mt-1.5 flex items-center gap-1">
                                    <Check className="w-3 h-3" />
                                    Chave válida
                                </p>
                            )}
                        </div>

                        <div>
                            <label className={`${classes.label} block mb-1.5`}>Nome do recebedor (como aparece no app do cliente)</label>
                            <input
                                type="text"
                                value={holderName}
                                onChange={e => setHolderName(e.target.value)}
                                placeholder="João Silva"
                                className={classes.input}
                            />
                        </div>

                        <div>
                            <label className={`${classes.label} block mb-1.5`}>Cidade do recebedor</label>
                            <input
                                type="text"
                                value={merchantCity}
                                onChange={e => setMerchantCity(e.target.value)}
                                placeholder="SAO PAULO"
                                className={classes.input}
                            />
                            <p className={`${colors.textMuted} text-xs mt-1.5`}>
                                Aparece no QR Code. Sem acentos, até 15 caracteres.
                            </p>
                        </div>

                        <Button
                            variant="primary"
                            onClick={() => void handleSavePix()}
                            loading={updateMutation.isPending}
                            disabled={!pixValid}
                            forceTheme={isBeauty ? 'beauty' : 'barber'}
                        >
                            <Save className="w-4 h-4 mr-2" />
                            Salvar Pix
                        </Button>
                    </section>
                )}

                <section className={`${colors.card} ${colors.border} border rounded-2xl p-6 space-y-3`}>
                    <h2 className={`${font.heading} ${colors.text} text-lg uppercase`}>Próximos passos</h2>
                    <ol className={`${colors.textSecondary} text-sm space-y-2 list-decimal list-inside`}>
                        <li>Crie seus planos em <a href="#/configuracoes/clube" className={`${accent.text} underline`}>Configurações &gt; Clube &gt; Planos</a></li>
                        <li>Compartilhe o link <code className="px-1.5 py-0.5 bg-[var(--color-card-hover)] rounded text-xs">/#/clube/[seu-slug]</code> com clientes</li>
                        <li>Confirme pagamentos manuais na <a href="#/clube/assinantes" className={`${accent.text} underline`}>lista de assinantes</a></li>
                    </ol>
                </section>
            </div>
        </SettingsLayout>
    );
};
