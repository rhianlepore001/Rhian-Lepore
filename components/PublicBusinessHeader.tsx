import React, { useRef } from 'react';
import { Instagram, Phone, MapPin, Star, Scissors, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';

interface PublicBusinessHeaderProps {
    businessName: string;
    logoUrl?: string | null;
    coverPhotoUrl?: string | null;
    instagramHandle?: string | null;
    phone?: string;
    address?: string | null;
    googleRating?: number;
    totalReviews?: number;
    isBeauty?: boolean;
    userType?: string;
    gallery?: { id: string; image_url: string }[];
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
    isBeauty,
    userType,
    gallery = [],
}) => {
    const galleryRef = useRef<HTMLDivElement>(null);
    const borderRadius = isBeauty ? 'rounded-2xl' : 'rounded-none';

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
        <div className={`relative w-full overflow-hidden ${isBeauty ? 'bg-[#E2E1DA]' : 'bg-[#050505]'}`}>
            {/* Cover / Hero — Mobile-first height */}
            <div className="relative h-52 sm:h-64 md:h-96 w-full overflow-hidden">
                {coverPhotoUrl ? (
                    <img
                        src={coverPhotoUrl}
                        alt={businessName}
                        className="w-full h-full object-cover scale-105 transition-transform duration-[8000ms] hover:scale-100"
                    />
                ) : (
                    <div className={`w-full h-full ${isBeauty
                        ? 'bg-gradient-to-br from-stone-200 via-stone-100 to-stone-300'
                        : 'bg-gradient-to-br from-neutral-900 via-neutral-800 to-black'
                        }`}>
                        {/* Padrão decorativo no fallback */}
                        <div className="absolute inset-0 opacity-10"
                            style={{
                                backgroundImage: `repeating-linear-gradient(45deg, ${isBeauty ? '#1D1D1F' : '#C29B40'} 0, ${isBeauty ? '#1D1D1F' : '#C29B40'} 1px, transparent 0, transparent 50%)`,
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

                {/* Badge de segmento no topo */}
                <div className="absolute top-5 left-5 z-20">
                    <div className={`flex items-center gap-2 px-4 py-1.5 backdrop-blur-xl rounded-full border text-[10px] font-bold uppercase tracking-[0.18em] ${isBeauty
                        ? 'bg-white/80 border-stone-200 text-stone-700'
                        : 'bg-black/50 border-white/10 text-white/70'
                        }`}>
                        <SegmentIcon className="w-3 h-3" />
                        {segmentLabel}
                    </div>
                </div>
            </div>

            {/* Info Section */}
            <div className="container mx-auto px-4 md:px-8 -mt-20 sm:-mt-24 md:-mt-36 relative z-20 pb-4 md:pb-10">
                <div className="flex flex-col md:flex-row items-end gap-5 md:gap-12">

                    {/* Logo */}
                    <div className="relative group flex-shrink-0">
                        <div className={`w-28 h-28 md:w-44 md:h-44 ${borderRadius} overflow-hidden ${isBeauty
                            ? 'bg-white shadow-[0_20px_60px_-10px_rgba(0,0,0,0.2)] border-4 border-white'
                            : 'bg-obsidian-card border-4 border-black shadow-[8px_8px_0px_0px_#000]'
                            } transition-all duration-700 group-hover:scale-105 group-hover:-rotate-1 relative`}>
                            {logoUrl ? (
                                <img src={logoUrl} alt={businessName} className="w-full h-full object-cover" />
                            ) : (
                                <div className={`w-full h-full flex items-center justify-center ${isBeauty
                                    ? 'bg-gradient-to-br from-stone-100 to-stone-200'
                                    : 'bg-gradient-to-br from-neutral-900 to-neutral-800'
                                    }`}>
                                    <span className={`font-black text-5xl md:text-6xl ${isBeauty ? 'text-stone-400' : 'text-neutral-600'}`}
                                        style={{ fontFamily: 'Chivo, sans-serif' }}>
                                        {businessName.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                            )}
                        </div>
                        {/* Fragmento decorativo atrás do logo */}
                        {!isBeauty && (
                            <div className="absolute -bottom-3 -right-3 w-full h-full bg-accent-gold opacity-20 -z-10 rotate-2 transition-transform group-hover:rotate-4 rounded-none" />
                        )}
                    </div>

                    {/* Informações */}
                    <div className="flex-1 flex flex-col items-start pb-0 md:pb-4 w-full min-w-0">
                        {/* Nome do estabelecimento */}
                        <h1 className={`${isBeauty
                            ? 'font-light tracking-tight text-stone-800'
                            : 'text-white tracking-tighter'
                            } text-3xl md:text-5xl lg:text-6xl mb-2 leading-none`}
                            style={!isBeauty ? { fontFamily: 'Chivo, sans-serif', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.03em' } : {}}>
                            {businessName}
                        </h1>

                        {/* Rating badge */}
                        {googleRating && googleRating > 0 ? (
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 mb-3 rounded-full border ${isBeauty
                                ? 'bg-white/80 border-stone-100 text-stone-800 shadow-sm'
                                : 'bg-black/40 border-white/10 text-white'
                                } backdrop-blur-xl`}>
                                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                                <span className="text-sm font-black tracking-tight">{googleRating.toFixed(1)}</span>
                                <div className="w-px h-3 bg-current opacity-20" />
                                <span className="text-[10px] uppercase font-bold tracking-[0.1em] opacity-60">
                                    {totalReviews} avaliações
                                </span>
                            </div>
                        ) : null}

                        {/* Endereço (se disponível) */}
                        {address && (
                            <p className={`text-xs font-medium mb-3 flex items-center gap-1.5 ${isBeauty ? 'text-stone-400' : 'text-white/40'}`}>
                                <MapPin className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate max-w-xs">{address}</span>
                            </p>
                        )}

                        {/* Links sociais */}
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                            {instagramLink && (
                                <a href={instagramLink} target="_blank" rel="noopener noreferrer"
                                    className={`flex items-center gap-2 px-4 py-2 ${isBeauty ? 'rounded-xl' : 'rounded-none'} border transition-all duration-300 group ${isBeauty
                                        ? 'bg-white border-stone-200 text-stone-600 hover:bg-gradient-to-tr hover:from-purple-500 hover:to-pink-500 hover:text-white hover:border-transparent'
                                        : 'bg-white/5 border-white/10 text-white/60 hover:bg-pink-500/20 hover:border-pink-400/30 hover:text-pink-400'
                                        }`}>
                                    <Instagram className="w-4 h-4" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:block">Instagram</span>
                                </a>
                            )}
                            {whatsappLink && (
                                <a href={whatsappLink} target="_blank" rel="noopener noreferrer"
                                    className={`flex items-center gap-2 px-4 py-2 ${isBeauty ? 'rounded-xl' : 'rounded-none'} border transition-all duration-300 group ${isBeauty
                                        ? 'bg-white border-stone-200 text-stone-600 hover:bg-green-500 hover:text-white hover:border-transparent'
                                        : 'bg-white/5 border-white/10 text-white/60 hover:bg-green-500/20 hover:border-green-400/30 hover:text-green-400'
                                        }`}>
                                    <Phone className="w-4 h-4" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:block">WhatsApp</span>
                                </a>
                            )}
                            {mapsLink && (
                                <a href={mapsLink} target="_blank" rel="noopener noreferrer"
                                    className={`flex items-center gap-2 px-4 py-2 ${isBeauty ? 'rounded-xl' : 'rounded-none'} border transition-all duration-300 group ${isBeauty
                                        ? 'bg-white border-stone-200 text-stone-600 hover:bg-blue-500 hover:text-white hover:border-transparent'
                                        : 'bg-white/5 border-white/10 text-white/60 hover:bg-blue-500/20 hover:border-blue-400/30 hover:text-blue-400'
                                        }`}>
                                    <MapPin className="w-4 h-4" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:block">Como chegar</span>
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Galeria de Fotos — visível em todos os tamanhos */}
            {gallery.length > 0 && (
                <div className={`relative border-t ${isBeauty ? 'border-stone-200' : 'border-white/5'} pt-0`}>
                    {/* Setas de navegação */}
                    <button
                        onClick={() => scrollGallery('left')}
                        className={`absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center shadow-lg transition-all ${isBeauty
                            ? 'bg-white border border-stone-200 text-stone-700 rounded-full hover:bg-stone-100'
                            : 'bg-black/80 border border-white/10 text-white rounded-none hover:bg-accent-gold hover:text-black'
                            }`}>
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => scrollGallery('right')}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center shadow-lg transition-all ${isBeauty
                            ? 'bg-white border border-stone-200 text-stone-700 rounded-full hover:bg-stone-100'
                            : 'bg-black/80 border border-white/10 text-white rounded-none hover:bg-accent-gold hover:text-black'
                            }`}>
                        <ChevronRight className="w-4 h-4" />
                    </button>

                    <div
                        ref={galleryRef}
                        className="flex gap-1.5 overflow-x-auto scrollbar-hide px-4 py-3"
                        style={{ scrollSnapType: 'x mandatory' }}>
                        {gallery.map((item) => (
                            <div
                                key={item.id}
                                className={`flex-shrink-0 w-[140px] md:w-[200px] h-[90px] md:h-[130px] overflow-hidden ${isBeauty ? 'rounded-lg' : 'rounded-none'} cursor-pointer group`}
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
                    <div className={`absolute top-4 right-12 text-[9px] font-bold uppercase tracking-[0.2em] ${isBeauty ? 'text-stone-400' : 'text-white/30'}`}>
                        Portfólio
                    </div>
                </div>
            )}

            {/* Divisor final */}
            <div className={`h-px w-full ${isBeauty
                ? 'bg-gradient-to-r from-transparent via-stone-300 to-transparent'
                : 'bg-gradient-to-r from-transparent via-white/5 to-transparent'
                }`} />
        </div>
    );
};
