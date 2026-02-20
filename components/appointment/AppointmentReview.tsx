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
    setPaymentMethod
}) => {
    const paymentOptions = [
        { id: 'Dinheiro', label: 'Dinheiro', icon: '💵' },
        { id: 'Pix', label: 'Pix', icon: '💎' },
        { id: 'Cartão', label: 'Cartão', icon: '💳' },
    ];
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="space-y-6">
                <div className={`p-6 rounded-xl border space-y-4 ${cardBg}`}>
                    <h3 className="text-white font-heading text-lg border-b border-white/10 pb-2">Resumo</h3>

                    <div className="flex justify-between">
                        <span className="text-neutral-400">Cliente</span>
                        <span className="text-white font-bold">{clients.find(c => c.id === selectedClientId)?.name}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-neutral-400">Profissional</span>
                        <span className="text-white font-bold">{teamMembers.find(t => t.id === selectedProId)?.name}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-neutral-400">Data e Hora</span>
                        <span className="text-white font-bold text-right">
                            {selectedDate.toLocaleDateString('pt-BR')} às {selectedTime}
                        </span>
                    </div>
                    <div className="border-t border-white/10 pt-2">
                        <span className="text-neutral-400 block mb-2">Serviços</span>
                        <div className="flex flex-wrap gap-2">
                            {selectedServicesDetails.map(s => (
                                <span key={s.id} className="text-xs bg-white/10 px-2 py-1 rounded text-white border border-white/10">
                                    {s.name}
                                </span>
                            ))}
                            {isCustomService && customServiceName && (
                                <span className={`text-xs px-2 py-1 rounded text-black border-2 ${isBeauty ? 'bg-beauty-neon border-beauty-neon' : 'bg-accent-gold border-accent-gold'}`}>
                                    {customServiceName} ({formatCurrency(parseFloat(customServicePrice || '0'), currencyRegion)})
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${sendWhatsapp ? 'bg-green-500/10 border-green-500/50' : cardBg}`}>
                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${sendWhatsapp ? 'bg-green-500 border-green-500 text-black' : 'border-neutral-500'}`}>
                        {sendWhatsapp && <Check className="w-3 h-3" />}
                    </div>
                    <input type="checkbox" checked={sendWhatsapp} onChange={e => setSendWhatsapp(e.target.checked)} className="hidden" />
                    <div className="flex-1">
                        <span className={`font-bold block ${sendWhatsapp ? 'text-green-400' : 'text-neutral-400'}`}>Enviar confirmação no WhatsApp</span>
                        <span className="text-xs text-neutral-500">Abre o WhatsApp Web após salvar</span>
                    </div>
                    <MessageCircle className={`w-5 h-5 ${sendWhatsapp ? 'text-green-500' : 'text-neutral-600'}`} />
                </label>
            </div>

            <div className="space-y-6">
                <div className={`p-6 rounded-xl border space-y-4 ${cardBg}`}>
                    <h3 className="text-white font-heading text-lg border-b border-white/10 pb-2">Financeiro & Notas</h3>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-neutral-400 uppercase font-bold mb-1 block">Preço Final</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">{currencySymbol}</span>
                                <input
                                    type="number"
                                    value={customPrice}
                                    onChange={e => setCustomPrice(e.target.value)}
                                    className="w-full bg-black/20 text-white pl-8 p-3 rounded-lg border border-white/10 focus:outline-none focus:border-white/30 font-mono font-bold"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-neutral-400 uppercase font-bold mb-1 block">Desconto (%)</label>
                            <input
                                type="number"
                                value={discount}
                                onChange={e => setDiscount(e.target.value)}
                                className="w-full bg-black/20 text-white p-3 rounded-lg border border-white/10 focus:outline-none focus:border-white/30 font-mono"
                            />
                        </div>
                    </div>

                    <div className="flex justify-between items-center py-2 border-t border-white/5">
                        <span className="text-neutral-400">Total a Receber</span>
                        <span className={`text-2xl font-bold font-mono ${accentColor}`}>
                            {formatCurrency(finalPrice, currencyRegion)}
                        </span>
                    </div>

                    <div>
                        <label className="text-xs text-neutral-400 uppercase font-bold mb-1 block">Observações Internas</label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            className="w-full bg-black/20 text-white p-3 rounded-lg border border-white/10 focus:outline-none focus:border-white/30 min-h-[80px]"
                            placeholder="Ex: Cliente prefere água gelada..."
                        />
                    </div>

                    <div className="pt-4 border-t border-white/10">
                        <label className="text-xs text-neutral-400 uppercase font-bold mb-3 block">Forma de Pagamento</label>
                        <div className="grid grid-cols-3 gap-2">
                            {paymentOptions.map((opt) => (
                                <button
                                    key={opt.id}
                                    onClick={() => setPaymentMethod(opt.id)}
                                    className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${paymentMethod === opt.id
                                        ? `${isBeauty ? 'bg-beauty-neon/20 border-beauty-neon text-white' : 'bg-accent-gold border-accent-gold text-black'} scale-95 shadow-lg`
                                        : 'bg-black/20 border-white/5 text-neutral-500 hover:border-white/20'
                                        }`}
                                >
                                    <span className="text-xl mb-1">{opt.icon}</span>
                                    <span className="text-[10px] font-bold uppercase">{opt.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
