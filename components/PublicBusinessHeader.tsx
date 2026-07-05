import React, { useRef } from 'react';
import { Instagram, Phone, MapPin, Star, Scissors, Sparkles, ChevronLeft, ChevronRight, Sun, Moon } from 'lucide-react';
import { useBrutalTheme, type ThemeVariant } from '../hooks/useBrutalTheme';
import { useTheme } from '../contexts/ThemeContext';

interface PublicBusinessHeaderProps {
    businessName: string;
    logoUrl?: string | null;
    coverPhotoUrl?: string | null;
    instagramHandle?: string | null;
    phone?: string;
    address?: string | null;
    googleRating?: number;
    totalReviews?: number;
    userType?: string;
    gallery?: { id: string; image_url: string }[];
    clientSession?: { name: string; photo_url?: string | null } | null;
    businessSlug?: string;
}

export const PublicBusinessHeader: React.FC<PublicBusinessHeaderProps> = ({
    businessName,
    logoUrl,
    coverPhotoUrl,
    instagramHandle,
    phone,
    address,
    googleRating,
    totalReviews,
    userType,
    gallery = [],
    clientSession,
    businessSlug,
}) => {
    const galleryRef = useRef<HTMLDivElement>(null);
    const isBeauty = userType === 'beauty';
    const themeOverride: ThemeVariant = isBeauty ? 'beauty' : 'barber';
    const { colors, accent, font, shadow } = useBrutalTheme({ override: themeOverride });
    const { mode, toggleMode } = useTheme();

    // Links externos
    const whatsappLink = phone
        ? `https://wa.me/${phone.replace(/\D/g, '')}`
        : null;
    const instagramLink = instagramHandle
        ? `https://instagram.com/${instagramHandle.replace('@', '')}`
        : null;
    const mapsLink = address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address + ' ' + businessName)}`
        : null;

    // Badge de segmento
    const segmentLabel = isBeauty ? 'Salão de Beleza' : 'Barbearia';
    const SegmentIcon = isBeauty ? Sparkles : Scissors;

    const scrollGallery = (dir: 'left' | 'right') => {
        if (!galleryRef.current) return;
        galleryRef.current.scrollBy({ left: dir === 'right' ? 260 : -260, behavior: 'smooth' });
    };

    return (
        <div className={`relative w-full overflow-hidden ${colors.bg}`}>
            {/* Cover / Hero — Mobile-first height */}
            <div className="relative h-[35vh] min-h-[220px] md:h-[70vh] w-full overflow-hidden">
                {coverPhotoUrl ? (
                    <img
                        src={coverPhotoUrl}
                        alt={businessName}
                        className="w-full h-full object-cover scale-105 transition-transform duration-[8000ms] hover:scale-100"
                    />
                ) : (
                    <div className={`w-full h-full ${isBeauty
                        ? 'bg-gradient-to-br from-beauty-dark via-beauty-card to-black'
                        : 'bg-gradient-to-br from-neutral-900 via-neutral-800 to-black'
                        }`}>
                        {/* Padrão decorativo no fallback */}
                        <div className="absolute inset-0 opacity-10"
                            style={{
                                backgroundImage: `repeating-linear-gradient(45deg, ${isBeauty ? '#A78BFA' : '#C29B40'} 0, ${isBeauty ? '#A78BFA' : '#C29B40'} 1px, transparent 0, transparent 50%)`,
                                backgroundSize: '20px 20px'
                            }} />
                    </div>
                )}

                {/* Gradiente triplo */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/20 to-black/85" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent hidden md:block" />

                {/* Nome gigante no fundo (detalhe brutalista) */}
                <div className="absolute -bottom-4 -left-4 opacity-[0.06] select-none hidden lg:block pointer-events-none overflow-hidden">
                    <span className="font-black text-white whitespace-nowrap"
                        style={{ fontSize: '9rem', fontFamily: 'Chivo, sans-serif', textTransform: 'uppercase', letterSpacing: '-0.04em', lineHeight: 1 }}>
                        {businessName}
                    </span>
                </div>

                {/* Badge de segmento + toggle dark/light */}
                <div className="absolute top-5 left-5 z-20 flex items-center gap-2">
                    <div className={`flex items-center gap-2 px-4 py-1.5 backdrop-blur-xl rounded-full border text-xs font-bold uppercase tracking-[0.18em] ${colors.card} ${colors.border} ${colors.textSecondary}`}>
                        <SegmentIcon className="w-3 h-3" />
                        {segmentLabel}
                    </div>
                    <button
                        onClick={toggleMode}
                        aria-label={mode === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
                        title={mode === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
                        className={`p-2 backdrop-blur-xl rounded-full border transition-all duration-300 ${colors.card} ${colors.border} ${colors.text} hover:brightness-110`}
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
                    </button>
                </div>

                {/* Sessão do Cliente (Canto Superior Direito) */}
                {clientSession && businessSlug && (
                    <div className="fixed top-5 right-5 z-50">
                        <a href={`/#/minha-area/${businessSlug}`}
                            className={`group flex items-center gap-3 px-4 py-2 backdrop-blur-xl rounded-full border transition-all shadow-lg ${colors.card} ${colors.border} cursor-pointer hover:brightness-110`}>
                            <div className="flex flex-col items-end">
                                <span className={`text-xs uppercase font-black tracking-widest ${colors.textMuted}`}>Sessão Ativa</span>
                                <span className={`text-xs font-bold truncate max-w-[100px] ${colors.text}`}>{clientSession.name.split(' ')[0]}</span>
                            </div>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center overflow-hidden border ${colors.surface} ${colors.border} ${colors.text}`}>
                                {clientSession.photo_url ? (
                                    <img src={clientSession.photo_url} alt="User" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="font-bold text-sm tracking-tighter">{clientSession.name.charAt(0).toUpperCase()}</span>
                                )}
                            </div>
                        </a>
                    </div>
                )}
            </div>

            {/* Info Section */}
            <div className="container mx-auto px-4 md:px-8 -mt-20 sm:-mt-24 md:-mt-36 relative z-20 pb-4 md:pb-10">
                <div className="flex flex-col md:flex-row items-end gap-5 md:gap-12">

                    {/* Logo */}
                    <div className="relative group flex-shrink-0">
                        <div className={`w-28 h-28 md:w-44 md:h-44 rounded-2xl overflow-hidden ${colors.card} ${colors.border} border-4 ${shadow.elevated} transition-all duration-700 group-hover:scale-105 group-hover:-rotate-1 relative`}>
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
                        {/* Fragmento decorativo atrás do logo */}
                        {!isBeauty && (
                            <div className={`absolute -bottom-3 -right-3 w-full h-full ${accent.bg} opacity-20 -z-10 rotate-2 transition-transform group-hover:rotate-4 rounded-none`} />
                        )}
                    </div>

                    {/* Informações */}
                    <div className="flex-1 flex flex-col items-start pb-0 md:pb-4 w-full min-w-0">
                        {/* Nome do estabelecimento */}
                        <h1 className={`${colors.text} text-3xl md:text-5xl lg:text-6xl mb-2 leading-none font-black tracking-tight`}
                            style={{ fontFamily: 'Chivo, sans-serif' }}>
                            {businessName}
                        </h1>

                        {/* Rating badge */}
                        {googleRating && googleRating > 0 ? (
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 mb-3 rounded-full border ${colors.card} ${colors.border} ${colors.text} backdrop-blur-xl`}>
                                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                <span className="text-sm font-black tracking-tight">{googleRating.toFixed(1)}</span>
                                <div className="w-px h-3 bg-current opacity-20" />
                                <span className="text-xs uppercase font-bold tracking-[0.1em] opacity-60">
                                    {totalReviews} avaliações
                                </span>
                            </div>
                        ) : null}

                        {/* Endereço (se disponível) */}
                        {address && (
                            <p className={`text-xs font-medium mb-3 flex items-center gap-1.5 ${colors.textMuted}`}>
                                <MapPin className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate max-w-full sm:max-w-xs">{address}</span>
                            </p>
                        )}

                        {/* Links sociais */}
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                            {instagramLink && (
                                <a href={instagramLink} target="_blank" rel="noopener noreferrer"
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-300 group ${colors.card} ${colors.border} ${colors.textSecondary} hover:bg-gradient-to-tr hover:from-purple-500 hover:to-pink-500 hover:text-white hover:border-transparent`}>
                                    <Instagram className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase tracking-widest hidden sm:block">Instagram</span>
                                </a>
                            )}
                            {whatsappLink && (
                                <a href={whatsappLink} target="_blank" rel="noopener noreferrer"
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-300 group ${colors.card} ${colors.border} ${colors.textSecondary} hover:bg-green-500 hover:text-white hover:border-transparent`}>
                                    <Phone className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase tracking-widest hidden sm:block">WhatsApp</span>
                                </a>
                            )}
                            {mapsLink && (
                                <a href={mapsLink} target="_blank" rel="noopener noreferrer"
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-300 group ${colors.card} ${colors.border} ${colors.textSecondary} hover:bg-blue-500 hover:text-white hover:border-transparent`}>
                                    <MapPin className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase tracking-widest hidden sm:block">Como chegar</span>
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Galeria de Fotos — visível em todos os tamanhos */}
            {gallery.length > 0 && (
                <div className={`relative border-t ${colors.divider} pt-0`}>
                    {/* Setas de navegação */}
                    <button
                        onClick={() => scrollGallery('left')}
                        className={`absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center shadow-lg transition-all ${colors.card} ${colors.border} ${colors.text} rounded-full hover:brightness-110`}>
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => scrollGallery('right')}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center shadow-lg transition-all ${colors.card} ${colors.border} ${colors.text} rounded-full hover:brightness-110`}>
                        <ChevronRight className="w-4 h-4" />
                    </button>

                    <div
                        ref={galleryRef}
                        className="flex gap-1.5 overflow-x-auto scrollbar-hide px-4 py-3"
                        style={{ scrollSnapType: 'x mandatory' }}>
                        {gallery.map((item) => (
                            <div
                                key={item.id}
                                className={`flex-shrink-0 w-[140px] md:w-[200px] h-[90px] md:h-[130px] overflow-hidden rounded-lg cursor-pointer group`}
                                style={{ scrollSnapAlign: 'start' }}>
                                <img
                                    src={item.image_url}
                                    alt="Portfólio"
                                    className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700"
                                />
                            </div>
                        ))}
                    </div>

                    {/* Label da galeria */}
                    <div className={`absolute top-4 right-12 text-xs font-bold uppercase tracking-[0.2em] ${colors.textMuted}`}>
                        Portfólio
                    </div>
                </div>
            )}

            {/* Divisor final */}
            <div className={`h-px w-full bg-gradient-to-r from-transparent ${isBeauty ? 'via-beauty-neon/20' : 'via-accent-gold/20'} to-transparent`} />
        </div>
    );
};
