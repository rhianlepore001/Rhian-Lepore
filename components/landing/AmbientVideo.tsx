import React, { useEffect, useState } from 'react';

interface AmbientVideoProps {
  sourceName: 'hero' | 'barber' | 'beauty';
  active?: boolean;
  className?: string;
}

const VIDEO_ASSETS = {
  hero: {
    webm: '/landing/videos/loop-hero-720.webm',
    mp4: '/landing/videos/loop-hero-720.mp4',
    poster: '/landing/videos/loop-hero-poster.webp',
  },
  barber: {
    webm: '/landing/videos/loop-barber-720.webm',
    mp4: '/landing/videos/loop-barber-720.mp4',
    poster: '/landing/videos/loop-barber-poster.webp',
  },
  beauty: {
    webm: '/landing/videos/loop-beauty-720.webm',
    mp4: '/landing/videos/loop-beauty-720.mp4',
    poster: '/landing/videos/loop-beauty-poster.webp',
  },
} as const;

export const AmbientVideo: React.FC<AmbientVideoProps> = ({ sourceName, active = true, className = '' }) => {
  const [reducedMotion, setReducedMotion] = useState(false);
  const asset = VIDEO_ASSETS[sourceName];

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setReducedMotion(mediaQuery.matches);
    updatePreference();
    mediaQuery.addEventListener?.('change', updatePreference);
    return () => mediaQuery.removeEventListener?.('change', updatePreference);
  }, []);

  return (
    <video
      className={className}
      autoPlay={active && !reducedMotion}
      muted
      loop
      playsInline
      preload="none"
      poster={asset.poster}
      aria-hidden="true"
      tabIndex={-1}
    >
      <source src={asset.webm} type="video/webm" />
      <source src={asset.mp4} type="video/mp4" />
    </video>
  );
};
