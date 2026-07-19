import React from 'react';
import { Star, ExternalLink, ThumbsUp } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { useBrutalTheme, type ThemeVariant } from '../hooks/useBrutalTheme';

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
    const { colors, accent } = useBrutalTheme({ override: isBeauty ? 'beauty' as ThemeVariant : 'barber' as ThemeVariant });

    const reviewUrl = googlePlaceId
        ? `https://search.google.com/local/writereview?placeid=${googlePlaceId}`
        : `https://www.google.com/search?q=${encodeURIComponent(businessName + ' avaliar')}`;

    return (
        <Card
            variant="elevated"
            className="mt-8 animate-in zoom-in duration-500"
        >
            <div className="flex flex-col items-center text-center space-y-4">
                <div className={`p-4 rounded-full ${accent.bgDim} ${accent.border} border mb-2`}>
                    <ThumbsUp className={`w-10 h-10 ${accent.text}`} />
                </div>

                <h3 className={`text-2xl font-bold ${colors.text} uppercase tracking-tight`}>Sua opinião vale muito!</h3>
                <p className={`${colors.textSecondary} max-w-sm`}>
                    Ficamos felizes com seu agendamento em <span className={`${colors.text} font-bold`}>{businessName}</span>.
                    Pode nos deixar uma avaliação no Google? Isso nos ajuda muito!
                </p>

                <div className="flex gap-1 py-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className="w-6 h-6 text-[var(--color-warning)] fill-[var(--color-warning)]" />
                    ))}
                </div>

                <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    className="mt-4"
                    iconRight={<ExternalLink className="w-5 h-5" />}
                    onClick={() => window.open(reviewUrl, '_blank')}
                >
                    Avaliar no Google
                </Button>
            </div>
        </Card>
    );
};
