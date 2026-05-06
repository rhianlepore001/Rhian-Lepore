import React, { useState, useEffect } from 'react';
import { Modal, ModalFooter } from '../Modal';
import { BrutalButton } from '../BrutalButton';
import { useAuth } from '../../contexts/AuthContext';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import { generateReactivationMessage, getWhatsAppUrl } from '../../utils/aiosCopywriter';
import { Sparkles, MessageSquare, Copy, Send, RefreshCw } from 'lucide-react';

interface CampaignModalProps {
    isOpen: boolean;
    onClose: () => void;
    clientData?: {
        name: string;
        phone: string;
        daysMissing: number;
        lastService?: string;
        ltv?: number;
    };
}

export const CampaignModal: React.FC<CampaignModalProps> = ({ isOpen, onClose, clientData }) => {
    const { userType, businessName } = useAuth();
    const [message, setMessage] = useState('');
    const [isCopying, setIsCopying] = useState(false);

    const { accent } = useBrutalTheme();

    const handleGenerate = () => {
        const newMessage = decodeURIComponent(generateReactivationMessage({
            name: clientData?.name || 'Cliente',
            businessName: businessName || 'Nossa Unidade',
            userType: userType || 'barber',
            daysMissing: clientData?.daysMissing || 30,
            lastService: clientData?.lastService,
            ltv: clientData?.ltv
        }));
        setMessage(newMessage);
    };

    useEffect(() => {
        if (isOpen) {
            handleGenerate();
        }
    }, [isOpen, clientData]);

    const handleCopy = async () => {
        // Se for mobile e suportar share, tenta share primeiro
        if (navigator.share && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
            try {
                await navigator.share({
                    title: 'Campanha de Reativação - AgendiX',
                    text: message
                });
                return;
            } catch (err) {
                // Share failed or cancelled
            }
        }

        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(message);
                setIsCopying(true);
                setTimeout(() => setIsCopying(false), 2000);
            } else {
                throw new Error('Clipboard API unavailable');
            }
        } catch (err) {
            try {
                const textArea = document.createElement("textarea");
                textArea.value = message;
                textArea.style.position = "fixed";
                textArea.style.left = "-9999px";
                textArea.style.top = "0";
                textArea.style.opacity = "0";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                if (successful) {
                    setIsCopying(true);
                    setTimeout(() => setIsCopying(false), 2000);
                }
            } catch (fallbackErr) {
                console.error('Fallback copy failed', fallbackErr);
            }
        }
    };

    const handleSend = () => {
        if (clientData?.phone) {
            window.open(getWhatsAppUrl(clientData.phone, encodeURIComponent(message)), '_blank');
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Sócio Virtual: Sugestão de Campanha"
            size="lg"
            footer={
                <ModalFooter align="between">
                    <BrutalButton
                        variant="ghost"
                        icon={<RefreshCw className="w-4 h-4" />}
                        onClick={handleGenerate}
                    >
                        Gerar Outra
                    </BrutalButton>
                    <div className="flex gap-3">
                        <BrutalButton
                            variant="secondary"
                            icon={<Copy className="w-4 h-4" />}
                            onClick={handleCopy}
                        >
                            {isCopying ? 'Copiado!' : 'Copiar'}
                        </BrutalButton>
                        <BrutalButton
                            variant="primary"
                            icon={<Send className="w-4 h-4" />}
                            onClick={handleSend}
                            disabled={!clientData?.phone}
                        >
                            Enviar WhatsApp
                        </BrutalButton>
                    </div>
                </ModalFooter>
            }
        >
            <div className="space-y-4">
                <div className={`p-4 rounded-lg bg-white/5 border ${accent.borderDim} flex items-start gap-3`}>
                    <Sparkles className={`w-5 h-5 ${accent.text} mt-1 flex-shrink-0`} />
                    <div>
                        <p className="text-sm text-white font-medium">Análise de IA Concluída</p>
                        <p className="text-xs text-text-secondary font-mono mt-1">
                            Sugerindo mensagem para trazer de volta {clientData?.name || 'Cliente Selecionado'}.
                            Esse cliente não aparece há {clientData?.daysMissing || 30} dias.
                        </p>
                    </div>
                </div>

                <div className="relative">
                    <label className="text-xs font-mono text-text-secondary uppercase mb-2 block">Mensagem Sugerida</label>
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className={`
                            w-full h-48 p-4 rounded-xl font-sans text-sm
                            bg-black/40 text-white border-2 border-white/10
                            focus:${accent.border} outline-none transition-all
                            resize-none scrollbar-thin
                        `}
                        placeholder="Gerando sugestão..."
                    />
                    <div className="absolute bottom-3 right-3 opacity-10 pointer-events-none">
                        <MessageSquare className="w-12 h-12 text-white" />
                    </div>
                </div>

                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <p className="text-[10px] font-mono text-blue-400 leading-relaxed uppercase">
                        DICA: Personalize o texto acima com o seu jeito de falar. Quanto mais você usar, melhores ficam as sugestões.
                    </p>
                </div>
            </div>
        </Modal>
    );
};
