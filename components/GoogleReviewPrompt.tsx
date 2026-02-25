
import React from 'react';
import { Star, ExternalLink, ThumbsUp } from 'lucide-react';
import { BrutalButton } from './BrutalButton';

interface GoogleReviewPromptProps {
    businessName: string;
    googlePlaceId?: string | null;
    isBeauty?: boolean;
}

export const GoogleReviewPrompt: React.FC<GoogleReviewPromptProps> = ({
    businessName,
    googlePlaceId,
    isBeauty
}) => {
    // Construct Google Review URL
    // If we have a Place ID, we can use the direct review link
    // Otherwise, we search for the business name
    const reviewUrl = googlePlaceId
        ? `https://search.google.com/local/writereview?placeid=${googlePlaceId}`
        : `https://www.google.com/search?q=${encodeURIComponent(businessName + ' avaliar')}`;

    const accentColor = isBeauty ? 'beauty-neon' : 'accent-gold';

    return (
        <div className={`
            mt-8 p-6 md:p-8 rounded-3xl border-2 transition-all animate-in zoom-in duration-500
            ${isBeauty
                ? 'bg-beauty-card/50 border-beauty-neon/30 shadow-neon'
                : 'bg-neutral-900 border-accent-gold shadow-heavy'}
        `}>
            <div className="flex flex-col items-center text-center space-y-4">
                <div className={`p-4 rounded-full bg-white/5 border border-white/10 mb-2`}>
                    <ThumbsUp className={`w-10 h-10 text-${accentColor}`} />
                </div>

                <h3 className="text-2xl font-bold text-white uppercase tracking-tight">Sua opinião vale muito!</h3>
                <p className="text-neutral-400 max-w-sm">
                    Ficamos felizes com seu agendamento em <span className="text-white font-bold">{businessName}</span>.
                    Pode nos deixar uma avaliação no Google? Isso nos ajuda muito!
                </p>

                <div className="flex gap-1 py-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                    ))}
                </div>

                <BrutalButton
                    variant="primary"
                    size="lg"
                    className="w-full flex items-center justify-center gap-2 mt-4"
                    onClick={() => window.open(reviewUrl, '_blank')}
                >
                    Avaliar no Google
                    <ExternalLink className="w-5 h-5" />
                </BrutalButton>
            </div>
        </div>
    );
};
