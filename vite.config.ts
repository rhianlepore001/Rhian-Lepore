import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      allowedHosts: true,
    },
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icons/favicon-32x32.png', 'icons/apple-touch-icon.png'],
        workbox: {
          // Só o shell (JS/CSS/HTML) + ícones leves; os PNGs grandes antigos em /public ficam fora do precache.
          globPatterns: ['**/*.{js,css,html}', 'icons/*.png', 'img/logo-*.webp'],
        },
        manifest: {
          name: 'Beauty OS',
          short_name: 'BeautyOS',
          description: 'Sistema de Agendamento e Gestão para Salões de Beleza e Barbearias',
          theme_color: '#1F1B2E',
          icons: [
            {
              src: 'icons/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'icons/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        }
      })
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
