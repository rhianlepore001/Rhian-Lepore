import React from 'react';
import { Check, MessageCircle } from 'lucide-react';
import { formatCurrency, Region } from '../../utils/formatters';

interface AppointmentReviewProps {
    clients: any[];
    selectedClientId: string;
    teamMembers: any[];
    selectedProId: string;
    selectedDate: Date;
    selectedTime: string;
    cardBg: string;
    activeCardBg: string;
    selectedServicesDetails: any[];
    isCustomService: boolean;
    customServiceName: string;
    customServicePrice: string;
    currencyRegion: Region;
    isBeauty: boolean;
    accentColor: string;
    sendWhatsapp: boolean;
    setSendWhatsapp: (v: boolean) => void;
    customPrice: string;
    setCustomPrice: (v: string) => void;
    discount: string;
    setDiscount: (v: string) => void;
    finalPrice: number;
    notes: string;
    setNotes: (v: string) => void;
    currencySymbol: string;
    paymentMethod: string;
    setPaymentMethod: (v: string) => void;
    region: Region;
}

export const AppointmentReview: React.FC<AppointmentReviewProps> = ({
    clients,
    selectedClientId,
    teamMembers,
    selectedProId,
    selectedDate,
    selectedTime,
    cardBg,
    selectedServicesDetails,
    isCustomService,
    customServiceName,
    customServicePrice,
    currencyRegion,
    isBeauty,
    accentColor,
    sendWhatsapp,
    setSendWhatsapp,
    customPrice,
    setCustomPrice,
    discount,
    setDiscount,
    finalPrice,
    notes,
    setNotes,
    currencySymbol,
    paymentMethod,
    setPaymentMethod,
    region
}) => {
    const paymentOptions = region === 'PT'
        ? [
            { id: '', label: 'Definir depois', icon: '⏳' },
            { id: 'Dinheiro', label: 'Dinheiro', icon: '💵' },
            { id: 'MBWay', label: 'MBWay', icon: '📱' },
            { id: 'Débito', label: 'Débito', icon: '💳' },
            { id: 'Crédito', label: 'Crédito', icon: '💳' },
        ]
        : [
            { id: '', label: 'Definir depois', icon: '⏳' },
            { id: 'Dinheiro', label: 'Dinheiro', icon: '💵' },
            { id: 'Pix', label: 'Pix', icon: '💎' },
            { id: 'Débito', label: 'Débito', icon: '💳' },
            { id: 'Crédito', label: 'Crédito', icon: '💳' },
        ];
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-6">
                <div className={`p-6 rounded-xl border space-y-4 ${cardBg}`}>
                    <h3 className="text-theme-text font-heading text-lg border-b border-[var(--color-divider)] pb-2">Resumo</h3>

                    <div className="flex justify-between">
                        <span className="text-theme-textSecondary">Cliente</span>
                        <span className="text-theme-text font-bold">{clients.find(c => c.id === selectedClientId)?.name}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-theme-textSecondary">Profissional</span>
                        <span className="text-theme-text font-bold">{teamMembers.find(t => t.id === selectedProId)?.name}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-theme-textSecondary">Data e Hora</span>
                        <span className="text-theme-text font-bold text-right">
                            {selectedDate.toLocaleDateString('pt-BR')} às {selectedTime}
                        </span>
                    </div>
                    <div className="border-t border-[var(--color-divider)] pt-2">
                        <span className="text-theme-textSecondary block mb-2">Serviços</span>
                        <div className="flex flex-wrap gap-2">
                            {selectedServicesDetails.map(s => (
                                <span key={s.id} className="text-xs bg-[var(--color-card-hover)] px-2 py-1 rounded text-theme-text border border-[var(--color-divider)]">
                                    {s.name}
                                </span>
                            ))}
                            {isCustomService && customServiceName && (
                                <span className="text-xs px-2 py-1 rounded text-[var(--color-bg)] border-2 bg-theme-accent border-theme-accent">
                                    {customServiceName} ({formatCurrency(parseFloat(customServicePrice || '0'), currencyRegion)})
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${sendWhatsapp ? 'bg-[var(--color-success-bg)] border-[var(--color-success-border)]' : cardBg}`}>
                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${sendWhatsapp ? 'bg-[var(--color-success)] border-[var(--color-success-border)] text-black' : 'border-[var(--color-input-border)]'}`}>
                        {sendWhatsapp && <Check className="w-3 h-3" />}
                    </div>
                    <input type="checkbox" checked={sendWhatsapp} onChange={e => setSendWhatsapp(e.target.checked)} className="hidden" />
                    <div className="flex-1">
                        <span className={`font-bold block ${sendWhatsapp ? 'text-[var(--color-success)]' : 'text-theme-textSecondary'}`}>Enviar confirmação no WhatsApp</span>
                        <span className="text-xs text-[var(--color-text-muted)]">Abre o WhatsApp Web após salvar</span>
                    </div>
                    <MessageCircle className={`w-5 h-5 ${sendWhatsapp ? 'text-[var(--color-success)]' : 'text-[var(--color-text-muted)]'}`} />
                </label>
            </div>

            <div className="space-y-6">
                <div className={`p-6 rounded-xl border space-y-4 ${cardBg}`}>
                    <h3 className="text-theme-text font-heading text-lg border-b border-[var(--color-divider)] pb-2">Financeiro & Notas</h3>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-theme-textSecondary uppercase font-bold mb-1 block">Preço Final</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">{currencySymbol}</span>
                                <input
                                    type="number"
                                    value={customPrice}
                                    onChange={e => setCustomPrice(e.target.value)}
                                    className="w-full bg-[var(--color-input-bg)] text-theme-text pl-8 p-3 rounded-lg border border-[var(--color-input-border)] focus:outline-none focus:border-theme-accent font-mono font-bold"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-theme-textSecondary uppercase font-bold mb-1 block">Desconto (%)</label>
                            <input
                                type="number"
                                value={discount}
                                onChange={e => setDiscount(e.target.value)}
                                className="w-full bg-[var(--color-input-bg)] text-theme-text p-3 rounded-lg border border-[var(--color-input-border)] focus:outline-none focus:border-theme-accent font-mono"
                            />
                        </div>
                    </div>

                    <div className="flex justify-between items-center py-2 border-t border-[var(--color-divider)]">
                        <span className="text-theme-textSecondary">Total a Receber</span>
                        <span className={`text-2xl font-bold font-mono text-theme-accent`}>
                            {formatCurrency(finalPrice, currencyRegion)}
                        </span>
                    </div>

                    <div>
                        <label className="text-xs text-theme-textSecondary uppercase font-bold mb-1 block">Observações Internas</label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            className="w-full bg-[var(--color-input-bg)] text-theme-text p-3 rounded-lg border border-[var(--color-input-border)] focus:outline-none focus:border-theme-accent min-h-[80px]"
                            placeholder="Ex: Cliente prefere água gelada..."
                        />
                    </div>

                    <div className="pt-4 border-t border-[var(--color-divider)]">
                        <label className="text-xs text-theme-textSecondary uppercase font-bold mb-3 block">Forma de Pagamento</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {paymentOptions.map((opt) => (
                                <button
                                    key={opt.id === '' ? '__none__' : opt.id}
                                    onClick={() => setPaymentMethod(opt.id)}
                                    className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${paymentMethod === opt.id
                                        ? 'bg-[var(--color-accent-dim)] border-theme-accent text-theme-text scale-95 shadow-lg'
                                        : 'bg-theme-surface border-[var(--color-divider)] text-[var(--color-text-muted)] hover:border-[var(--color-input-border)]'
                                        }`}
                                >
                                    <span className="text-xl mb-1">{opt.icon}</span>
                                    <span className="text-xs font-bold uppercase">{opt.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
