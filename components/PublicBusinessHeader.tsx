import React, { useRef } from 'react';
import { Instagram, Phone, MapPin, Star, Scissors, Sparkles, ChevronLeft, ChevronRight, Sun, Moon } from 'lucide-react';
import { useBrutalTheme, type ThemeVariant } from '../hooks/useBrutalTheme';
import { useTheme } from '../contexts/ThemeContext';
import { getBusinessCopy, resolveBusinessTheme } from '../utils/businessCopy';
import { publicRatingBadge } from '../utils/publicRating';
import { buildWhatsAppLink, type WhatsAppRegion } from '../utils/whatsappTemplates';

interface PublicBusinessHeaderProps {
    businessName: string;
    logoUrl?: string | null;
    coverPhotoUrl?: string | null;
    instagramHandle?: string | null;
    phone?: string;
    region?: WhatsAppRegion;
    address?: string | null;
    googleRating?: number;
    totalReviews?: number;
    userType?: string;
    gallery?: { id: string; image_url: string }[];
    clientSession?: { name: string; photo_url?: string | null } | null;
    businessSlug?: string;
    showThemeToggle?: boolean;
}

export const PublicBusinessHeader: React.FC<PublicBusinessHeaderProps> = ({
    businessName,
    logoUrl,
    coverPhotoUrl,
    instagramHandle,
    phone,
    region = 'BR',
    address,
    googleRating,
    totalReviews,
    userType,
    gallery = [],
    clientSession,
    businessSlug,
    showThemeToggle = true,
}) => {
    const galleryRef = useRef<HTMLDivElement>(null);
    const isBeauty = userType === 'beauty';
    const themeOverride: ThemeVariant = isBeauty ? 'beauty' : 'barber';
    const { colors, accent, font, shadow } = useBrutalTheme({ override: themeOverride });
    const { mode, toggleMode } = useTheme();

    // Links externos
    const whatsappLink = phone ? buildWhatsAppLink(phone, region) : null;
    const instagramLink = instagramHandle
        ? `https://instagram.com/${instagramHandle.replace('@', '')}`
        : null;
    const mapsLink = address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address + ' ' + businessName)}`
        : null;

    // Badge de segmento
    const rating = publicRatingBadge(googleRating, totalReviews);

    const segmentLabel = getBusinessCopy(resolveBusinessTheme(userType)).segmentLabel;
    const SegmentIcon = isBeauty ? Sparkles : Scissors;

    const scrollGallery = (dir: 'left' | 'right') => {
        if (!galleryRef.current) return;
        galleryRef.current.scrollBy({ left: dir === 'right' ? 260 : -260, behavior: 'smooth' });
    };

    return (
        <div className={`relative w-full overflow-hidden ${colors.bg}`}>
            {/* Cover / Hero — Mobile-first height */}
            <div className="relative h-[clamp(9rem,23svh,12rem)] md:h-[34vh] md:min-h-[230px] w-full overflow-hidden">
                {coverPhotoUrl ? (
                    <img
                        src={coverPhotoUrl}
                        decoding="async"
                        alt={businessName}
                        className="w-full h-full object-cover object-center"
                    />
                ) : (
                    <div className={`w-full h-full ${isBeauty
                        ? 'bg-gradient-to-br from-[var(--color-bg)] via-[var(--color-card)] to-[var(--color-surface)]'
                        : 'bg-gradient-to-br from-neutral-900 via-neutral-800 to-black'
                        }`}>
                    </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/55" />

                {/* Badge de segmento + toggle dark/light */}
                <div className="absolute top-[calc(0.75rem+var(--safe-top))] left-3 sm:left-5 z-20 flex items-center gap-2">
                    <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-full border text-xs font-semibold ${colors.card} ${colors.border} ${colors.textSecondary}`}>
                        <SegmentIcon className="w-3 h-3" />
                        {segmentLabel}
                    </div>
                    {showThemeToggle && <button
                        onClick={toggleMode}
                        aria-label={mode === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
                        title={mode === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
                        className={`inline-flex h-11 w-11 items-center justify-center rounded-full border transition-colors ${colors.card} ${colors.border} ${colors.text} hover:brightness-110`}
                    >
                        <span
                            style={{
                                display: 'block',
                                transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.2s',
                                transform: mode === 'dark' ? 'rotate(0deg)' : 'rotate(180deg)',
                            }}
                        >
                            {mode === 'dark'
                                ? <Moon className="w-4 h-4" />
                                : <Sun className="w-4 h-4" />}
                        </span>
                    </button>}
                </div>

                {/* Sessão do Cliente (Canto Superior Direito) */}
                {clientSession && businessSlug && (
                    <div className="fixed top-[calc(0.75rem+var(--safe-top))] right-3 sm:right-5 z-50">
                        <a href={`/#/minha-area/${businessSlug}`} aria-label="Abrir Minha Área"
                            className={`group flex min-h-11 items-center gap-1.5 px-2 rounded-full border transition-colors ${colors.card} ${colors.border} cursor-pointer hover:brightness-110`}>
                            <div className="hidden sm:flex flex-col items-end">
                                <span className={`text-xs uppercase font-black tracking-widest ${colors.textMuted}`}>Sessão Ativa</span>
                                <span className={`text-xs font-bold truncate max-w-[100px] ${colors.text}`}>{clientSession.name.split(' ')[0]}</span>
                            </div>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center overflow-hidden border ${colors.surface} ${colors.border} ${colors.text}`}>
                                {clientSession.photo_url ? (
                                    <img src={clientSession.photo_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="font-bold text-sm tracking-tighter">{clientSession.name.charAt(0).toUpperCase()}</span>
                                )}
                            </div>
                        </a>
                    </div>
                )}
            </div>

            {/* Info Section */}
            <div className="container mx-auto px-4 md:px-8 -mt-10 sm:-mt-12 md:-mt-20 relative z-20 pb-4 md:pb-6">
                <div className="flex flex-col md:flex-row items-start md:items-end gap-3 md:gap-6">

                    {/* Logo */}
                    <div className="relative group flex-shrink-0">
                        <div className={`w-20 h-20 md:w-28 md:h-28 rounded-2xl overflow-hidden ${colors.card} ${colors.border} border-2 ${shadow.elevated} relative`}>
                            {logoUrl ? (
                                <img src={logoUrl} alt={businessName} className="w-full h-full object-cover" />
                            ) : (
                                <div className={`w-full h-full flex items-center justify-center ${colors.surface}`}>
                                    <span className={`font-black text-5xl md:text-6xl ${colors.textMuted}`}
                                        style={{ fontFamily: 'Chivo, sans-serif' }}>
                                        {businessName.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Informações */}
                    <div className="flex-1 flex flex-col items-start pb-0 md:pb-4 w-full min-w-0">
                        {/* Nome do estabelecimento */}
                        <h1 className={`${font.heading} ${colors.text} text-[clamp(1.625rem,6vw,3rem)] mb-1.5 leading-tight font-bold tracking-tight text-balance break-words`}>
                            {businessName}
                        </h1>

                        {/* Rating badge: só com avaliações reais (sem nota inventada para negócio novo) */}
                        {rating ? (
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 mb-3 rounded-full border ${colors.card} ${colors.border} ${colors.text} backdrop-blur-xl`}>
                                <Star className="w-3.5 h-3.5 text-[var(--color-warning)] fill-amber-400" />
                                <span className="text-sm font-black tracking-tight">{rating.value}</span>
                                <div className="w-px h-3 bg-current opacity-20" />
                                <span className="text-xs uppercase font-medium">
                                    {rating.countLabel}
                                </span>
                            </div>
                        ) : null}

                        {/* Endereço (se disponível) */}
                        {address && (
                            <p className={`text-xs font-medium mb-3 flex items-center gap-1.5 ${colors.textMuted}`}>
                                <MapPin className="w-3 h-3 flex-shrink-0" />
                                <span className="break-words max-w-full">{address}</span>
                            </p>
                        )}

                        {/* Links sociais */}
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            {instagramLink && (
                                <a href={instagramLink} target="_blank" rel="noopener noreferrer"
                                    className={`inline-flex min-h-11 items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-colors ${colors.card} ${colors.border} ${colors.textSecondary} hover:bg-[var(--color-card-hover)] hover:text-theme-text`}>
                                    <Instagram className="w-4 h-4" />
                                    <span className="text-xs font-semibold">Instagram</span>
                                </a>
                            )}
                            {whatsappLink && (
                                <a href={whatsappLink} target="_blank" rel="noopener noreferrer"
                                    className={`inline-flex min-h-11 items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-colors ${colors.card} ${colors.border} ${colors.textSecondary} hover:bg-[var(--color-card-hover)] hover:text-theme-text`}>
                                    <Phone className="w-4 h-4" />
                                    <span className="text-xs font-semibold">WhatsApp</span>
                                </a>
                            )}
                            {mapsLink && (
                                <a href={mapsLink} target="_blank" rel="noopener noreferrer"
                                    className={`inline-flex min-h-11 items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-colors ${colors.card} ${colors.border} ${colors.textSecondary} hover:bg-[var(--color-card-hover)] hover:text-theme-text`}>
                                    <MapPin className="w-4 h-4" />
                                    <span className="text-xs font-semibold">Como chegar</span>
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Galeria de Fotos — visível em todos os tamanhos */}
            {gallery.length > 0 && (
                <div className={`border-t ${colors.divider}`}>
                    <div className="px-4 pt-3 pb-1 flex items-center justify-between">
                        <span
                            data-testid="public-gallery-heading"
                            className={`text-xs font-bold uppercase tracking-[0.2em] ${colors.textSecondary}`}
                        >
                            Portfólio
                        </span>
                    </div>

                    <div className="relative">
                        {/* Setas de navegação */}
                        <button
                            type="button"
                            aria-label="Fotos anteriores do portfólio"
                            onClick={() => scrollGallery('left')}
                            className={`absolute left-2 top-1/2 -translate-y-1/2 z-10 w-11 h-11 flex items-center justify-center shadow-[var(--elevation-1)] transition-colors ${colors.card} ${colors.border} ${colors.text} rounded-full hover:brightness-110`}>
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            aria-label="Próximas fotos do portfólio"
                            onClick={() => scrollGallery('right')}
                            className={`absolute right-2 top-1/2 -translate-y-1/2 z-10 w-11 h-11 flex items-center justify-center shadow-[var(--elevation-1)] transition-colors ${colors.card} ${colors.border} ${colors.text} rounded-full hover:brightness-110`}>
                            <ChevronRight className="w-4 h-4" />
                        </button>

                        <div
                            ref={galleryRef}
                            data-testid="public-gallery-track"
                            className="flex gap-1.5 overflow-x-auto scrollbar-hide px-4 pt-1 pb-3"
                            style={{ scrollSnapType: 'x mandatory' }}>
                            {gallery.map((item) => (
                                <div
                                    key={item.id}
                                    className={`flex-shrink-0 w-[140px] md:w-[200px] h-[90px] md:h-[130px] overflow-hidden rounded-lg `}
                                    style={{ scrollSnapAlign: 'start' }}>
                                    <img
                                        src={item.image_url}
                                        loading="lazy"
                                        decoding="async"
                                        width={400}
                                        height={400}
                                        alt="Portfólio"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Divisor final */}
            <div className={`h-px w-full bg-gradient-to-r from-transparent ${isBeauty ? 'via-beauty-neon/20' : 'via-accent-gold/20'} to-transparent`} />
        </div>
    );
};
