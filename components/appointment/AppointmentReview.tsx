import React from 'react';
import { MessageCircle } from 'lucide-react';
import { formatCurrency, Region } from '../../utils/formatters';
import { SettingsSwitch } from '../SettingsSwitch';
import { StepHeading } from './StepHeading';

interface AppointmentReviewProps {
    clients: any[];
    selectedClientId: string;
    teamMembers: any[];
    selectedProId: string;
    selectedDate: Date;
    selectedTime: string;
    cardBg: string;
    activeCardBg?: string;
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
}

/**
 * Passo "Confirmar" do Novo Atendimento. Sem forma de pagamento: ela é
 * escolhida em "Confirmar e cobrar" (o agendamento nasce como "definir depois").
 * O total fica no rodapé do assistente, sempre visível ao lado do botão.
 */
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
    sendWhatsapp,
    setSendWhatsapp,
    customPrice,
    setCustomPrice,
    discount,
    setDiscount,
    notes,
    setNotes,
    currencySymbol,
}) => {
    const row = 'flex justify-between items-baseline gap-3 min-w-0 py-2';
    const label = 'text-sm text-theme-textSecondary shrink-0';
    const value = 'text-sm text-theme-text font-semibold text-right min-w-0';
    const fieldLabel = 'text-xs text-theme-textSecondary font-semibold mb-1.5 block';
    const input = 'w-full bg-[var(--color-input-bg)] text-theme-text rounded-lg border border-[var(--color-input-border)] focus:outline-none focus:border-theme-accent';
    // sem setinhas de number (WebKit/desktop), o valor é digitado
    const noSpin = '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';

    return (
        <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-right-4 duration-300">
            <StepHeading title="Confira o atendimento" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                <section aria-label="Resumo" className={`px-4 py-2 rounded-xl border divide-y divide-[var(--color-divider)] ${cardBg}`}>
                    <div className={row}>
                        <span className={label}>Cliente</span>
                        <span className={`${value} truncate`}>{clients.find(c => c.id === selectedClientId)?.name}</span>
                    </div>
                    <div className={row}>
                        <span className={label}>Profissional</span>
                        <span className={`${value} truncate`}>{teamMembers.find(t => t.id === selectedProId)?.name}</span>
                    </div>
                    <div className={row}>
                        <span className={label}>Data e hora</span>
                        <span className={`${value} tabular-nums`}>
                            {selectedDate.toLocaleDateString('pt-BR')} às {selectedTime}
                        </span>
                    </div>
                    <div className="py-2.5">
                        <span className={`${label} block mb-2`}>Serviços</span>
                        <div className="flex flex-wrap gap-1.5">
                            {selectedServicesDetails.map(s => (
                                <span key={s.id} className="text-xs bg-[var(--color-card-hover)] px-2 py-1 rounded-md text-theme-text border border-[var(--color-divider)]">
                                    {s.name}
                                </span>
                            ))}
                            {isCustomService && customServiceName && (
                                <span className="text-xs px-2 py-1 rounded-md text-theme-text border border-theme-accent bg-[var(--color-accent-dim)]">
                                    {customServiceName} ({formatCurrency(parseFloat(customServicePrice || '0'), currencyRegion)})
                                </span>
                            )}
                        </div>
                    </div>
                </section>

                <section aria-label="Valores e observações" className={`p-4 rounded-xl border space-y-4 ${cardBg}`}>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label htmlFor="review-price" className={fieldLabel}>Preço final</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-text-muted)]">{currencySymbol}</span>
                                <input
                                    id="review-price"
                                    type="number"
                                    inputMode="decimal"
                                    value={customPrice}
                                    onChange={e => setCustomPrice(e.target.value)}
                                    className={`${input} ${noSpin} pl-8 pr-3 py-2.5 font-mono font-bold`}
                                />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="review-discount" className={fieldLabel}>Desconto (%)</label>
                            <input
                                id="review-discount"
                                type="number"
                                inputMode="decimal"
                                value={discount}
                                onChange={e => setDiscount(e.target.value)}
                                className={`${input} ${noSpin} px-3 py-2.5 font-mono`}
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="review-notes" className={fieldLabel}>Observações internas</label>
                        <textarea
                            id="review-notes"
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            rows={2}
                            className={`${input} p-3 text-sm min-h-[64px] resize-none`}
                            placeholder="Ex.: cliente prefere água gelada"
                        />
                    </div>
                </section>
            </div>

            {/* WhatsApp: opção discreta, por último */}
            <div data-testid="review-whatsapp" className="mt-4 flex items-center justify-between gap-3 px-1 py-1">
                <span className="flex items-center gap-2 min-w-0 text-sm text-theme-textSecondary">
                    <MessageCircle className={`w-4 h-4 shrink-0 ${sendWhatsapp ? 'text-[var(--color-success)]' : 'text-[var(--color-text-muted)]'}`} aria-hidden="true" />
                    <span className="truncate">Enviar confirmação no WhatsApp</span>
                </span>
                <SettingsSwitch
                    id="review-whatsapp-toggle"
                    size="sm"
                    checked={sendWhatsapp}
                    onChange={setSendWhatsapp}
                    ariaLabel="Enviar confirmação no WhatsApp"
                />
            </div>
        </div>
    );
};
