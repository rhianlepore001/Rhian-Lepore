import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { UserType } from '../contexts/AuthContext';

interface BrandingConfig {
    title: string;
    themeColor: string;
    manifestPath: string;
    faviconPath: string;
    appleTouchIcon: string;
    ogImage: string;
    description: string;
}

const BRANDING_CONFIG: Record<UserType, BrandingConfig> = {
    barber: {
        title: 'AgenX - Gestão Inteligente',
        themeColor: '#121212',
        manifestPath: '/manifest-barber.webmanifest',
        faviconPath: '/icon-agenx.svg',
        appleTouchIcon: '/icon-agenx.svg',
        ogImage: '/icon-agenx.svg',
        description: 'AgenX: O sistema que faz seu negócio crescer. Fluxo automático e gestão inteligente.'
    },
    beauty: {
        title: 'AgenX - Gestão Inteligente',
        themeColor: '#1F1B2E',
        manifestPath: '/manifest-beauty.webmanifest',
        faviconPath: '/icon-agenx.svg',
        appleTouchIcon: '/icon-agenx.svg',
        ogImage: '/icon-agenx.svg',
        description: 'AgenX: O sistema que faz seu negócio crescer. Fluxo automático e gestão inteligente.'
    }
};

/**
 * Hook que gerencia o branding dinâmico da aplicação
 * Atualiza favicon, title, manifest e meta tags baseado no userType
 */
export const useDynamicBranding = () => {
    const { userType, isAuthenticated } = useAuth();

    useEffect(() => {
        // Só aplica branding dinâmico se o usuário estiver autenticado
        if (!isAuthenticated) return;

        const config = BRANDING_CONFIG[userType];

        // Update document title
        document.title = config.title;

        // Update or create theme-color meta tag
        let themeColorMeta = document.querySelector('meta[name="theme-color"]');
        if (!themeColorMeta) {
            themeColorMeta = document.createElement('meta');
            themeColorMeta.setAttribute('name', 'theme-color');
            document.head.appendChild(themeColorMeta);
        }
        themeColorMeta.setAttribute('content', config.themeColor);

        // Update manifest link
        let manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
        if (!manifestLink) {
            manifestLink = document.createElement('link');
            manifestLink.setAttribute('rel', 'manifest');
            document.head.appendChild(manifestLink);
        }
        manifestLink.href = config.manifestPath;

        // Update favicon
        let faviconLink = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
        if (!faviconLink) {
            faviconLink = document.createElement('link');
            faviconLink.setAttribute('rel', 'icon');
            document.head.appendChild(faviconLink);
        }
        faviconLink.href = config.faviconPath;

        // Update apple-touch-icon
        let appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
        if (!appleTouchIcon) {
            appleTouchIcon = document.createElement('link');
            appleTouchIcon.setAttribute('rel', 'apple-touch-icon');
            document.head.appendChild(appleTouchIcon);
        }
        appleTouchIcon.href = config.appleTouchIcon;

        // Update Open Graph meta tags
        const updateMetaTag = (property: string, content: string) => {
            let meta = document.querySelector(`meta[property="${property}"]`);
            if (!meta) {
                meta = document.createElement('meta');
                meta.setAttribute('property', property);
                document.head.appendChild(meta);
            }
            meta.setAttribute('content', content);
        };

        updateMetaTag('og:title', config.title);
        updateMetaTag('og:description', config.description);
        updateMetaTag('og:image', config.ogImage);

        // Update description meta tag
        let descriptionMeta = document.querySelector('meta[name="description"]');
        if (!descriptionMeta) {
            descriptionMeta = document.createElement('meta');
            descriptionMeta.setAttribute('name', 'description');
            document.head.appendChild(descriptionMeta);
        }
        descriptionMeta.setAttribute('content', config.description);

        // Update apple-mobile-web-app-title
        let appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
        if (!appleTitle) {
            appleTitle = document.createElement('meta');
            appleTitle.setAttribute('name', 'apple-mobile-web-app-title');
            document.head.appendChild(appleTitle);
        }
        appleTitle.setAttribute('content', 'AgenX');

    }, [userType, isAuthenticated]);

    return {
        config: BRANDING_CONFIG[userType],
        userType
    };
};
