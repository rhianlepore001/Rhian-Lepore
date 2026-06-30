import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, Check } from 'lucide-react';
import { SettingsLayout } from '../../components/SettingsLayout';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import { useToast } from '../../components/ui/Toast';
import { useBusinessPixConfig, useUpdateBusinessPixConfig } from '../../hooks/useMemberships';
import { useAuth } from '../../contexts/AuthContext';
import { validatePixKey, PixKeyType } from '../../lib/pix-generator';
import { Button } from '../../components/ui';

const PIX_TYPES: { value: PixKeyType; label: string; placeholder: string; helper: string }[] = [
    { value: 'cpf', label: 'CPF', placeholder: '000.000.000-00', helper: 'Seu CPF (apenas números)' },
    { value: 'cnpj', label: 'CNPJ', placeholder: '00.000.000/0000-00', helper: 'CNPJ da empresa' },
    { value: 'phone', label: 'Celular', placeholder: '(11) 98765-4321', helper: 'Seu celular com DDD' },
    { value: 'email', label: 'E-mail', placeholder: 'voce@email.com', helper: 'Seu e-mail pessoal ou comercial' },
    { value: 'random', label: 'Chave aleatória', placeholder: '123e4567-e89b-12d3-a456-426614174000', helper: 'UUID gerado pelo seu banco' },
];

export const MembershipSettings: React.FC = () => {
    const { accent, colors, classes, isBeauty, font } = useBrutalTheme();
    const { showToast } = useToast();
    const { businessName } = useAuth();
    const { data: config, isLoading } = useBusinessPixConfig();
    const updateMutation = useUpdateBusinessPixConfig();

    const [pixKeyType, setPixKeyType] = useState<PixKeyType>('cpf');
    const [pixKeyValue, setPixKeyValue] = useState('');
    const [holderName, setHolderName] = useState('');
    const [merchantCity, setMerchantCity] = useState('SAO PAULO');
    const [pixValid, setPixValid] = useState<boolean | null>(null);

    useEffect(() => {
        if (config) {
            if (config.pix_key_type) setPixKeyType(config.pix_key_type);
            if (config.pix_key_value) setPixKeyValue(config.pix_key_value);
            if (config.pix_holder_name) setHolderName(config.pix_holder_name);
            if (config.pix_merchant_city) setMerchantCity(config.pix_merchant_city);
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
        if (businessName && !holderName) {
            setHolderName(businessName);
        }
    }, [businessName, holderName]);

    const selectedType = PIX_TYPES.find(t => t.value === pixKeyType)!;

    const handleSave = async () => {
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
        } catch (err) {
            showToast('Erro ao salvar: ' + (err as Error).message, 'error');
        }
    };

    if (isLoading) {
        return (
            <SettingsLayout>
                <div className={`${colors.textSecondary} p-8`}>Carregando...</div>
            </SettingsLayout>
        );
    }

    return (
        <SettingsLayout>
            <div className="max-w-2xl pb-20 md:pb-0 space-y-6">
                <header>
                    <h1 className={`text-2xl md:text-3xl ${font.heading} ${colors.text} uppercase mb-2`}>
                        Clube de Assinatura
                    </h1>
                    <p className={`${colors.textSecondary} text-sm`}>
                        Configure seu Pix para receber as mensalidades dos assinantes.
                    </p>
                </header>

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
                                        'py-2.5 px-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all',
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
                            className={`${classes.input} ${pixValid === false ? 'border-red-500/60' : ''}`}
                        />
                        {pixValid === false && (
                            <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                {selectedType.helper}
                            </p>
                        )}
                        {pixValid === true && (
                            <p className="text-green-400 text-xs mt-1.5 flex items-center gap-1">
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
                        onClick={handleSave}
                        loading={updateMutation.isPending}
                        disabled={!pixValid}
                        forceTheme={isBeauty ? 'beauty' : 'barber'}
                    >
                        <Save className="w-4 h-4 mr-2" />
                        Salvar Pix
                    </Button>
                </section>

                <section className={`${colors.card} ${colors.border} border rounded-2xl p-6 space-y-3`}>
                    <h2 className={`${font.heading} ${colors.text} text-lg uppercase`}>Próximos passos</h2>
                    <ol className={`${colors.textSecondary} text-sm space-y-2 list-decimal list-inside`}>
                        <li>Crie seus planos em <a href="#/configuracoes/clube" className={`${accent.text} underline`}>Configurações &gt; Clube &gt; Planos</a></li>
                        <li>Compartilhe o link <code className="px-1.5 py-0.5 bg-white/5 rounded text-xs">/#/clube/[seu-slug]</code> com clientes</li>
                        <li>Confirme pagamentos manuais na <a href="#/clube/assinantes" className={`${accent.text} underline`}>lista de assinantes</a></li>
                    </ol>
                </section>
            </div>
        </SettingsLayout>
    );
};
