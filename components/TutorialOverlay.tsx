import React, { useState, useEffect } from 'react';
import { X, ChevronRight, Check, Settings, Globe, Calendar, User } from 'lucide-react';
import { BrutalButton } from './BrutalButton';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface TutorialStep {
    title: string;
    description: string;
    icon: React.ReactNode;
    image?: string;
}

export const TutorialOverlay: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    const { userType, markTutorialCompleted } = useAuth();
    const [isOpen, setIsOpen] = useState(true);
    const [currentStep, setCurrentStep] = useState(0);
    const [showWelcome, setShowWelcome] = useState(true);

    const isBeauty = userType === 'beauty';
    const accentColor = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';
    const accentBg = isBeauty ? 'bg-beauty-neon' : 'bg-accent-gold';
    const borderColor = isBeauty ? 'border-beauty-neon' : 'border-accent-gold';

    const steps: TutorialStep[] = [
        {
            title: "Configuração do Negócio",
            description: "Comece personalizando seu perfil. Adicione sua logo, foto de capa e informações de contato em 'Configurações > Geral'. Isso passa credibilidade para seus clientes.",
            icon: <Settings className={`w-12 h-12 ${accentColor}`} />
        },
        {
            title: "Agendamento Público",
            description: "Você tem um link exclusivo para seus clientes agendarem horários sozinhos! Configure seu link em 'Configurações > Agendamento' e compartilhe no Instagram/WhatsApp.",
            icon: <Globe className={`w-12 h-12 ${accentColor}`} />
        },
        {
            title: "Gerencie sua Agenda",
            description: "Na tela de Agenda, você visualiza todos os compromissos. Clique em um horário para agendar manualmente ou veja os agendamentos que chegaram pelo link público.",
            icon: <Calendar className={`w-12 h-12 ${accentColor}`} />
        },
        {
            title: "Gestão de Equipe",
            description: "Se você tem funcionários, adicione-os em 'Configurações > Equipe'. Cada um terá sua própria agenda e comissões calculadas automaticamente.",
            icon: <User className={`w-12 h-12 ${accentColor}`} />
        }
    ];

    const handleStart = () => {
        setShowWelcome(false);
    };

    const handleSkip = async () => {
        await markTutorialCompleted();
        setIsOpen(false);
        onComplete();
    };

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleSkip(); // Finish and mark as complete
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
            <div className={`relative w-full max-w-lg bg-neutral-900 border-2 ${borderColor} shadow-[0_0_30px_rgba(0,0,0,0.5)] p-8 md:p-10`}>

                {/* Close Button (Skip) */}
                <button
                    onClick={handleSkip}
                    className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>

                {showWelcome ? (
                    <div className="text-center space-y-6">
                        <div className={`w-20 h-20 mx-auto rounded-full border-2 ${borderColor} flex items-center justify-center bg-neutral-800 mb-6`}>
                            <span className="text-4xl">🚀</span>
                        </div>

                        <h2 className="text-3xl md:text-4xl font-heading text-white uppercase leading-none">
                            Bem-vindo ao <span className={accentColor}>Sistema</span>
                        </h2>

                        <p className="text-neutral-400 text-lg leading-relaxed">
                            Preparamos um guia rápido para você dominar todas as ferramentas e levar seu negócio para o próximo nível.
                        </p>

                        <div className="flex flex-col gap-3 pt-4">
                            <BrutalButton
                                variant="primary"
                                className="w-full py-4 text-lg"
                                onClick={handleStart}
                            >
                                Fazer Tutorial Rápido
                            </BrutalButton>

                            <button
                                onClick={handleSkip}
                                className="text-neutral-500 hover:text-white text-sm font-mono uppercase tracking-widest py-2"
                            >
                                Pular Introdução
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6 animate-in slide-in-from-right duration-300">
                        <div className="flex justify-between items-center mb-8">
                            <span className="font-mono text-xs text-neutral-500 uppercase tracking-widest">
                                Passo {currentStep + 1} de {steps.length}
                            </span>
                            <div className="flex gap-1">
                                {steps.map((_, idx) => (
                                    <div
                                        key={idx}
                                        className={`h-1.5 w-8 rounded-full transition-colors ${idx <= currentStep ? accentBg : 'bg-neutral-800'}`}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col items-center text-center space-y-4 min-h-[200px]">
                            <div className={`p-4 rounded-2xl bg-neutral-800/50 border border-neutral-700 mb-2`}>
                                {steps[currentStep].icon}
                            </div>

                            <h3 className="text-2xl font-heading text-white uppercase">
                                {steps[currentStep].title}
                            </h3>

                            <p className="text-neutral-400 leading-relaxed">
                                {steps[currentStep].description}
                            </p>
                        </div>

                        <div className="pt-6 flex items-center justify-between gap-4">
                            <button
                                onClick={handleSkip}
                                className="text-neutral-500 hover:text-white text-sm font-mono uppercase"
                            >
                                Pular
                            </button>

                            <BrutalButton
                                variant="primary"
                                onClick={handleNext}
                                className="px-8"
                                icon={currentStep === steps.length - 1 ? <Check /> : <ChevronRight />}
                            >
                                {currentStep === steps.length - 1 ? 'Concluir' : 'Próximo'}
                            </BrutalButton>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};