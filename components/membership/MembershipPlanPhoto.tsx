import { useState } from 'react';
import { Crown } from 'lucide-react';
import { getPublicUrl } from '@/lib/supabaseStorage';
import { MEMBERSHIP_PHOTO_BUCKET } from '@/services/memberships';

export function MembershipPlanPhoto({ path, className = '' }: { path: string; className?: string }) {
    const [failedPath, setFailedPath] = useState<string | null>(null);

    return (
        <span className={`relative block overflow-hidden bg-theme-surface ${className}`}>
            <span className="absolute inset-0 flex items-center justify-center bg-[var(--color-accent-dim)] text-theme-accent" aria-hidden="true">
                <Crown className="size-6" />
            </span>
            {path !== failedPath && (
                <img
                    src={getPublicUrl(MEMBERSHIP_PHOTO_BUCKET, path)}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    onError={() => setFailedPath(path)}
                    className="relative size-full object-cover"
                />
            )}
        </span>
    );
}
