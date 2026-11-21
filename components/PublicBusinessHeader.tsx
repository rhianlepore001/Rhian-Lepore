import { useEffect, useRef, useState } from 'react';
import { Instagram, Phone, MapPin, Star, Scissors, Sparkles, ChevronLeft, ChevronRight, ChevronDown, Sun, Moon, User } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { publicRatingBadge } from '../utils/publicRating';
import { buildWhatsAppLink, type WhatsAppRegion } from '../utils/whatsappTemplates';

interface PublicBusinessHeaderProps {
    businessName: string;
    logoUrl?: string | null;
    coverPhotoUrl?: string | null;
    instagramHandle?: string | null;
    phone?: string | null;
    region?: WhatsAppRegion;
    address?: string | null;
    reviewSummary?: { average?: number | null; total: number };
    onOpenReviews?: () => void;
    userType?: string;
    gallery?: { id: string; image_url: string }[];
    clientSession?: { name: string; photo_url?: string | null } | null;
    businessSlug?: string;
    showThemeToggle?: boolean;
}

export function PublicBusinessHeader({
    businessName,
    logoUrl,
    coverPhotoUrl,
    instagramHandle,
    phone,
    region = 'BR',
    address,
    reviewSummary,
    onOpenReviews,
    userType,
    gallery = [],
    clientSession,
    businessSlug,
    showThemeToggle = true,
}: PublicBusinessHeaderProps) {
    const galleryRef = useRef<HTMLUListElement>(null);
    const [galleryScroll, setGalleryScroll] = useState({ previous: false, next: false });
    useEffect(() => {
        const strip = galleryRef.current;
        if (!strip) return;
        const update = () => setGalleryScroll({
            previous: strip.scrollLeft > 1,
            next: strip.clientWidth > 0 && strip.scrollLeft + strip.clientWidth < strip.scrollWidth - 1,
        });
        const resize = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
        resize?.observe(strip);
        strip.addEventListener('scroll', update, { passive: true });
        update();
        return () => {
            strip.removeEventListener('scroll', update);
            resize?.disconnect();
        };
    }, [gallery.length]);
    const { mode, toggleMode } = useTheme();
    const SegmentIcon = userType === 'beauty' ? Sparkles : Scissors;
    const rating = publicRatingBadge(reviewSummary?.average, reviewSummary?.total);
    const links = [
        { label: 'WhatsApp', icon: Phone, url: phone && buildWhatsAppLink(phone, region) },
        { label: 'Instagram', icon: Instagram, url: instagramHandle && `https://instagram.com/${instagramHandle.replace('@', '')}` },
        { label: 'Como chegar', icon: MapPin, url: address && `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${address} ${businessName}`)}` },
    ];

    return (
        <header className="relative z-10 mx-auto w-full max-w-5xl px-3 pt-3 md:px-6 md:pt-6">
            <div className="overflow-hidden rounded-2xl border border-theme-border bg-theme-card sm:rounded-3xl">
                {coverPhotoUrl && (
                    <img
                        src={coverPhotoUrl}
                        alt=""
                        fetchPriority="high"
                        className="h-28 w-full object-cover sm:h-40 lg:h-48"
                    />
                )}
                <div className="space-y-2 p-3.5 sm:space-y-3 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                            {logoUrl ? (
                                <img src={logoUrl} alt="" className="size-12 shrink-0 rounded-xl object-cover sm:size-16" />
                            ) : (
                                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-theme-surface text-theme-accent sm:size-16">
                                    <SegmentIcon className="size-6 sm:size-7" aria-hidden="true" />
                                </span>
                            )}
                            <div className="min-w-0">
                                <h1 className="break-words text-xl font-bold leading-tight tracking-tight text-theme-text sm:text-3xl">
                                    {businessName}
                                </h1>
                                {onOpenReviews && (
                                    <button
                                        type="button"
                                        onClick={onOpenReviews}
                                        aria-haspopup="dialog"
                                        className="flex min-h-11 flex-wrap items-center gap-x-1.5 rounded-md text-left text-sm text-theme-textSecondary hover:text-theme-text hover:underline"
                                    >
                                        <Star className="size-4 shrink-0 text-theme-accent" fill={rating ? 'currentColor' : 'none'} aria-hidden="true" />
                                        {rating ? (
                                            <>
                                                <span className="font-semibold text-theme-text">{rating.value}<span className="sr-only"> de 5</span></span>
                                                <span>{rating.countLabel}</span>
                                            </>
                                        ) : 'Avaliações de clientes'}
                                    </button>
                                )}
                            </div>
                        </div>
                        {showThemeToggle && (
                            <button
                                type="button"
                                onClick={toggleMode}
                                aria-label={mode === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
                                className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-theme-border text-theme-textSecondary hover:bg-theme-surface"
                            >
                                {mode === 'dark' ? <Moon className="size-4" aria-hidden="true" /> : <Sun className="size-4" aria-hidden="true" />}
                            </button>
                        )}
                    </div>
                    {address && <p className="text-sm leading-snug text-theme-textSecondary">{address}</p>}
                    {(businessSlug || links.some(link => link.url)) && (
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                            {businessSlug && (
                                <a
                                    href={`/#/minha-area/${businessSlug}`}
                                    className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-theme-border px-2 text-sm font-semibold text-theme-text hover:bg-theme-surface sm:px-3"
                                >
                                    {clientSession?.photo_url
                                        ? <img src={clientSession.photo_url} alt="" className="size-5 rounded-full object-cover" />
                                        : <User className="size-4" aria-hidden="true" />}
                                    Minha Área
                                </a>
                            )}
                            {links.map(({ label, icon: Icon, url }) => url && (
                                <a
                                    key={label}
                                    href={url}
                                    aria-label={label}
                                    title={label}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl border border-theme-border text-sm font-medium text-theme-textSecondary hover:bg-theme-surface hover:text-theme-text sm:px-3"
                                >
                                    <Icon className="size-4" aria-hidden="true" />
                                    <span className="hidden sm:inline">{label}</span>
                                </a>
                            ))}
                        </div>
                    )}
                </div>

                {gallery.length > 0 && (
                    <details open className="group border-t border-theme-border px-3.5 sm:px-5">
                        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-md text-sm font-semibold text-theme-text [&::-webkit-details-marker]:hidden">
                            <span data-testid="public-gallery-heading">Fotos do espaço</span>
                            <span className="flex items-center gap-1.5 text-sm font-medium text-theme-textSecondary">
                                <span className="group-open:hidden">Mostrar</span>
                                <span className="hidden group-open:inline">Ocultar</span>
                                <ChevronDown className="size-4 group-open:rotate-180" aria-hidden="true" />
                            </span>
                        </summary>
                        <div className="relative mb-3">
                            <ul
                                ref={galleryRef}
                                data-testid="public-gallery-track"
                                tabIndex={galleryScroll.next || galleryScroll.previous ? 0 : undefined}
                                className="flex snap-x gap-2 overflow-x-auto rounded-xl scrollbar-hide"
                                aria-label="Fotos do portfólio"
                            >
                                {gallery.map((item, index) => (
                                    <li key={item.id} className="h-20 w-34 shrink-0 snap-start overflow-hidden rounded-lg sm:h-28 sm:w-44">
                                        <img src={item.image_url} alt={`Foto ${index + 1} do espaço de ${businessName}`} loading="lazy" decoding="async" className="size-full object-cover" />
                                    </li>
                                ))}
                            </ul>
                            {(galleryScroll.next || galleryScroll.previous) && (
                                <div className="pointer-events-none absolute inset-x-1 top-1/2 flex -translate-y-1/2 justify-between">
                                    <button
                                        type="button"
                                        aria-label="Fotos anteriores"
                                        disabled={!galleryScroll.previous}
                                        onClick={() => galleryRef.current?.scrollBy({ left: -(galleryRef.current.clientWidth - 54) })}
                                        className="pointer-events-auto flex size-11 items-center justify-center rounded-full border border-theme-border bg-theme-card text-theme-text disabled:invisible"
                                    >
                                        <ChevronLeft className="size-5" aria-hidden="true" />
                                    </button>
                                    <button
                                        type="button"
                                        aria-label="Próximas fotos"
                                        disabled={!galleryScroll.next}
                                        onClick={() => galleryRef.current?.scrollBy({ left: galleryRef.current.clientWidth - 54 })}
                                        className="pointer-events-auto flex size-11 items-center justify-center rounded-full border border-theme-border bg-theme-card text-theme-text disabled:invisible"
                                    >
                                        <ChevronRight className="size-5" aria-hidden="true" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </details>
                )}
            </div>
        </header>
    );
}
