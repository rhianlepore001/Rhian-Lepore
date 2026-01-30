import React from 'react';
import { useAuth } from '../contexts/AuthContext';

export const ThemeBackground: React.FC = () => {
  const { userType } = useAuth();
  const isBeauty = userType === 'beauty';

  if (isBeauty) {
    // BEAUTY THEME BACKGROUND
    return (
      <>
        {/* Background Layer 1: Premium Beauty Pattern */}
        <div
          className="fixed top-0 left-0 w-full h-full pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(135deg, rgba(31, 27, 46, 0.92) 0%, rgba(31, 27, 46, 0.88) 50%, rgba(31, 27, 46, 0.92) 100%),
              url('/beauty-bg.png')
            `,
            backgroundSize: 'cover, 600px 600px',
            backgroundPosition: 'center, center',
            backgroundRepeat: 'no-repeat, repeat',
            backgroundAttachment: 'fixed',
            opacity: 1,
            zIndex: 0,
          }}
        />

        {/* Background Layer 2: Animated Purple Glow Accents */}
        <div
          className="fixed top-0 left-0 w-full h-full pointer-events-none"
          style={{
            background: `
              radial-gradient(circle at 15% 25%, rgba(167, 139, 250, 0.08) 0%, transparent 35%),
              radial-gradient(circle at 85% 75%, rgba(139, 92, 246, 0.06) 0%, transparent 35%),
              radial-gradient(circle at 50% 50%, rgba(167, 139, 250, 0.04) 0%, transparent 50%)
            `,
            zIndex: 0,
            animation: 'pulseBeauty 8s ease-in-out infinite',
          }}
        />

        {/* Background Layer 3: Subtle Sparkle Effect */}
        <div
          className="fixed top-0 left-0 w-full h-full pointer-events-none"
          style={{
            backgroundImage: `url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIj48ZGVmcz48cmFkaWFsR3JhZGllbnQgaWQ9ImEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2E3OGJmYSIgc3RvcC1vcGFjaXR5PSIuMiIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iI2E3OGJmYSIgc3RvcC1vcGFjaXR5PSIwIi8+PC9yYWRpYWxHcmFkaWVudD48L2RlZnM+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iMiIgZmlsbD0idXJsKCNhKSIvPjxjaXJjbGUgY3g9IjE1MCIgY3k9IjEwMCIgcj0iMSIgZmlsbD0idXJsKCNhKSIvPjxjaXJjbGUgY3g9IjI1MCIgY3k9IjE1MCIgcj0iMS41IiBmaWxsPSJ1cmwoI2EpIi8+PGNpcmNsZSBjeD0iMzUwIiBjeT0iMjAwIiByPSIxIiBmaWxsPSJ1cmwoI2EpIi8+PGNpcmNsZSBjeD0iMTAwIiBjeT0iMjUwIiByPSIyIiBmaWxsPSJ1cmwoI2EpIi8+PGNpcmNsZSBjeD0iMzAwIiBjeT0iMzAwIiByPSIxLjUiIGZpbGw9InVybCgjYSkiLz48L3N2Zz4=')`,
            backgroundSize: '400px 400px',
            opacity: 0.3,
            zIndex: 0,
          }}
        />

        {/* Inline keyframes animation for Beauty */}
        <style>{`
          @keyframes pulseBeauty {
            0%, 100% {
              opacity: 0.6;
            }
            50% {
              opacity: 1;
            }
          }
        `}</style>
      </>
    );
  } else {
    // BARBER THEME BACKGROUND
    return (
      <>
        {/* Background Layer 1: Premium Barber Pattern */}
        <div
          className="fixed top-0 left-0 w-full h-full pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(135deg, rgba(18, 18, 18, 0.92) 0%, rgba(18, 18, 18, 0.85) 50%, rgba(18, 18, 18, 0.92) 100%),
              url('/barber-bg.png')
            `,
            backgroundSize: 'cover, 600px 600px',
            backgroundPosition: 'center, center',
            backgroundRepeat: 'no-repeat, repeat',
            backgroundAttachment: 'fixed',
            opacity: 1,
            zIndex: 0,
          }}
        />

        {/* Background Layer 2: Animated Gold Glow Accents */}
        <div
          className="fixed top-0 left-0 w-full h-full pointer-events-none"
          style={{
            background: `
              radial-gradient(circle at 15% 25%, rgba(194, 155, 64, 0.04) 0%, transparent 35%),
              radial-gradient(circle at 85% 75%, rgba(194, 155, 64, 0.03) 0%, transparent 35%),
              radial-gradient(circle at 50% 50%, rgba(194, 155, 64, 0.02) 0%, transparent 50%)
            `,
            zIndex: 0,
            animation: 'pulseGold 8s ease-in-out infinite',
          }}
        />

        {/* Background Layer 3: Subtle Noise Texture */}
        <div
          className="fixed top-0 left-0 w-full h-full pointer-events-none"
          style={{
            backgroundImage: `url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxwYXRoIGQ9Ik0wIDBoMzAwdjMwMEgweiIgZmlsdGVyPSJ1cmwoI2EpIiBvcGFjaXR5PSIuMDUiLz48L3N2Zz4=')`,
            backgroundSize: '300px 300px',
            opacity: 0.4,
            zIndex: 0,
          }}
        />

        {/* Inline keyframes animation for Barber */}
        <style>{`
          @keyframes pulseGold {
            0%, 100% {
              opacity: 0.5;
            }
            50% {
              opacity: 0.9;
            }
          }
        `}</style>
      </>
    );
  }
};

// Manter compatibilidade com nome antigo
export const BrutalBackground = ThemeBackground;
