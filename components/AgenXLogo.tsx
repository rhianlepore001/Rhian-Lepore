import React from 'react';

interface AgenXLogoProps {
    size?: number | string;
    className?: string;
    showText?: boolean;
    variant?: 'app' | 'dashboard';
    isBeauty?: boolean;
}

export const AgenXLogo: React.FC<AgenXLogoProps> = ({
    size = 40,
    className = '',
    showText = true,
    variant = 'dashboard',
    isBeauty = false,
}) => {
    const numSize = typeof size === 'string' ? parseInt(size, 10) : size;
    const isApp = variant === 'app';

    if (showText) {
        if (isApp) {
            // Variante app: usa imagem completa que já contém nome
            const height = numSize * 1.5;
            const width = height * 3.2;
            return (
                <div className={className}>
                    <img
                        src="/logo-agendix-app.png"
                        alt="AgendiX"
                        style={{
                            height,
                            width,
                            objectFit: 'contain',
                            display: 'block',
                        }}
                    />
                </div>
            );
        }

        // Variante dashboard: ícone + wordmark tipográfico
        const iconSize = Math.round(numSize * 1.4);
        const textSize = Math.round(numSize * 0.6);
        return (
            <div className={`flex items-center gap-2.5 ${className}`}>
                <img
                    src="/logo-agendix-icon.png"
                    alt=""
                    aria-hidden="true"
                    style={{
                        width: iconSize,
                        height: iconSize,
                        objectFit: 'contain',
                        display: 'block',
                        mixBlendMode: 'screen',
                    }}
                />
                <span
                    className="font-heading uppercase leading-none select-none text-foreground"
                    style={{ fontSize: textSize, letterSpacing: '-0.02em', fontWeight: 700 }}
                    aria-label="AgendiX"
                >
                    agendix
                </span>
            </div>
        );
    }

    // Só o símbolo (sem texto)
    return (
        <div className={className}>
            <img
                src="/logo-agendix-icon.png"
                alt="AgendiX"
                style={{
                    width: numSize,
                    height: numSize,
                    objectFit: 'contain',
                    display: 'block',
                    mixBlendMode: 'screen',
                }}
            />
        </div>
    );
};
