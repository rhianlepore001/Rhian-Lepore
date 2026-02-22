import React from 'react';
import { useAuth } from '../contexts/AuthContext';

interface AgenXLogoProps {
    size?: number | string;
    className?: string;
    showText?: boolean;
    isBeauty?: boolean; // Prop opcional para override do tema
}

/**
 * AgenXLogo - O logo oficial da marca unificada.
 * Representa fluxo automático, gestão e inteligência humana de forma orgânica.
 */
export const AgenXLogo: React.FC<AgenXLogoProps> = ({
    size = 40,
    className = '',
    showText = true,
    isBeauty: isBeautyOverride
}) => {
    const { userType } = useAuth();

    // Se o override for passado, usa ele. Caso contrário, usa o do contexto.
    const isBeauty = isBeautyOverride !== undefined ? isBeautyOverride : userType === 'beauty';

    // Cores dinâmicas baseadas no tema para manter a identidade visual que o usuário solicitou
    const accentColor = isBeauty ? '#A78BFA' : '#C29B40'; // Beauty Neon : Accent Gold

    return (
        <div className={`flex items-center gap-3 ${className}`}>
            <div className="relative" style={{ width: size, height: size }}>
                <svg
                    width={size}
                    height={size}
                    viewBox="0 0 100 100"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="filter drop-shadow-glow"
                >
                    {/* Fundo orgânico sugerindo fluxo de dados/clientes */}
                    <path
                        d="M20 50C20 30 40 20 60 20C80 20 90 40 80 60C70 80 50 85 30 75C10 65 10 50 20 50Z"
                        fill={accentColor}
                        fillOpacity="0.1"
                    />

                    {/* O 'A' central estilizado */}
                    <path
                        d="M35 70L50 30L65 70"
                        stroke="white"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <path
                        d="M42 58H58"
                        stroke="white"
                        strokeWidth="6"
                        strokeLinecap="round"
                    />

                    {/* Linha de Fluxo Direcional (Automation/SaaS) */}
                    <path
                        d="M25 45C25 45 35 25 65 35C95 45 75 80 45 85C15 90 25 45 25 45Z"
                        stroke={accentColor}
                        strokeWidth="3"
                        strokeDasharray="6 12"
                        className="animate-flow-slow"
                    />

                    {/* O 'X' sutil na interseção de crescimento */}
                    <circle cx="50" cy="50" r="3" fill={accentColor} />
                </svg>
            </div>

            {showText && (
                <div className="flex flex-col leading-none">
                    <span className="font-heading text-lg md:text-2xl tracking-tighter text-white">
                        Agen<span style={{ color: accentColor }}>X</span>
                    </span>
                    <span className="text-[7px] md:text-[9px] uppercase tracking-[0.1em] text-text-secondary opacity-70 font-mono">
                        O sistema que faz seu negócio crescer
                    </span>
                </div>
            )}
        </div>
    );
};
